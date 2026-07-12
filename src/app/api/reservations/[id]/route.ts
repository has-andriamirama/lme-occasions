// src/app/api/reservations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { broadcastCarUpdated, broadcastReservationUpdated, broadcastReservationCancelled } from '@/lib/pusher'
import { sendReservationConfirmedToClient } from '@/lib/mail'
import {
	recreateBalancePayment,
	calculateUpdatedExpectedAmount,
	isFullyCoveredByDeposit,
	isEditableReservationStatus,
} from '@/lib/balance'
import { requireSession, apiError, validationError, createAuditLog, safePusher } from '@/lib/api'
import { upsertInvoice, deleteInvoice, depositPaymentMethodLabel, type InvoiceContext, type InvoiceType } from '@/lib/invoices'
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

function buildInvoiceContext(
	reservation: {
		id: string
		clientName: string
		clientEmail: string
		clientPhone: string
		totalPrice: number
		depositAmount: number
		paymentIntentId: string | null
	},
	car: { title: string; brand: string; model: string; year: number },
	type: InvoiceType,
): InvoiceContext {
	return {
		reservationId:        reservation.id,
		reservationRef:       reservation.id.slice(-8).toUpperCase(),
		type,
		vehicle:              { title: car.title, brand: car.brand, model: car.model, year: car.year },
		client:               { name: reservation.clientName, email: reservation.clientEmail, phone: reservation.clientPhone },
		totalPrice:           reservation.totalPrice,
		depositAmount:        reservation.depositAmount,
		paymentMethodDeposit: depositPaymentMethodLabel(!!reservation.paymentIntentId),
	}
}

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
			include: {
				car:            { select: { id: true, title: true, brand: true, model: true, year: true } },
				balancePayment: { select: { id: true, paidAmount: true } },
			},
		})
		if (!existing) return apiError('Réservation introuvable', 404)

		if (!isEditableReservationStatus(existing.status, !!existing.balancePayment)) {
			return apiError('Cette réservation est déjà finalisée ou annulée et ne peut plus être modifiée.', 400)
		}

		const data             = parsed.data
		const nextTotalPrice   = data.totalPrice    ?? existing.totalPrice
		const nextDeposit      = data.depositAmount ?? existing.depositAmount
		if (nextDeposit > nextTotalPrice) {
			return apiError("L'acompte ne peut pas dépasser le prix total", 400)
		}

		const wasFullyCoveredByDeposit    = existing.status === 'COMPLETED'
		const willBeFullyCoveredByDeposit = isFullyCoveredByDeposit(nextDeposit, nextTotalPrice)

		const invoiceContentChanged =
			data.clientName !== undefined || data.clientEmail !== undefined || data.clientPhone !== undefined ||
			data.totalPrice !== undefined || data.depositAmount !== undefined

		const now = new Date()

		let statusUpdate: {
			status?:      'CONFIRMED' | 'COMPLETED'
			completedAt?: Date | null
			confirmedAt?: Date | null
		} = {}

		if (!wasFullyCoveredByDeposit && willBeFullyCoveredByDeposit) {
			statusUpdate = { status: 'COMPLETED', completedAt: now, confirmedAt: existing.confirmedAt ?? now }
		} else if (wasFullyCoveredByDeposit && !willBeFullyCoveredByDeposit) {
			statusUpdate = { status: 'CONFIRMED', completedAt: null, confirmedAt: existing.confirmedAt ?? now }
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
					...statusUpdate,
				},
			})

			if (!wasFullyCoveredByDeposit && willBeFullyCoveredByDeposit) {
				await tx.balancePayment.deleteMany({ where: { reservationId: params.id } })
				await tx.car.update({ where: { id: existing.carId }, data: { status: 'SOLD' } })
			} else if (wasFullyCoveredByDeposit && !willBeFullyCoveredByDeposit) {
				await recreateBalancePayment(tx, params.id, nextTotalPrice, nextDeposit)
				await tx.car.update({ where: { id: existing.carId }, data: { status: 'RESERVED' } })
			} else if (data.totalPrice !== undefined || data.depositAmount !== undefined) {
				const newExpected = calculateUpdatedExpectedAmount(
					existing.balancePayment?.paidAmount ?? null,
					nextTotalPrice,
					nextDeposit,
				)
				if (newExpected !== null && existing.balancePayment) {
					await tx.balancePayment.update({
						where: { id: existing.balancePayment.id },
						data:  { expectedAmount: newExpected },
					})
				}
			}

			return reservation
		})

		if (!wasFullyCoveredByDeposit && willBeFullyCoveredByDeposit) {
			await deleteInvoice(params.id, 'DEPOSIT')
			await upsertInvoice(buildInvoiceContext(updated, existing.car, 'TOTAL'))
		} else if (wasFullyCoveredByDeposit && !willBeFullyCoveredByDeposit) {
			await deleteInvoice(params.id, 'TOTAL')
			await upsertInvoice(buildInvoiceContext(updated, existing.car, 'DEPOSIT'))
		} else if (invoiceContentChanged) {
			await upsertInvoice(buildInvoiceContext(updated, existing.car, willBeFullyCoveredByDeposit ? 'TOTAL' : 'DEPOSIT'))
		}

		await createAuditLog(session.user.id, 'UPDATE', 'Reservation', params.id, {
			changes: data,
			fullyCoveredTransition: wasFullyCoveredByDeposit !== willBeFullyCoveredByDeposit
				? (willBeFullyCoveredByDeposit ? 'BECAME_COMPLETED_VIA_DEPOSIT' : 'REVERTED_TO_CONFIRMED')
				: undefined,
		})

		await safePusher(async () => {
			if (wasFullyCoveredByDeposit !== willBeFullyCoveredByDeposit) {
				await broadcastCarUpdated({
					id:     existing.carId,
					status: willBeFullyCoveredByDeposit ? 'SOLD' : 'RESERVED',
					title:  existing.car.title,
				})
			}
			await broadcastReservationUpdated({ ...updated })
		}, 'PUT /api/reservations/:id')

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

		if (action === 'COMPLETE') {
			await upsertInvoice(buildInvoiceContext(reservation, reservation.car, 'TOTAL'))
		}

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
					notes:           notes ?? reservation.notes,
				})
			} else {
				await broadcastCarUpdated({ id: reservation.carId, status: 'AVAILABLE', title: reservation.car.title })
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
			CONFIRM:  'Réservation confirmée — le paiement du reste peut maintenant être enregistré.',
			COMPLETE: 'Vente finalisée manuellement',
			CANCEL:   'Réservation annulée',
		}

		return NextResponse.json({ success: true, message: messages[action] })
	} catch (err) {
		console.error('[PATCH /api/reservations/:id]', err)
		return apiError('Erreur serveur')
	}
}
