// src/app/api/offers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { z } from 'zod'

const offerSchema = z.object({
	name:         z.string().min(2).max(200),
	description:  z.string().optional(),
	type:         z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
	value:        z.number().positive(),
	startDate:    z.string().datetime(),
	endDate:      z.string().datetime(),
	isActive:     z.boolean().default(true),
	appliedToAll: z.boolean().default(false),
	carIds:       z.array(z.string()).default([]),
})

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = req.nextUrl
		const isAdmin   = searchParams.get('admin') === 'true'
		// `all=true`    → toutes les offres (actives ou non), sans auth — pour la page publique /offers
		const showAll   = searchParams.get('all') === 'true'
		// `offerId=xxx` → filtre sur un ID précis (pour afficher le détail dans CarsPageClient)
		const offerId   = searchParams.get('offerId')

		const now       = new Date()

		// Build where clause
		let where: Record<string, unknown> = {}
		if (offerId) {
			// Fetch a specific offer regardless of active status
			where = { id: offerId }
		} else if (isAdmin || showAll) {
			// No filter — return everything
			where = {}
		} else {
			// Default: only active & in-date offers (homepage / cars page)
			where = {
				isActive:  true,
				startDate: { lte: now },
				endDate:   { gte: now },
			}
		}

		const offers = await prisma.offer.findMany({
			where,
			include: {
				cars: {
					include: {
						car: { select: { id: true, title: true, brand: true, model: true, mainImage: true } },
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		})

		return NextResponse.json({ success: true, data: offers })
	} catch (err) {
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}

export async function POST(req: NextRequest) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

		const body   = await req.json()
		const parsed = offerSchema.safeParse(body)
		if (!parsed.success) {
			return NextResponse.json({ success: false, error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
		}

		const { carIds, ...offerData } = parsed.data

		const offer = await prisma.offer.create({
			data: {
				...offerData,
				startDate: new Date(offerData.startDate),
				endDate:   new Date(offerData.endDate),
				cars: carIds.length
					? { create: carIds.map((carId) => ({ carId })) }
					: undefined,
			},
			include: { cars: true },
		})

		// If appliedToAll, link all available cars
		if (parsed.data.appliedToAll) {
			const allCars = await prisma.car.findMany({ select: { id: true } })
			await prisma.carOffer.createMany({
				data: allCars
					.filter((c) => !carIds.includes(c.id))
					.map((c) => ({ carId: c.id, offerId: offer.id })),
				skipDuplicates: true,
			})
		}

		return NextResponse.json({ success: true, data: offer }, { status: 201 })
	} catch (err) {
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}
