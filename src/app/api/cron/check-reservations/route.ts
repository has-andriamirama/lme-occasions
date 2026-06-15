// src/app/api/cron/check-reservations/route.ts
// Called by Vercel Cron (every hour) or a scheduler of your choice
// Add to vercel.json: { "crons": [{ "path": "/api/cron/check-reservations", "schedule": "0 * * * *" }] }
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { broadcastCarStatus } from '@/lib/pusher'
import {
  sendReservationExpiredToAdmin,
  sendReservationExpiredToClient,
} from '@/lib/mail'

export async function GET(req: NextRequest) {
  // Protect endpoint with secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    // Find all CONFIRMED reservations that have passed their expiry
    const expired = await prisma.reservation.findMany({
      where: {
        status:    'CONFIRMED',
        expiresAt: { lte: now },
        expiredEmailSent: false,
      },
      include: { car: true },
    })

    let processed = 0

    for (const reservation of expired) {
      try {
        // ── Transaction: mark expired + free the car ──────────────────────
        await prisma.$transaction(async (tx) => {
          await tx.reservation.update({
            where: { id: reservation.id },
            data: {
              status:     'EXPIRED',
              expiredAt:  now,
              expiredEmailSent: true,
            },
          })

          // Only set car back to available if it's still in RESERVED state
          // (admin might have manually set it to SOLD)
          await tx.car.updateMany({
            where: { id: reservation.carId, status: 'RESERVED' },
            data:  { status: 'AVAILABLE' },
          })
        })

        // ── Broadcast real-time ────────────────────────────────────────────
        await broadcastCarStatus(
          reservation.carId,
          'AVAILABLE',
          reservation.car.title
        ).catch(console.error)

        // ── Send expiry emails ────────────────────────────────────────────
        await Promise.all([
          sendReservationExpiredToClient({
            clientName:    reservation.clientName,
            clientEmail:   reservation.clientEmail,
            carTitle:      reservation.car.title,
            depositAmount: reservation.depositAmount,
          }),
          sendReservationExpiredToAdmin({
            clientName:    reservation.clientName,
            clientEmail:   reservation.clientEmail,
            carTitle:      reservation.car.title,
            reservationId: reservation.id,
          }),
        ]).catch(console.error)

        processed++
      } catch (err) {
        console.error(`[Cron] Failed to expire reservation ${reservation.id}:`, err)
      }
    }

    const summary = { checked: expired.length, processed, timestamp: now.toISOString() }
    console.log('[Cron] check-reservations:', summary)
    return NextResponse.json({ success: true, ...summary })
  } catch (err) {
    console.error('[Cron] Fatal error:', err)
    return NextResponse.json({ success: false, error: 'Cron error' }, { status: 500 })
  }
}
