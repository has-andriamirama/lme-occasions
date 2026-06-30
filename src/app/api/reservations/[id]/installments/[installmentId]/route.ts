// src/app/api/reservations/[id]/installments/[installmentId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { broadcastCarUpdate, broadcastReservationUpdated } from '@/lib/pusher'
import { requireSession, apiError, validationError, createAuditLog, safePusher } from '@/lib/api'
import { computePaymentSummary } from '@/lib/queries'
import { z } from 'zod'

const updateInstallmentSchema = z.object({
	paidAmount: z.number().positive().nullable(),
	paidAt:     z.string().datetime().optional().nullable(),
	notes:      z.string().max(1000).optional().nullable(),
})

export async function PUT(
	req: NextRequest,
	{ params }: { params: { id: string; installmentId: string } }
) {
	try {
		const session = await requireSession()
		if (!session) return apiError('Non autorisé', 401)

		const body   = await req.json()
		const parsed = updateInstallmentSchema.safeParse(body)
		if (!parsed.success) return validationError(parsed.error.flatten())

		const { paidAmount, paidAt, notes } = parsed.data

		const reservation = await prisma.reservation.findUnique({
			where:   { id: params.id },
			include: {
				car:                 { select: { id: true, title: true } },
				paymentInstallments: { orderBy: { installmentNumber: 'asc' } },
			},
		})
		if (!reservation) return apiError('Réservation introuvable', 404)

		if (!['CONFIRMED', 'COMPLETED'].includes(reservation.status)) {
			return apiError(
				"Cette réservation doit d'abord être confirmée par un admin avant de pouvoir enregistrer un paiement de tranche.",
				400
			)
		}

		const targetInstallment = reservation.paymentInstallments.find((i) => i.id === params.installmentId)
		if (!targetInstallment) return apiError('Tranche introuvable', 404)

		const updatedInstallment = await prisma.paymentInstallment.update({
			where: { id: params.installmentId },
			data: {
				paidAmount: paidAmount ?? null,
				paidAt:     paidAmount ? (paidAt ? new Date(paidAt) : new Date()) : null,
				notes:      notes ?? null,
			},
		})

		const freshInstallments = await prisma.paymentInstallment.findMany({
			where: { reservationId: params.id },
		})

		const summary = computePaymentSummary({
			depositAmount: reservation.depositAmount,
			totalPrice:    reservation.totalPrice,
			installments:  freshInstallments,
		})

		let autoCompleted = false

		if (summary.isFullyPaid && reservation.status === 'CONFIRMED') {
			const now = new Date()

			await prisma.$transaction(async (tx) => {
				await tx.reservation.update({ where: { id: params.id }, data: { status: 'COMPLETED', completedAt: now } })
				await tx.car.update({ where: { id: reservation.carId }, data: { status: 'SOLD' } })
			})

			await safePusher(async () => {
				await broadcastCarUpdate({ id: reservation.carId, status: 'SOLD', title: reservation.car.title })
				await broadcastReservationUpdated({
					id:              reservation.id,
					carId:           reservation.carId,
					clientName:      reservation.clientName,
					clientEmail:     reservation.clientEmail,
					clientPhone:     reservation.clientPhone,
					depositAmount:   reservation.depositAmount,
					totalPrice:      reservation.totalPrice,
					installmentType: reservation.installmentType,
					status:          'COMPLETED',
					reservedAt:      reservation.reservedAt,
					expiresAt:       reservation.expiresAt,
					paidAt:          reservation.paidAt,
					confirmedAt:     reservation.confirmedAt,
					completedAt:     now,
					notes:           reservation.notes,
				})
			}, 'PUT /installments/:id')

			autoCompleted = true
		}

		await createAuditLog(session.user.id, 'UPDATE', 'PaymentInstallment', updatedInstallment.id, {
			reservationId:     params.id,
			installmentNumber: targetInstallment.installmentNumber,
			paidAmountBefore:  targetInstallment.paidAmount,
			paidAmountAfter:   paidAmount,
			totalPaid:         summary.totalPaid,
			autoCompleted,
		})

		return NextResponse.json({
			success: true,
			data: {
				installment: updatedInstallment,
				summary: {
					depositAmount: reservation.depositAmount,
					totalPrice:    reservation.totalPrice,
					...summary,
					reservationStatus: autoCompleted ? 'COMPLETED' : reservation.status,
				},
				autoCompleted,
			},
		})
	} catch (err) {
		console.error('[PUT /api/reservations/:id/installments/:installmentId]', err)
		return apiError('Erreur serveur')
	}
}
