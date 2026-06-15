// src/app/api/payments/create-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/db'
import { createCheckoutSession } from '@/lib/stripe'

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
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { carId, clientName, clientEmail, clientPhone, installmentType } = parsed.data
    const appUrl = process.env.NEXT_PUBLIC_APP_URL!

    // ── Vérification atomique de disponibilité ────────────────────────────
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
          carId,
          clientName,
          clientEmail,
          clientPhone,
          depositAmount,
          totalPrice:     car.price,
          installmentType,
          status:         'PENDING',
          expiresAt,
        },
      })

      return { car, reservation, depositAmount }
    })

    const { car, reservation, depositAmount } = result

    // ── Création de la session Stripe ─────────────────────────────────────
    const session = await createCheckoutSession({
      carId,
      carTitle:   car.title,
      price:      car.price,
      depositAmount,
      clientName,
      clientEmail,
      clientPhone,
      installmentType,
      // NOUVEAU : on passe reservationId dans les métadonnées Stripe.
      // Le webhook utilisera cet ID pour retrouver la réservation directement,
      // sans dépendre du paymentSessionId (évite la condition de course).
      reservationId: reservation.id,
      successUrl: `${appUrl}/cars/${carId}?success=true&reservation=${reservation.id}`,
      cancelUrl:  `${appUrl}/cars/${carId}?cancelled=true`,
    })

    // Lie la session Stripe à la réservation
    await prisma.reservation.update({
      where: { id: reservation.id },
      data:  { paymentSessionId: session.id },
    })

    return NextResponse.json({ success: true, data: { url: session.url, sessionId: session.id } })
  } catch (err: any) {
    console.error('[POST /api/payments/create-checkout]', err)

    if (err.message === 'CAR_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Véhicule introuvable' }, { status: 404 })
    }
    if (err.message === 'CAR_NOT_AVAILABLE') {
      return NextResponse.json(
        { success: false, error: 'Ce véhicule n\'est plus disponible à la réservation.' },
        { status: 409 }
      )
    }

    return NextResponse.json({ success: false, error: 'Erreur lors de la création du paiement' }, { status: 500 })
  }
}