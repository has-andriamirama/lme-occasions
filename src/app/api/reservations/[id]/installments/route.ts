// src/app/api/reservations/[id]/installments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireSession, apiError } from '@/lib/api'
import { computePaymentSummary } from '@/lib/queries'

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
				depositAmount:       true,
				totalPrice:          true,
				status:              true,
				installmentType:     true,
				paymentInstallments: { orderBy: { installmentNumber: 'asc' } },
			},
		})
		if (!reservation) return apiError('Réservation introuvable', 404)

		const summary = computePaymentSummary({
			depositAmount: reservation.depositAmount,
			totalPrice:    reservation.totalPrice,
			installments:  reservation.paymentInstallments,
		})

		return NextResponse.json({
			success: true,
			data: {
				installments: reservation.paymentInstallments,
				summary: {
					depositAmount: reservation.depositAmount,
					totalPrice:    reservation.totalPrice,
					...summary,
				},
			},
		})
	} catch (err) {
		console.error('[GET /api/reservations/:id/installments]', err)
		return apiError('Erreur serveur')
	}
}
