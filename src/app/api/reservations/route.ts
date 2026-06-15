// src/app/api/reservations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

    const page   = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? 1))
    const limit  = Math.min(50, Number(req.nextUrl.searchParams.get('limit') ?? 20))
    const status = req.nextUrl.searchParams.get('status') ?? ''

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: { car: { select: { id: true, title: true, brand: true, model: true, mainImage: true } } },
        orderBy: { reservedAt: 'desc' },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      prisma.reservation.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: reservations,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('[GET /api/reservations]', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
