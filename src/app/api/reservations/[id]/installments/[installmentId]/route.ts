// src/app/api/reservations/[id]/installments/[installmentId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { broadcastCarStatus } from '@/lib/pusher'
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
		const session = await getServerSession(authOptions)
		if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

		const body   = await req.json()
		const parsed = updateInstallmentSchema.safeParse(body)
		if (!parsed.success) {
			return NextResponse.json({ success: false, error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
		}

		const { paidAmount, paidAt, notes } = parsed.data

		const reservation = await prisma.reservation.findUnique({
			where:   { id: params.id },
			include: {
				car:                 { select: { id: true, title: true } },
				paymentInstallments: { orderBy: { installmentNumber: 'asc' } },
			},
		})

		if (!reservation) {
			return NextResponse.json({ success: false, error: 'Réservation introuvable' }, { status: 404 })
		}

		if (!['CONFIRMED', 'COMPLETED'].includes(reservation.status)) {
			return NextResponse.json(
				{
					success: false,
					error:   'Cette réservation doit d\'abord être confirmée par un admin (présentation en agence) avant de pouvoir enregistrer un paiement de tranche.',
				},
				{ status: 400 },
			)
		}

		const targetInstallment = reservation.paymentInstallments.find(
			(i) => i.id === params.installmentId,
		)
		if (!targetInstallment) {
			return NextResponse.json({ success: false, error: 'Tranche introuvable' }, { status: 404 })
		}

		const updatedInstallment = await prisma.paymentInstallment.update({
			where: { id: params.installmentId },
			data:  {
				paidAmount: paidAmount ?? null,
				paidAt:     paidAmount
					? (paidAt ? new Date(paidAt) : new Date())
					: null,
				notes:      notes ?? null,
			},
		})

		const freshInstallments = await prisma.paymentInstallment.findMany({
			where: { reservationId: params.id },
		})

		const totalFromInstallments = freshInstallments.reduce(
			(sum, i) => sum + (i.paidAmount ?? 0),
			0,
		)
		const totalPaid   = reservation.depositAmount + totalFromInstallments
		const remaining   = Math.max(0, reservation.totalPrice - totalPaid)
		const isFullyPaid = totalPaid >= reservation.totalPrice

		let autoCompleted = false

		if (isFullyPaid && reservation.status === 'CONFIRMED') {
			await prisma.$transaction(async (tx) => {
				await tx.reservation.update({
					where: { id: params.id },
					data:  { status: 'COMPLETED', completedAt: new Date() },
				})
				await tx.car.update({
					where: { id: reservation.carId },
					data:  { status: 'SOLD' },
				})
			})

			try {
				await broadcastCarStatus(reservation.carId, 'SOLD', reservation.car.title)
			} catch (pusherErr) {
				console.error('[PUT /installments/:id] Pusher broadcast échoué (non-critique) :', pusherErr)
			}

			autoCompleted = true
		}

		// ── Audit log ─────────────────────────────────────────────────────────
		await prisma.auditLog.create({
			data: {
				adminId: session.user.id,
				action: 'UPDATE',
				entity: 'PaymentInstallment',
				entityId: updatedInstallment.id,
				details:  {
					reservationId: params.id,
					installmentNumber: targetInstallment.installmentNumber,
					paidAmountBefore: targetInstallment.paidAmount,
					paidAmountAfter: paidAmount,
					totalPaid,
					autoCompleted,
				},
			},
		})

		const paidCount  = freshInstallments.filter((i) => i.paidAmount !== null).length
		const totalCount = freshInstallments.length

		return NextResponse.json({
			success: true,
			data: {
				installment: updatedInstallment,
				summary: {
					depositAmount: reservation.depositAmount,
					totalPrice: reservation.totalPrice,
					totalPaid,
					remaining,
					isFullyPaid,
					paidCount,
					totalCount,
					progressPercent: Math.min(100, Math.round((totalPaid / reservation.totalPrice) * 100)),
					reservationStatus: autoCompleted ? 'COMPLETED' : reservation.status,
				},
				autoCompleted,
			},
		})
	} catch (err) {
		console.error('[PUT /api/reservations/:id/installments/:installmentId]', err)
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}
