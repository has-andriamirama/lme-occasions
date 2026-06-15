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
