// src/app/api/payments/create-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { createCheckoutSession } from '@/lib/stripe'
import { createBalancePayment } from '@/lib/balance'
import { apiError, validationError } from '@/lib/api'
import { z } from 'zod'

const schema = z.object({
	carId:           z.string().cuid(),
	clientName:      z.string().min(2).max(100),
	clientEmail:     z.string().email(),
	clientPhone:     z.string().min(8).max(20),
	installmentType: z.enum(['FULL', 'THREE_TIMES', 'FOUR_TIMES']).default('FULL'),
})

export async function POST(req: NextRequest) {
	try {
		const body   = await req.json()
		const parsed = schema.safeParse(body)
		if (!parsed.success) return validationError(parsed.error.flatten())

		const { carId, clientName, clientEmail, clientPhone, installmentType } = parsed.data
		const appUrl = process.env.NEXT_PUBLIC_APP_URL!

		const result = await prisma.$transaction(async (tx) => {
			const car = await tx.car.findUnique({
				where:  { id: carId },
				select: { id: true, status: true, price: true, title: true, brand: true, model: true, year: true },
			})

			if (!car)                       throw new Error('CAR_NOT_FOUND')
			if (car.status !== 'AVAILABLE') throw new Error('CAR_NOT_AVAILABLE')

			const depositPct    = Number(process.env.DEPOSIT_PERCENTAGE ?? 30)
			const depositAmount = Math.round(car.price * (depositPct / 100) * 100) / 100
			const expiryDays    = Number(process.env.RESERVATION_EXPIRY_DAYS ?? 5)
			const expiresAt     = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)

			const reservation = await tx.reservation.create({
				data: {
					carId, clientName, clientEmail, clientPhone,
					depositAmount, totalPrice: car.price,
					installmentType, status: 'PENDING', expiresAt,
				},
			})

			await createBalancePayment(tx, reservation.id, car.price, depositAmount)

			return { car, reservation, depositAmount }
		})

		const { car, reservation, depositAmount } = result

		const stripeSession = await createCheckoutSession({
			carId,
			carTitle: car.title,
			price:    car.price,
			depositAmount,
			clientName, clientEmail, clientPhone,
			installmentType,
			reservationId: reservation.id,
			successUrl: `${appUrl}/cars/${carId}?success=true&reservation=${reservation.id}`,
			cancelUrl:  `${appUrl}/cars/${carId}?cancelled=true`,
		})

		await prisma.reservation.update({
			where: { id: reservation.id },
			data:  { paymentSessionId: stripeSession.id },
		})

		return NextResponse.json({ success: true, data: { url: stripeSession.url, sessionId: stripeSession.id } })
	} catch (err: any) {
		console.error('[POST /api/payments/create-checkout]', err)

		if (err.message === 'CAR_NOT_FOUND')     return apiError('Véhicule introuvable', 404)
		if (err.message === 'CAR_NOT_AVAILABLE') {
			return apiError("Ce véhicule n'est plus disponible à la réservation.", 409)
		}
		return apiError('Erreur lors de la création du paiement')
	}
}
