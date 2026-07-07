// src/app/api/reservations/[id]/installments/[installmentId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { broadcastCarUpdated, broadcastReservationUpdated } from '@/lib/pusher'
import { requireSession, apiError, validationError, createAuditLog, safePusher } from '@/lib/api'
import { computePaymentSummary } from '@/lib/queries'
import {
	calculateRemainingExpectedAmount,
	getInstallmentPermissions,
	isFinalInstallment,
	computeMaxAllowedForInstallment,
} from '@/lib/installments'
import { issueInstallmentInvoice, voidInstallmentInvoice } from '@/lib/invoice'
import { sendPaymentConfirmationToClient, sendPaymentConfirmationToAdmin } from '@/lib/mail'
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
				car:                 { select: { id: true, title: true, brand: true, model: true, year: true } },
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

		const totalInstallmentsCount = reservation.paymentInstallments.length

		const permissions = getInstallmentPermissions(targetInstallment, reservation.paymentInstallments)

		if (paidAmount !== null) {
			if (!permissions.canEnterOrEdit) {
				return apiError(
					permissions.isPaid
						? 'Cette tranche est verrouillée : seule la dernière tranche réglée peut être modifiée.'
						: "Impossible de saisir cette tranche : la tranche précédente doit d'abord être réglée.",
					400
				)
			}
		} else if (!permissions.canReset) {
			return apiError(
				permissions.isPaid
					? 'Cette tranche est verrouillée : seule la dernière tranche réglée peut être remise à impayée.'
					: "Cette tranche n'est pas réglée : aucun paiement à annuler.",
				400
			)
		}
		
		if (paidAmount !== null) {
			const maxAllowed = computeMaxAllowedForInstallment(
				params.installmentId,
				reservation.paymentInstallments,
				reservation.totalPrice,
				reservation.depositAmount,
			)

			if (isFinalInstallment(targetInstallment, totalInstallmentsCount)) {
				if (Math.round(paidAmount * 100) !== Math.round(maxAllowed * 100)) {
					return apiError(
						"Il s'agit de la dernière tranche : le montant doit obligatoirement correspondre " +
						`au solde restant, soit ${maxAllowed.toFixed(2)} €.`,
						400
					)
				}
			} else if (Math.round(paidAmount * 100) > Math.round(maxAllowed * 100)) {
				return apiError(
					`Le montant saisi (${paidAmount.toFixed(2)} €) ferait dépasser le prix total. ` +
					`Maximum autorisé pour cette tranche : ${maxAllowed.toFixed(2)} €`,
					400
				)
			}
		}
		
		const wasAlreadyPaid  = targetInstallment.paidAmount !== null
		const previousAmount  = targetInstallment.paidAmount

		const installmentsAfterThisUpdate = reservation.paymentInstallments.map((i) =>
			i.id === params.installmentId ? { ...i, paidAmount: paidAmount ?? null } : i
		)
		const newExpectedForRemaining = calculateRemainingExpectedAmount(
			installmentsAfterThisUpdate,
			reservation.totalPrice,
			reservation.depositAmount,
		)

		await prisma.$transaction(async (tx) => {
			await tx.paymentInstallment.update({
				where: { id: params.installmentId },
				data: {
					paidAmount: paidAmount ?? null,
					paidAt:     paidAmount ? (paidAt ? new Date(paidAt) : new Date()) : null,
					notes:      notes ?? null,
				},
			})

			if (newExpectedForRemaining !== null) {
				await tx.paymentInstallment.updateMany({
					where: { reservationId: params.id, paidAmount: null },
					data:  { expectedAmount: newExpectedForRemaining },
				})
			}
		})

		const freshInstallments = await prisma.paymentInstallment.findMany({
			where:   { reservationId: params.id },
			orderBy: { installmentNumber: 'asc' },
		})

		const updatedInstallment = freshInstallments.find((i) => i.id === params.installmentId)!

		const summary = computePaymentSummary({
			depositAmount: reservation.depositAmount,
			totalPrice:    reservation.totalPrice,
			installments:  freshInstallments,
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
			}, 'PUT /installments/:id (auto-complete)')

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
			}, 'PUT /installments/:id (auto-revert)')

			autoReverted = true
		}
		
		await createAuditLog(session.user.id, 'UPDATE', 'PaymentInstallment', updatedInstallment.id, {
			reservationId:     params.id,
			installmentNumber: targetInstallment.installmentNumber,
			paidAmountBefore:  targetInstallment.paidAmount,
			paidAmountAfter:   paidAmount,
			totalPaid:         summary.totalPaid,
			autoCompleted,
			autoReverted,
		})

		const effectiveStatus = autoCompleted
			? 'COMPLETED'
			: autoReverted
				? 'CONFIRMED'
				: reservation.status

		const paymentLabel = totalInstallmentsCount > 1
			? `Tranche ${targetInstallment.installmentNumber} / ${totalInstallmentsCount}`
			: 'Solde'

		try {
			let invoiceUrl: string | null = null

			if (paidAmount !== null) {
				const invoice = await issueInstallmentInvoice({
					reservationId:     params.id,
					installmentId:     params.installmentId,
					installmentNumber: targetInstallment.installmentNumber,
					totalInstallments: totalInstallmentsCount,
					amount:            paidAmount,
					paidAt:            updatedInstallment.paidAt ?? new Date(),
					isModification:    wasAlreadyPaid,
					context: {
						clientName:  reservation.clientName,
						clientEmail: reservation.clientEmail,
						clientPhone: reservation.clientPhone,
						carTitle:    reservation.car.title,
						carBrand:    reservation.car.brand,
						carModel:    reservation.car.model,
						carYear:     reservation.car.year,
						totalPrice:      reservation.totalPrice,
						totalPaidToDate: summary.totalPaid,
					},
				})
				invoiceUrl = invoice?.pdfUrl ?? null
			} else {
				await voidInstallmentInvoice(params.installmentId)
			}

			const paymentEmailPayload = {
				clientName:  reservation.clientName,
				clientEmail: reservation.clientEmail,
				clientPhone: reservation.clientPhone,
				carTitle:    reservation.car.title,
				carBrand:    reservation.car.brand,
				carModel:    reservation.car.model,
				carYear:     reservation.car.year,
				reservationId:  params.id,
				paymentLabel,
				amount:         paidAmount !== null ? paidAmount : (previousAmount ?? 0),
				totalPaid:      summary.totalPaid,
				totalPrice:     reservation.totalPrice,
				invoiceUrl,
				isModification: paidAmount !== null && wasAlreadyPaid,
				isReset:        paidAmount === null,
			}

			await Promise.all([
				sendPaymentConfirmationToClient(paymentEmailPayload),
				sendPaymentConfirmationToAdmin(paymentEmailPayload),
			])
		} catch (invoiceErr) {
			console.error(
				'[PUT /api/reservations/:id/installments/:installmentId] Facture/email de paiement échoués (non-critique) :',
				invoiceErr
			)
		}
		
		return NextResponse.json({
			success: true,
			data: {
				installment:  updatedInstallment,
				installments: freshInstallments,
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
		console.error('[PUT /api/reservations/:id/installments/:installmentId]', err)
		return apiError('Erreur serveur')
	}
}
