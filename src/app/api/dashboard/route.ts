// src/app/api/dashboard/route.ts
import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { startOfMonth } from 'date-fns'
import { requireSession, apiError } from '@/lib/api'

export async function GET() {
	try {
		const session = await requireSession()
		if (!session) return apiError('Non autorisé', 401)

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
			prisma.reservation.count({ where: { status: { in: ['PAID', 'CONFIRMED'] } } }),
			prisma.contact.count({ where: { isRead: false } }),
			prisma.reservation.aggregate({
				where: { status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] } },
				_sum:  { depositAmount: true },
			}),
			prisma.reservation.aggregate({
				where: { status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] }, reservedAt: { gte: monthStart } },
				_sum:  { depositAmount: true },
			}),
			prisma.reservation.findMany({
				where:   { status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] } },
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
				totalCars, availableCars, reservedCars, soldCars,
				totalReservations, activeReservations, pendingContacts,
				totalRevenue: totalRevenueAgg._sum.depositAmount   ?? 0,
				monthlyRevenue: monthlyRevenueAgg._sum.depositAmount ?? 0,
				recentReservations,
				recentContacts,
			},
		})
	} catch (err) {
		console.error('[GET /api/dashboard]', err)
		return apiError('Erreur serveur')
	}
}
