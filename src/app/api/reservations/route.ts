// src/app/api/reservations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { broadcastCarStatus, broadcastAdminNotification, EVENTS } from '@/lib/pusher'
import {
	sendReservationConfirmationToClient,
	sendReservationNotificationToAdmin,
} from '@/lib/mail'
import { z } from 'zod'
import type { PrismaClient } from '@prisma/client'

// ── Création manuelle d'une réservation par un admin (client venu en agence) ──
const createReservationSchema = z.object({
	carId:           z.string().cuid(),
	clientName:      z.string().min(2).max(100),
	clientEmail:     z.string().email(),
	clientPhone:     z.string().min(8).max(20),
	totalPrice:      z.number().positive(),
	depositAmount:   z.number().positive(),
	installmentType: z.enum(['FULL', 'THREE_TIMES', 'FOUR_TIMES']).default('FULL'),
	expiresAt:       z.string().datetime(),
	notes:           z.string().max(2000).optional(),
}).refine((d) => d.depositAmount <= d.totalPrice, {
	message: 'L\'acompte ne peut pas dépasser le prix total',
	path:    ['depositAmount'],
})

// ── Helper : nombre de tranches selon le type ────────────────────────────────
function getInstallmentCount(type: string): number {
	switch (type) {
		case 'THREE_TIMES': return 3
		case 'FOUR_TIMES':  return 4
		default:            return 1  // FULL
	}
}

// ── Helper : créer les tranches dans une transaction ─────────────────────────
// Arrondit l'expectedAmount à 2 décimales.
// Toutes les tranches sont créées avec paidAmount = null (impayées).
type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

async function createInstallments(
	tx:              TransactionClient,
	reservationId:   string,
	totalPrice:      number,
	depositAmount:   number,
	installmentType: string,
) {
	const count          = getInstallmentCount(installmentType)
	const balance        = totalPrice - depositAmount
	const expectedAmount = Math.round((balance / count) * 100) / 100

	const installments = Array.from({ length: count }, (_, i) => ({
		reservationId,
		installmentNumber: i + 1,
		expectedAmount,
	}))

	await tx.paymentInstallment.createMany({ data: installments })
}

export async function POST(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

		const body   = await req.json()
		const parsed = createReservationSchema.safeParse(body)
		if (!parsed.success) {
			return NextResponse.json({ success: false, error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
		}

		const {
			carId, clientName, clientEmail, clientPhone,
			totalPrice, depositAmount, installmentType, expiresAt, notes,
		} = parsed.data

		// ── Vérification atomique de disponibilité + création ────────────────
		// Les tranches de paiement sont créées dans la même transaction pour
		// garantir la cohérence : si la création de tranches échoue, la
		// réservation est annulée (rollback automatique).
		let result
		try {
			result = await prisma.$transaction(async (tx) => {
				const car = await tx.car.findUnique({
					where:  { id: carId },
					select: { id: true, title: true, brand: true, model: true, year: true, status: true },
				})

				if (!car)                       throw new Error('CAR_NOT_FOUND')
				if (car.status !== 'AVAILABLE') throw new Error('CAR_NOT_AVAILABLE')

				const reservation = await tx.reservation.create({
					data: {
						carId,
						clientName,
						clientEmail,
						clientPhone,
						totalPrice,
						depositAmount,
						installmentType,
						status:     'CONFIRMED', // acompte déjà réglé en agence
						reservedAt: new Date(),
						expiresAt:  new Date(expiresAt),
						notes:      notes ?? null,
					},
				})

				await tx.car.update({ where: { id: carId }, data: { status: 'RESERVED' } })

				// ── NOUVEAU : créer les tranches dans la même transaction ────
				await createInstallments(tx, reservation.id, totalPrice, depositAmount, installmentType)

				return { car, reservation }
			})
		} catch (txErr: unknown) {
			const msg = txErr instanceof Error ? txErr.message : ''
			if (msg === 'CAR_NOT_FOUND') {
				return NextResponse.json({ success: false, error: 'Véhicule introuvable' }, { status: 404 })
			}
			if (msg === 'CAR_NOT_AVAILABLE') {
				return NextResponse.json(
					{ success: false, error: 'Ce véhicule n\'est plus disponible (déjà réservé ou vendu).' },
					{ status: 409 },
				)
			}
			throw txErr
		}

		const { car, reservation } = result

		await prisma.auditLog.create({
			data: {
				adminId:  session.user.id,
				action:   'CREATE',
				entity:   'Reservation',
				entityId: reservation.id,
				details:  { carId, clientName, depositAmount, totalPrice, installmentType, manual: true },
			},
		})

		// ── Broadcast Pusher (NON-CRITIQUE) ──────────────────────────────────
		try {
			await broadcastCarStatus(carId, 'RESERVED', car.title)
			await broadcastAdminNotification(EVENTS.newReservation, {
				reservationId: reservation.id,
				carTitle:      car.title,
				clientName,
				depositAmount,
			})
		} catch (pusherErr) {
			console.error('[POST /api/reservations] Pusher broadcast échoué (non-critique) :', pusherErr)
		}

		// ── Emails (NON-CRITIQUE) ─────────────────────────────────────────────
		await Promise.all([
			sendReservationConfirmationToClient({
				clientName,
				clientEmail,
				carTitle:      car.title,
				carBrand:      car.brand,
				carModel:      car.model,
				carYear:       car.year,
				depositAmount,
				totalPrice,
				reservationId: reservation.id,
				expiresAt:     reservation.expiresAt,
			}).then(() =>
				prisma.reservation.update({ where: { id: reservation.id }, data: { emailSentToClient: true } })
			),
			sendReservationNotificationToAdmin({
				clientName,
				clientEmail,
				clientPhone,
				carTitle:      car.title,
				depositAmount,
				totalPrice,
				reservationId: reservation.id,
				expiresAt:     reservation.expiresAt,
			}).then(() =>
				prisma.reservation.update({ where: { id: reservation.id }, data: { emailSentToAdmin: true } })
			),
		]).catch((mailErr) =>
			console.error('[POST /api/reservations] Email échoué (non-critique) :', mailErr)
		)

		return NextResponse.json({ success: true, data: reservation }, { status: 201 })
	} catch (err) {
		console.error('[POST /api/reservations]', err)
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}

export async function GET(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

		const page   = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? 1))
		const limit  = Math.min(50, Number(req.nextUrl.searchParams.get('limit') ?? 20))
		const status = req.nextUrl.searchParams.get('status') ?? ''

		const where: Record<string, unknown> = {}
		if (status) where.status = status

		const [reservations, total] = await Promise.all([
			prisma.reservation.findMany({
				where,
				include: {
					car: { select: { id: true, title: true, brand: true, model: true, mainImage: true } },
					paymentInstallments: { select: { paidAmount: true } },
				},
				orderBy: { reservedAt: 'desc' },
				skip:    (page - 1) * limit,
				take:    limit,
			}),
			prisma.reservation.count({ where }),
		])

		return NextResponse.json({
			success: true,
			data: reservations,
			meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
		})
	} catch (err) {
		console.error('[GET /api/reservations]', err)
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}
