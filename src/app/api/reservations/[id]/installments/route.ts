// src/app/api/reservations/[id]/installments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(
	_req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

		const reservation = await prisma.reservation.findUnique({
			where:   { id: params.id },
			select: {
				depositAmount:       true,
				totalPrice:          true,
				status:              true,
				installmentType:     true,
				paymentInstallments: {
					orderBy: { installmentNumber: 'asc' },
				},
			},
		})

		if (!reservation) {
			return NextResponse.json({ success: false, error: 'Réservation introuvable' }, { status: 404 })
		}

		const totalFromInstallments = reservation.paymentInstallments
			.reduce((sum, i) => sum + (i.paidAmount ?? 0), 0)

		const totalPaid  = reservation.depositAmount + totalFromInstallments
		const remaining  = Math.max(0, reservation.totalPrice - totalPaid)
		const isFullyPaid = totalPaid >= reservation.totalPrice

		const paidCount  = reservation.paymentInstallments.filter((i) => i.paidAmount !== null).length
		const totalCount = reservation.paymentInstallments.length

		return NextResponse.json({
			success: true,
			data: {
				installments: reservation.paymentInstallments,
				summary: {
					depositAmount: reservation.depositAmount,
					totalPrice:    reservation.totalPrice,
					totalPaid,
					remaining,
					isFullyPaid,
					paidCount,
					totalCount,
					progressPercent: Math.min(100, Math.round((totalPaid / reservation.totalPrice) * 100)),
				},
			},
		})
	} catch (err) {
		console.error('[GET /api/reservations/:id/installments]', err)
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}
