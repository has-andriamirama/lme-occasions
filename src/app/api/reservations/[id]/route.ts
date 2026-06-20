// src/app/api/reservations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { broadcastCarStatus } from '@/lib/pusher'
import { z } from 'zod'

const patchSchema = z.object({
	action: z.enum(['COMPLETE', 'CANCEL']),
	notes:  z.string().optional(),
})

// ── Édition complète d'une réservation (infos client, montants, échéance) ────
// Le véhicule lié n'est volontairement pas modifiable ici : changer la voiture
// d'une réservation a des effets de bord (statut du véhicule) qui sortent du
// cadre d'une simple correction ; pour changer de véhicule, on annule puis on
// recrée une réservation.
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

		const existing = await prisma.reservation.findUnique({ where: { id: params.id } })
		if (!existing) return NextResponse.json({ success: false, error: 'Réservation introuvable' }, { status: 404 })

		if (!['PENDING', 'CONFIRMED'].includes(existing.status)) {
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

		const updated = await prisma.reservation.update({
			where: { id: params.id },
			data: {
				...data,
				expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
			},
		})

		await prisma.auditLog.create({
			data: {
				adminId:  session.user.id,
				action:   'UPDATE',
				entity:   'Reservation',
				entityId: params.id,
				details:  { changes: data },
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
			where: { id: params.id },
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
		await broadcastCarStatus(reservation.carId, newCarStatus, reservation.car.title)

		await prisma.auditLog.create({
			data: {
				adminId:  session.user.id,
				action,
				entity:   'Reservation',
				entityId: params.id,
				details:  { carId: reservation.carId, action, notes },
			},
		})

		return NextResponse.json({ success: true, message: action === 'COMPLETE' ? 'Vente finalisée' : 'Réservation annulée' })
	} catch (err) {
		console.error('[PATCH /api/reservations/:id]', err)
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}
