// src/app/api/reservations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { broadcastCarUpdate, broadcastReservationUpdated, broadcastReservationCancelled } from '@/lib/pusher'
import { sendReservationConfirmedToClient } from '@/lib/mail'
import { getInstallmentCount, recreateInstallments } from '@/lib/installments'
import { requireSession, apiError, validationError, createAuditLog, safePusher } from '@/lib/api'
import { z } from 'zod'

const patchSchema = z.object({
	action: z.enum(['CONFIRM', 'COMPLETE', 'CANCEL']),
	notes:  z.string().optional(),
})

const updateReservationSchema = z.object({
	clientName:      z.string().min(2).max(100).optional(),
	clientEmail:     z.string().email().optional(),
	clientPhone:     z.string().min(8).max(20).optional(),
	totalPrice:      z.number().positive().optional(),
	depositAmount:   z.number().positive().optional(),
	installmentType: z.enum(['FULL', 'THREE_TIMES', 'FOUR_TIMES']).optional(),
	expiresAt:       z.string().datetime().optional(),
	notes:           z.string().max(2000).optional().nullable(),
}).strict()

export async function PUT(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await requireSession()
		if (!session) return apiError('Non autorisé', 401)

		const body   = await req.json()
		const parsed = updateReservationSchema.safeParse(body)
		if (!parsed.success) return validationError(parsed.error.flatten())

		const existing = await prisma.reservation.findUnique({
			where:   { id: params.id },
			include: { paymentInstallments: { select: { paidAmount: true } } },
		})
		if (!existing) return apiError('Réservation introuvable', 404)

		if (!['PENDING', 'PAID', 'CONFIRMED'].includes(existing.status)) {
			return apiError('Cette réservation est déjà finalisée ou annulée et ne peut plus être modifiée.', 400)
		}

		const data             = parsed.data
		const nextTotalPrice   = data.totalPrice    ?? existing.totalPrice
		const nextDeposit      = data.depositAmount ?? existing.depositAmount
		if (nextDeposit > nextTotalPrice) {
			return apiError("L'acompte ne peut pas dépasser le prix total", 400)
		}

		const typeChanged   = data.installmentType !== undefined && data.installmentType !== existing.installmentType
		const hasAnyPayment = existing.paymentInstallments.some((i) => i.paidAmount !== null)

		if (typeChanged && hasAnyPayment) {
			return apiError(
				"Impossible de modifier le type d'échéancier : au moins un paiement a déjà été enregistré. Contactez un super-admin si une correction est nécessaire.",
				400
			)
		}

		const updated = await prisma.$transaction(async (tx) => {
			const reservation = await tx.reservation.update({
				where: { id: params.id },
				data: {
					clientName:      data.clientName,
					clientEmail:     data.clientEmail,
					clientPhone:     data.clientPhone,
					totalPrice:      data.totalPrice,
					depositAmount:   data.depositAmount,
					installmentType: data.installmentType,
					expiresAt:       data.expiresAt ? new Date(data.expiresAt) : undefined,
					notes:           data.notes,
				},
			})

			if (typeChanged) {
				await recreateInstallments(tx, params.id, nextTotalPrice, nextDeposit, data.installmentType!)
			} else if (data.totalPrice !== undefined || data.depositAmount !== undefined) {
				const count       = getInstallmentCount(existing.installmentType ?? 'FULL')
				const balance     = nextTotalPrice - nextDeposit
				const newExpected = Math.round((balance / count) * 100) / 100
				await tx.paymentInstallment.updateMany({
					where: { reservationId: params.id, paidAmount: null },
					data:  { expectedAmount: newExpected },
				})
			}

			return reservation
		})

		await createAuditLog(session.user.id, 'UPDATE', 'Reservation', params.id, { changes: data, typeChanged })

		await safePusher(
			() => broadcastReservationUpdated({ ...updated }),
			'PUT /api/reservations/:id'
		)

		return NextResponse.json({ success: true, data: updated, message: 'Réservation mise à jour' })
	} catch (err) {
		console.error('[PUT /api/reservations/:id]', err)
		return apiError('Erreur serveur')
	}
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await requireSession()
		if (!session) return apiError('Non autorisé', 401)

		const body   = await req.json()
		const parsed = patchSchema.safeParse(body)
		if (!parsed.success) return apiError('Données invalides', 400)

		const reservation = await prisma.reservation.findUnique({
			where:   { id: params.id },
			include: { car: true },
		})
		if (!reservation) return apiError('Réservation introuvable', 404)

		const { action, notes } = parsed.data

		if (action === 'CONFIRM' && reservation.status !== 'PAID') {
			return apiError("Seule une réservation au statut « Payée » peut être confirmée.", 400)
		}
		if (action === 'COMPLETE' && reservation.status !== 'CONFIRMED') {
			return apiError("La réservation doit d'abord être confirmée avant de pouvoir être finalisée.", 400)
		}
		if (action === 'CANCEL' && !['PENDING', 'PAID', 'CONFIRMED'].includes(reservation.status)) {
			return apiError('Réservation déjà traitée', 400)
		}

		const now = new Date()

		await prisma.$transaction(async (tx) => {
			if (action === 'CONFIRM') {
				await tx.reservation.update({
					where: { id: params.id },
					data:  { status: 'CONFIRMED', confirmedAt: now, notes: notes ?? reservation.notes },
				})
			} else if (action === 'COMPLETE') {
				await tx.reservation.update({
					where: { id: params.id },
					data:  { status: 'COMPLETED', completedAt: now, notes: notes ?? reservation.notes },
				})
				await tx.car.update({ where: { id: reservation.carId }, data: { status: 'SOLD' } })
			} else {
				await tx.reservation.update({
					where: { id: params.id },
					data:  { status: 'CANCELLED', notes: notes ?? reservation.notes },
				})
				await tx.car.updateMany({
					where: { id: reservation.carId, status: 'RESERVED' },
					data:  { status: 'AVAILABLE' },
				})
			}
		})

		await safePusher(async () => {
			if (action === 'CONFIRM') {
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
					confirmedAt:     now,
					notes:           notes ?? reservation.notes,
				})
			} else if (action === 'COMPLETE') {
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
					notes:           notes ?? reservation.notes,
				})
			} else {
				await broadcastCarUpdate({ id: reservation.carId, status: 'AVAILABLE', title: reservation.car.title })
				await broadcastReservationCancelled(reservation.id, reservation.carId)
			}
		}, 'PATCH /api/reservations/:id')

		if (action === 'CONFIRM') {
			sendReservationConfirmedToClient({
				clientName:      reservation.clientName,
				clientEmail:     reservation.clientEmail,
				carTitle:        reservation.car.title,
				carBrand:        reservation.car.brand,
				carModel:        reservation.car.model,
				carYear:         reservation.car.year,
				depositAmount:   reservation.depositAmount,
				totalPrice:      reservation.totalPrice,
				reservationId:   reservation.id,
				installmentType: reservation.installmentType,
			}).catch((mailErr) =>
				console.error('[PATCH /api/reservations/:id] Email de confirmation échoué (non-critique) :', mailErr)
			)
		}

		await createAuditLog(session.user.id, action, 'Reservation', params.id, {
			carId: reservation.carId, action, notes, manualOverride: action === 'COMPLETE',
		})

		const messages: Record<string, string> = {
			CONFIRM:  'Réservation confirmée — les paiements de tranche peuvent maintenant être enregistrés.',
			COMPLETE: 'Vente finalisée manuellement',
			CANCEL:   'Réservation annulée',
		}

		return NextResponse.json({ success: true, message: messages[action] })
	} catch (err) {
		console.error('[PATCH /api/reservations/:id]', err)
		return apiError('Erreur serveur')
	}
}
