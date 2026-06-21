// src/app/api/reservations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { broadcastCarUpdate } from '@/lib/pusher'
import { sendReservationConfirmedToClient } from '@/lib/mail'
import { getInstallmentCount, recreateInstallments } from '@/lib/installments'
import { z } from 'zod'

const patchSchema = z.object({
	action: z.enum(['CONFIRM', 'COMPLETE', 'CANCEL']),
	notes: z.string().optional(),
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
		const session = await getServerSession(authOptions)
		if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

		const body   = await req.json()
		const parsed = updateReservationSchema.safeParse(body)
		if (!parsed.success) {
			return NextResponse.json({ success: false, error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
		}

		const existing = await prisma.reservation.findUnique({
			where:   { id: params.id },
			include: { paymentInstallments: { select: { paidAmount: true } } },
		})
		if (!existing) return NextResponse.json({ success: false, error: 'Réservation introuvable' }, { status: 404 })

		if (!['PENDING', 'PAID', 'CONFIRMED'].includes(existing.status)) {
			return NextResponse.json(
				{ success: false, error: 'Cette réservation est déjà finalisée ou annulée et ne peut plus être modifiée.' },
				{ status: 400 },
			)
		}

		const data = parsed.data

		const nextTotalPrice    = data.totalPrice    ?? existing.totalPrice
		const nextDepositAmount = data.depositAmount ?? existing.depositAmount
		if (nextDepositAmount > nextTotalPrice) {
			return NextResponse.json(
				{ success: false, error: 'L\'acompte ne peut pas dépasser le prix total' },
				{ status: 400 },
			)
		}

		const typeChanged  = data.installmentType !== undefined && data.installmentType !== existing.installmentType
		const hasAnyPayment = existing.paymentInstallments.some((i) => i.paidAmount !== null)

		if (typeChanged && hasAnyPayment) {
			return NextResponse.json(
				{
					success: false,
					error:   'Impossible de modifier le type d\'échéancier : au moins un paiement a déjà été enregistré. Contactez un super-admin si une correction est nécessaire.',
				},
				{ status: 400 },
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
				await recreateInstallments(
					tx,
					params.id,
					nextTotalPrice,
					nextDepositAmount,
					data.installmentType!,
				)
			} else if (data.totalPrice !== undefined || data.depositAmount !== undefined) {
				const newInstallmentType = existing.installmentType ?? 'FULL'
				const count              = getInstallmentCount(newInstallmentType)
				const balance            = nextTotalPrice - nextDepositAmount
				const newExpected        = Math.round((balance / count) * 100) / 100

				await tx.paymentInstallment.updateMany({
					where: { reservationId: params.id, paidAmount: null },
					data:  { expectedAmount: newExpected },
				})
			}

			return reservation
		})

		await prisma.auditLog.create({
			data: {
				adminId:  session.user.id,
				action:   'UPDATE',
				entity:   'Reservation',
				entityId: params.id,
				details:  { changes: data, typeChanged },
			},
		})

		return NextResponse.json({ success: true, data: updated, message: 'Réservation mise à jour' })
	} catch (err) {
		console.error('[PUT /api/reservations/:id]', err)
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

		const body   = await req.json()
		const parsed = patchSchema.safeParse(body)
		if (!parsed.success) return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 })

		const reservation = await prisma.reservation.findUnique({
			where:   { id: params.id },
			include: { car: true },
		})
		if (!reservation) return NextResponse.json({ success: false, error: 'Réservation introuvable' }, { status: 404 })

		const { action, notes } = parsed.data

		if (action === 'CONFIRM' && reservation.status !== 'PAID') {
			return NextResponse.json(
				{ success: false, error: 'Seule une réservation au statut « Payée » (acompte encaissé, en attente de présentation en agence) peut être confirmée.' },
				{ status: 400 },
			)
		}
		if (action === 'COMPLETE' && reservation.status !== 'CONFIRMED') {
			return NextResponse.json(
				{ success: false, error: 'La réservation doit d\'abord être confirmée (présentation en agence) avant de pouvoir être finalisée.' },
				{ status: 400 },
			)
		}
		if (action === 'CANCEL' && !['PENDING', 'PAID', 'CONFIRMED'].includes(reservation.status)) {
			return NextResponse.json({ success: false, error: 'Réservation déjà traitée' }, { status: 400 })
		}

		await prisma.$transaction(async (tx) => {
			if (action === 'CONFIRM') {
				await tx.reservation.update({
					where: { id: params.id },
					data: {
						status:      'CONFIRMED',
						confirmedAt: new Date(),
						notes:       notes ?? reservation.notes,
					},
				})
			} else if (action === 'COMPLETE') {
				await tx.reservation.update({
					where: { id: params.id },
					data: {
						status:      'COMPLETED',
						completedAt: new Date(),
						notes:       notes ?? reservation.notes,
					},
				})
				await tx.car.update({
					where: { id: reservation.carId },
					data:  { status: 'SOLD' },
				})
			} else {
				await tx.reservation.update({
					where: { id: params.id },
					data: { status: 'CANCELLED', notes: notes ?? reservation.notes },
				})
				await tx.car.updateMany({
					where: { id: reservation.carId, status: 'RESERVED' },
					data:  { status: 'AVAILABLE' },
				})
			}
		})

		if (action !== 'CONFIRM') {
			const newCarStatus = action === 'COMPLETE' ? 'SOLD' : 'AVAILABLE'
			try {
				await broadcastCarUpdate({ id: reservation.carId, status: newCarStatus, title: reservation.car.title })
			} catch (pusherErr) {
				console.error('[PATCH /api/reservations/:id] Pusher échoué (non-critique) :', pusherErr)
			}
		}

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

		await prisma.auditLog.create({
			data: {
				adminId:  session.user.id,
				action,
				entity:   'Reservation',
				entityId: params.id,
				details:  { carId: reservation.carId, action, notes, manualOverride: action === 'COMPLETE' },
			},
		})

		const messages: Record<string, string> = {
			CONFIRM:  'Réservation confirmée — les paiements de tranche peuvent maintenant être enregistrés.',
			COMPLETE: 'Vente finalisée manuellement',
			CANCEL:   'Réservation annulée',
		}

		return NextResponse.json({ success: true, message: messages[action] })
	} catch (err) {
		console.error('[PATCH /api/reservations/:id]', err)
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}
