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

// ── Création manuelle d'une réservation par un admin (client venu en agence) ──
// Même principe que /api/payments/create-checkout, mais sans passer par Stripe :
// l'acompte a déjà été réglé physiquement (espèces / CB en agence), donc la
// réservation est créée directement au statut CONFIRMED et la voiture passe
// immédiatement en RESERVED. Les emails de confirmation (client + admin) sont
// envoyés exactement comme pour une réservation en ligne.
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
		// Même garde-fou que la réservation publique : on relit le statut du
		// véhicule À L'INTÉRIEUR de la transaction pour éviter qu'un admin ne
		// réserve par erreur une voiture déjà prise par un client en ligne.
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

				return { car, reservation }
			})
		} catch (txErr: any) {
			if (txErr.message === 'CAR_NOT_FOUND') {
				return NextResponse.json({ success: false, error: 'Véhicule introuvable' }, { status: 404 })
			}
			if (txErr.message === 'CAR_NOT_AVAILABLE') {
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
				details:  { carId, clientName, depositAmount, totalPrice, manual: true },
			},
		})

		// ── Broadcast Pusher (NON-CRITIQUE : n'empêche pas la réussite de la création) ──
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

		// ── Emails (NON-CRITIQUE) — même principe que le webhook Stripe ──────
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
				include: { car: { select: { id: true, title: true, brand: true, model: true, mainImage: true } } },
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
