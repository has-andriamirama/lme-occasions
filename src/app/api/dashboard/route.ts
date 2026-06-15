// src/app/api/dashboard/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { startOfMonth } from 'date-fns'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

    const monthStart = startOfMonth(new Date())

    const [
      totalCars,
      availableCars,
      reservedCars,
      soldCars,
      totalReservations,
      activeReservations,
      pendingContacts,
      totalRevenueAgg,
      monthlyRevenueAgg,
      recentReservations,
      recentContacts,
    ] = await Promise.all([
      prisma.car.count(),
      prisma.car.count({ where: { status: 'AVAILABLE' } }),
      prisma.car.count({ where: { status: 'RESERVED' } }),
      prisma.car.count({ where: { status: 'SOLD' } }),
      prisma.reservation.count(),
      prisma.reservation.count({ where: { status: 'CONFIRMED' } }),
      prisma.contact.count({ where: { isRead: false } }),
      prisma.reservation.aggregate({
        where:  { status: { in: ['CONFIRMED', 'COMPLETED'] } },
        _sum:   { depositAmount: true },
      }),
      prisma.reservation.aggregate({
        where:  { status: { in: ['CONFIRMED', 'COMPLETED'] }, reservedAt: { gte: monthStart } },
        _sum:   { depositAmount: true },
      }),
      prisma.reservation.findMany({
        where:   { status: { in: ['CONFIRMED', 'COMPLETED'] } },
        include: { car: { select: { id: true, title: true, brand: true, mainImage: true } } },
        orderBy: { reservedAt: 'desc' },
        take:    5,
      }),
      prisma.contact.findMany({
        where:   { isRead: false },
        orderBy: { createdAt: 'desc' },
        take:    5,
      }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        totalCars,
        availableCars,
        reservedCars,
        soldCars,
        totalReservations,
        activeReservations,
        pendingContacts,
        totalRevenue:   totalRevenueAgg._sum.depositAmount  ?? 0,
        monthlyRevenue: monthlyRevenueAgg._sum.depositAmount ?? 0,
        recentReservations,
        recentContacts,
      },
    })
  } catch (err) {
    console.error('[GET /api/dashboard]', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
