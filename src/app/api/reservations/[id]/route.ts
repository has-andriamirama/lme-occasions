// src/app/api/reservations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { broadcastCarStatus } from '@/lib/pusher'
import { z } from 'zod'
import type { PrismaClient } from '@prisma/client'

type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

const patchSchema = z.object({
	action: z.enum(['COMPLETE', 'CANCEL']),
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

// ── Helper : nombre de tranches ───────────────────────────────────────────────
function getInstallmentCount(type: string): number {
	switch (type) {
		case 'THREE_TIMES': return 3
		case 'FOUR_TIMES':  return 4
		default:            return 1
	}
}

// ── Helper : recréer les tranches dans une transaction ────────────────────────
async function recreateInstallments(
	tx:              TransactionClient,
	reservationId:   string,
	totalPrice:      number,
	depositAmount:   number,
	installmentType: string,
) {
	await tx.paymentInstallment.deleteMany({ where: { reservationId } })

	const count          = getInstallmentCount(installmentType)
	const balance        = totalPrice - depositAmount
	const expectedAmount = Math.round((balance / count) * 100) / 100

	await tx.paymentInstallment.createMany({
		data: Array.from({ length: count }, (_, i) => ({
			reservationId,
			installmentNumber: i + 1,
			expectedAmount,
		})),
	})
}

// ── PUT : édition complète ────────────────────────────────────────────────────
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

		if (!['PENDING', 'CONFIRMED'].includes(existing.status)) {
			return NextResponse.json(
				{ success: false, error: 'Cette réservation est déjà finalisée ou annulée et ne peut plus être modifiée.' },
				{ status: 400 },
			)
		}

		const data = parsed.data

		// ── Vérification montants ─────────────────────────────────────────────
		const nextTotalPrice    = data.totalPrice    ?? existing.totalPrice
		const nextDepositAmount = data.depositAmount ?? existing.depositAmount
		if (nextDepositAmount > nextTotalPrice) {
			return NextResponse.json(
				{ success: false, error: 'L\'acompte ne peut pas dépasser le prix total' },
				{ status: 400 },
			)
		}

		// ── Vérification changement de type de paiement ───────────────────────
		// Si le type d'échéancier change, on supprime et recrée les tranches —
		// SEULEMENT si aucun paiement n'a encore été enregistré.
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

		// ── Mise à jour dans une transaction ──────────────────────────────────
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

			// Si le type d'échéancier a changé, recréer les tranches
			if (typeChanged) {
				await recreateInstallments(
					tx,
					params.id,
					nextTotalPrice,
					nextDepositAmount,
					data.installmentType!,
				)
			} else if (data.totalPrice !== undefined || data.depositAmount !== undefined) {
				// Les montants ont changé sans changement de type :
				// recalculer uniquement l'expectedAmount des tranches encore impayées
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

// ── PATCH : actions rapides (COMPLETE manuel ou CANCEL) ───────────────────────
// COMPLETE est conservé comme passe-droit admin (ex. finalisation hors-système).
// La voie principale reste le suivi automatique via les tranches de paiement.
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

		if (!['CONFIRMED', 'PENDING'].includes(reservation.status)) {
			return NextResponse.json({ success: false, error: 'Réservation déjà traitée' }, { status: 400 })
		}

		const { action, notes } = parsed.data

		await prisma.$transaction(async (tx) => {
			if (action === 'COMPLETE') {
				await tx.reservation.update({
					where: { id: params.id },
					data: {
						status:      'COMPLETED',
						completedAt: new Date(),
						notes:       notes ?? null,
					},
				})
				await tx.car.update({
					where: { id: reservation.carId },
					data:  { status: 'SOLD' },
				})
			} else {
				// CANCEL
				await tx.reservation.update({
					where: { id: params.id },
					data: { status: 'CANCELLED', notes: notes ?? null },
				})
				await tx.car.updateMany({
					where: { id: reservation.carId, status: 'RESERVED' },
					data:  { status: 'AVAILABLE' },
				})
			}
		})

		const newCarStatus = action === 'COMPLETE' ? 'SOLD' : 'AVAILABLE'
		try {
			await broadcastCarStatus(reservation.carId, newCarStatus, reservation.car.title)
		} catch (pusherErr) {
			console.error('[PATCH /api/reservations/:id] Pusher échoué (non-critique) :', pusherErr)
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

		return NextResponse.json({
			success: true,
			message: action === 'COMPLETE' ? 'Vente finalisée manuellement' : 'Réservation annulée',
		})
	} catch (err) {
		console.error('[PATCH /api/reservations/:id]', err)
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}
