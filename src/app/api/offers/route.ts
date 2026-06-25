// src/app/api/offers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { broadcastOfferChange } from '@/lib/pusher'
import { requireSession, apiError, validationError, parsePagination, createAuditLog, safePusher } from '@/lib/api'
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
		const { page, limit, skip } = parsePagination(searchParams)

		const search = searchParams.get('search') ?? ''
		const status = searchParams.get('status') ?? ''
		const type   = searchParams.get('type') ?? ''
		const sortBy = searchParams.get('sortBy') ?? 'newest'

		const now = new Date()
		const where: Record<string, unknown> = {}

		if (search) {
			where.OR = [
				{ name:        { contains: search, mode: 'insensitive' } },
				{ description: { contains: search, mode: 'insensitive' } },
			]
		}
		if (status === 'ACTIVE') {
			where.isActive  = true
			where.startDate = { lte: now }
			where.endDate   = { gte: now }
		}
		if (status === 'INACTIVE') {
			where.OR = [{ isActive: false }, { endDate: { lt: now } }]
		}
		if (type) where.type = type

		const orderByMap: Record<string, Record<string, 'asc' | 'desc'>> = {
			ending:     { endDate:   'asc'  },
			value_desc: { value:     'desc' },
			value_asc:  { value:     'asc'  },
			newest:     { createdAt: 'desc' },
		}

		const [offers, total] = await Promise.all([
			prisma.offer.findMany({
				where,
				include: {
					cars: {
						include: {
							car: { select: { id: true, title: true, brand: true, model: true, mainImage: true } },
						},
					},
				},
				orderBy: orderByMap[sortBy] ?? { createdAt: 'desc' },
				skip,
				take: limit,
			}),
			prisma.offer.count({ where }),
		])

		return NextResponse.json({
			success: true,
			data:    offers,
			meta:    { total, page, limit, totalPages: Math.ceil(total / limit) },
		})
	} catch (err) {
		console.error('[GET /api/offers]', err)
		return apiError('Erreur serveur')
	}
}

export async function POST(req: NextRequest) {
	try {
		const session = await requireSession()
		if (!session) return apiError('Non autorisé', 401)

		const body   = await req.json()
		const parsed = offerSchema.safeParse(body)
		if (!parsed.success) return validationError(parsed.error.flatten())

		const { carIds, ...offerData } = parsed.data

		if (new Date(offerData.endDate) <= new Date(offerData.startDate)) {
			return apiError('La date de fin doit être après la date de début', 400)
		}

		const offer = await prisma.offer.create({
			data: {
				...offerData,
				startDate: new Date(offerData.startDate),
				endDate:   new Date(offerData.endDate),
				cars:      carIds.length ? { create: carIds.map((carId) => ({ carId })) } : undefined,
			},
		})

		let finalCarIds = carIds
		if (parsed.data.appliedToAll) {
			const allCars = await prisma.car.findMany({ select: { id: true } })
			await prisma.carOffer.createMany({
				data: allCars
					.filter((c: { id: string }) => !carIds.includes(c.id))
					.map((c: { id: string }) => ({ carId: c.id, offerId: offer.id })),
				skipDuplicates: true,
			})
			finalCarIds = allCars.map((c: { id: string }) => c.id)
		}

		await createAuditLog(session.user.id, 'CREATE', 'Offer', offer.id, { name: offer.name })

		await safePusher(
			() => broadcastOfferChange({ ...offer, carIds: finalCarIds }),
			'POST /api/offers'
		)

		return NextResponse.json({ success: true, data: offer }, { status: 201 })
	} catch (err) {
		console.error('[POST /api/offers]', err)
		return apiError('Erreur serveur')
	}
}
