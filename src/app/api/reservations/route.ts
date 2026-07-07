// src/app/api/reservations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { broadcastCarUpdated, broadcastReservationCreated } from '@/lib/pusher'
import {
	sendReservationConfirmedToClient,
	sendReservationNotificationToAdmin,
	sendPaymentConfirmationToClient,
	sendPaymentConfirmationToAdmin,
} from '@/lib/mail'
import { createInstallments, isFullyCoveredByDeposit } from '@/lib/installments'
import { issueDepositInvoice } from '@/lib/invoice'
import { requireSession, apiError, validationError, parsePagination, createAuditLog, safePusher } from '@/lib/api'
import { z } from 'zod'

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
	message: "L'acompte ne peut pas dépasser le prix total",
	path:    ['depositAmount'],
})

export async function POST(req: NextRequest) {
	try {
		const session = await requireSession()
		if (!session) return apiError('Non autorisé', 401)

		const body   = await req.json()
		const parsed = createReservationSchema.safeParse(body)
		if (!parsed.success) return validationError(parsed.error.flatten())

		const { carId, clientName, clientEmail, clientPhone,
			totalPrice, depositAmount, installmentType, expiresAt, notes } = parsed.data

		const fullyCoveredByDeposit = isFullyCoveredByDeposit(depositAmount, totalPrice)

		let result
		try {
			result = await prisma.$transaction(async (tx) => {
				const car = await tx.car.findUnique({
					where:  { id: carId },
					select: { id: true, title: true, brand: true, model: true, year: true, status: true, mainImage: true },
				})
				if (!car)                       throw new Error('CAR_NOT_FOUND')
				if (car.status !== 'AVAILABLE') throw new Error('CAR_NOT_AVAILABLE')

				const now = new Date()

				const reservation = await tx.reservation.create({
					data: {
						carId, clientName, clientEmail, clientPhone,
						totalPrice, depositAmount, installmentType,
						status:      fullyCoveredByDeposit ? 'COMPLETED' : 'CONFIRMED',
						reservedAt:  now,
						confirmedAt: now,
						completedAt: fullyCoveredByDeposit ? now : null,
						expiresAt:   new Date(expiresAt), notes: notes ?? null,
					},
				})

				await tx.car.update({
					where: { id: carId },
					data:  { status: fullyCoveredByDeposit ? 'SOLD' : 'RESERVED' },
				})

				if (!fullyCoveredByDeposit) {
					await createInstallments(tx, reservation.id, totalPrice, depositAmount, installmentType)
				}

				return { car, reservation }
			})
		} catch (txErr: unknown) {
			const msg = txErr instanceof Error ? txErr.message : ''
			if (msg === 'CAR_NOT_FOUND')     return apiError('Véhicule introuvable', 404)
			if (msg === 'CAR_NOT_AVAILABLE') {
				return apiError("Ce véhicule n'est plus disponible (déjà réservé ou vendu).", 409)
			}
			throw txErr
		}

		const { car, reservation } = result

		await createAuditLog(session.user.id, 'CREATE', 'Reservation', reservation.id, {
			carId, clientName, depositAmount, totalPrice, installmentType, manual: true,
			fullyCoveredByDeposit,
		})

		await safePusher(async () => {
			await broadcastCarUpdated({
				id:    carId,
				status: fullyCoveredByDeposit ? 'SOLD' : 'RESERVED',
				title: car.title,
			})
			await broadcastReservationCreated({
				id:              reservation.id,
				carId,
				car:             { id: car.id, title: car.title, brand: car.brand, model: car.model, mainImage: car.mainImage },
				clientName,
				clientEmail,
				clientPhone,
				depositAmount,
				totalPrice,
				installmentType,
				status:          reservation.status,
				reservedAt:      reservation.reservedAt,
				expiresAt:       reservation.expiresAt,
				confirmedAt:     reservation.confirmedAt,
				completedAt:     reservation.completedAt,
				notes:           reservation.notes,
			})
		}, 'POST /api/reservations')

		await Promise.all([
			sendReservationConfirmedToClient({
				clientName, clientEmail,
				carTitle: car.title, carBrand: car.brand, carModel: car.model, carYear: car.year,
				depositAmount, totalPrice, reservationId: reservation.id, installmentType,
			}).then(() =>
				prisma.reservation.update({ where: { id: reservation.id }, data: { emailSentToClient: true } })
			),
			sendReservationNotificationToAdmin({
				clientName, clientEmail, clientPhone,
				carTitle: car.title, depositAmount, totalPrice,
				reservationId: reservation.id, expiresAt: reservation.expiresAt,
			}).then(() =>
				prisma.reservation.update({ where: { id: reservation.id }, data: { emailSentToAdmin: true } })
			),
		]).catch((mailErr) =>
			console.error('[POST /api/reservations] Email échoué (non-critique) :', mailErr)
		)

		try {
			const invoice = await issueDepositInvoice({
				reservationId:  reservation.id,
				amount:         depositAmount,
				paidAt:         reservation.reservedAt,
				isModification: false,
				context: {
					clientName, clientEmail, clientPhone,
					carTitle: car.title, carBrand: car.brand, carModel: car.model, carYear: car.year,
					totalPrice, totalPaidToDate: depositAmount,
				},
			})

			const paymentEmailPayload = {
				clientName, clientEmail, clientPhone,
				carTitle: car.title, carBrand: car.brand, carModel: car.model, carYear: car.year,
				reservationId:  reservation.id,
				paymentLabel:   'Acompte à la réservation',
				amount:         depositAmount,
				totalPaid:      depositAmount,
				totalPrice,
				invoiceUrl:     invoice?.pdfUrl ?? null,
				isModification: false,
				isReset:        false,
			}

			await Promise.all([
				sendPaymentConfirmationToClient(paymentEmailPayload),
				sendPaymentConfirmationToAdmin(paymentEmailPayload),
			])
		} catch (invoiceErr) {
			console.error('[POST /api/reservations] Facture/email de paiement échoués (non-critique) :', invoiceErr)
		}

		return NextResponse.json({ success: true, data: reservation }, { status: 201 })
	} catch (err) {
		console.error('[POST /api/reservations]', err)
		return apiError('Erreur serveur')
	}
}

export async function GET(req: NextRequest) {
	try {
		const session = await requireSession()
		if (!session) return apiError('Non autorisé', 401)

		const { searchParams } = req.nextUrl
		const { page, limit, skip } = parsePagination(searchParams, { defaultLimit: 20, maxLimit: 50 })
		const status = searchParams.get('status') ?? ''

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
				skip,
				take: limit,
			}),
			prisma.reservation.count({ where }),
		])

		return NextResponse.json({
			success: true,
			data:    reservations,
			meta:    { total, page, limit, totalPages: Math.ceil(total / limit) },
		})
	} catch (err) {
		console.error('[GET /api/reservations]', err)
		return apiError('Erreur serveur')
	}
}
