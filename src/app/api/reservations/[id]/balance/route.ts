// src/app/api/reservations/[id]/balance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { broadcastCarUpdated, broadcastReservationUpdated } from '@/lib/pusher'
import { requireSession, apiError, validationError, createAuditLog, safePusher } from '@/lib/api'
import { computePaymentSummary } from '@/lib/queries'
import { computeBalanceExpectedAmount } from '@/lib/balance'
import { z } from 'zod'

export async function GET(
	_req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await requireSession()
		if (!session) return apiError('Non autorisé', 401)

		const reservation = await prisma.reservation.findUnique({
			where:  { id: params.id },
			select: {
				depositAmount:   true,
				totalPrice:      true,
				status:          true,
				installmentType: true,
				balancePayment:  true,
			},
		})
		if (!reservation) return apiError('Réservation introuvable', 404)

		const summary = computePaymentSummary({
			depositAmount:  reservation.depositAmount,
			totalPrice:     reservation.totalPrice,
			balancePayment: reservation.balancePayment,
		})

		return NextResponse.json({
			success: true,
			data: {
				balancePayment: reservation.balancePayment,
				summary: {
					depositAmount: reservation.depositAmount,
					totalPrice:    reservation.totalPrice,
					...summary,
				},
			},
		})
	} catch (err) {
		console.error('[GET /api/reservations/:id/balance]', err)
		return apiError('Erreur serveur')
	}
}

const updateBalancePaymentSchema = z.object({
	paidAmount: z.number().positive().nullable(),
	paidAt:     z.string().datetime().optional().nullable(),
	notes:      z.string().max(1000).optional().nullable(),
})

export async function PUT(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await requireSession()
		if (!session) return apiError('Non autorisé', 401)

		const body   = await req.json()
		const parsed = updateBalancePaymentSchema.safeParse(body)
		if (!parsed.success) return validationError(parsed.error.flatten())

		const { paidAmount, paidAt, notes } = parsed.data

		const reservation = await prisma.reservation.findUnique({
			where:   { id: params.id },
			include: {
				car:            { select: { id: true, title: true } },
				balancePayment: true,
			},
		})
		if (!reservation) return apiError('Réservation introuvable', 404)

		if (!['CONFIRMED', 'COMPLETED'].includes(reservation.status)) {
			return apiError(
				"Cette réservation doit d'abord être confirmée par un admin avant de pouvoir enregistrer le paiement du reste.",
				400
			)
		}

		if (!reservation.balancePayment) {
			return apiError("Aucun solde à payer pour cette réservation.", 404)
		}

		if (paidAmount === null && reservation.balancePayment.paidAmount === null) {
			return apiError("Ce solde n'est pas réglé : aucun paiement à annuler.", 400)
		}

		if (paidAmount !== null) {
			const expectedAmount = computeBalanceExpectedAmount(reservation.totalPrice, reservation.depositAmount)

			if (Math.round(paidAmount * 100) !== Math.round(expectedAmount * 100)) {
				return apiError(
					"Le montant doit obligatoirement correspondre au solde restant, soit " +
					`${expectedAmount.toFixed(2)} €.`,
					400
				)
			}
		}

		await prisma.balancePayment.update({
			where: { id: reservation.balancePayment.id },
			data: {
				paidAmount: paidAmount ?? null,
				paidAt:     paidAmount ? (paidAt ? new Date(paidAt) : new Date()) : null,
				notes:      notes ?? null,
			},
		})

		const updatedBalance = await prisma.balancePayment.findUniqueOrThrow({
			where: { id: reservation.balancePayment.id },
		})

		const summary = computePaymentSummary({
			depositAmount:  reservation.depositAmount,
			totalPrice:     reservation.totalPrice,
			balancePayment: updatedBalance,
		})

		let autoCompleted = false
		let autoReverted  = false

		if (summary.isFullyPaid && reservation.status === 'CONFIRMED') {
			const now = new Date()

			await prisma.$transaction(async (tx) => {
				await tx.reservation.update({
					where: { id: params.id },
					data:  { status: 'COMPLETED', completedAt: now },
				})
				await tx.car.update({
					where: { id: reservation.carId },
					data:  { status: 'SOLD' },
				})
			})

			await safePusher(async () => {
				await broadcastCarUpdated({ id: reservation.carId, status: 'SOLD', title: reservation.car.title })
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
			}, 'PUT /balance (auto-complete)')

			autoCompleted = true
		}

		if (!summary.isFullyPaid && reservation.status === 'COMPLETED') {
			await prisma.$transaction(async (tx) => {
				await tx.reservation.update({
					where: { id: params.id },
					data:  { status: 'CONFIRMED', completedAt: null },
				})
				await tx.car.update({
					where: { id: reservation.carId },
					data:  { status: 'RESERVED' },
				})
			})

			await safePusher(async () => {
				await broadcastCarUpdated({ id: reservation.carId, status: 'RESERVED', title: reservation.car.title })
				await broadcastReservationUpdated({
					id:              reservation.id,
					carId:           reservation.carId,
					clientName:      reservation.clientName,
					clientEmail:     reservation.clientEmail,
					clientPhone:     reservation.clientPhone,
					depositAmount:   reservation.depositAmount,
					totalPrice:      reservation.totalPrice,
					installmentType: reservation.installmentType,
					status:          'CONFIRMED',
					reservedAt:      reservation.reservedAt,
					expiresAt:       reservation.expiresAt,
					paidAt:          reservation.paidAt,
					confirmedAt:     reservation.confirmedAt,
					completedAt:     null,
					notes:           reservation.notes,
				})
			}, 'PUT /balance (auto-revert)')

			autoReverted = true
		}

		await createAuditLog(session.user.id, 'UPDATE', 'BalancePayment', updatedBalance.id, {
			reservationId:    params.id,
			paidAmountBefore: reservation.balancePayment.paidAmount,
			paidAmountAfter:  paidAmount,
			totalPaid:        summary.totalPaid,
			autoCompleted,
			autoReverted,
		})

		const effectiveStatus = autoCompleted
			? 'COMPLETED'
			: autoReverted
				? 'CONFIRMED'
				: reservation.status

		return NextResponse.json({
			success: true,
			data: {
				balancePayment: updatedBalance,
				summary: {
					depositAmount:     reservation.depositAmount,
					totalPrice:        reservation.totalPrice,
					...summary,
					reservationStatus: effectiveStatus,
				},
				autoCompleted,
				autoReverted,
			},
		})
	} catch (err) {
		console.error('[PUT /api/reservations/:id/balance]', err)
		return apiError('Erreur serveur')
	}
}
