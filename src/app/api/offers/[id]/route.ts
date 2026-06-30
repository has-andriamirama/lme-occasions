// src/app/api/offers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { broadcastOfferUpdated, broadcastOfferDeleted } from '@/lib/pusher'
import { requireSession, apiError, validationError, createAuditLog, safePusher } from '@/lib/api'
import { z } from 'zod'

const updateOfferSchema = z.object({
	name:         z.string().min(2).max(200).optional(),
	description:  z.string().optional().nullable(),
	type:         z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).optional(),
	value:        z.number().positive().optional(),
	startDate:    z.string().datetime().optional(),
	endDate:      z.string().datetime().optional(),
	isActive:     z.boolean().optional(),
	appliedToAll: z.boolean().optional(),
	carIds:       z.array(z.string()).optional(),
}).strict()

export async function GET(
	_req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const offer = await prisma.offer.findUnique({
			where:   { id: params.id },
			include: {
				cars: {
					include: { car: true },
					where:   { car: { status: 'AVAILABLE' } },
				},
			},
		})
		if (!offer) return apiError('Offre introuvable', 404)
		return NextResponse.json({ success: true, offer })
	} catch (err) {
		console.error('[GET /api/offers/:id]', err)
		return apiError('Erreur serveur')
	}
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await requireSession()
		if (!session) return apiError('Non autorisé', 401)

		const body   = await req.json()
		const parsed = updateOfferSchema.safeParse(body)
		if (!parsed.success) return validationError(parsed.error.flatten())

		const existing = await prisma.offer.findUnique({ where: { id: params.id } })
		if (!existing) return apiError('Offre introuvable', 404)

		const { carIds, appliedToAll, ...rest } = parsed.data

		const data: Record<string, unknown> = { ...rest }
		if (rest.startDate) data.startDate = new Date(rest.startDate)
		if (rest.endDate)   data.endDate   = new Date(rest.endDate)
		if (appliedToAll !== undefined) data.appliedToAll = appliedToAll

		const startCheck = (data.startDate as Date | undefined) ?? existing.startDate
		const endCheck   = (data.endDate   as Date | undefined) ?? existing.endDate
		if (new Date(endCheck) <= new Date(startCheck)) {
			return apiError('La date de fin doit être après la date de début', 400)
		}

		const carsWereTouched = carIds !== undefined || appliedToAll !== undefined
		let finalCarIds: string[] = []

		const updatedOffer = await prisma.$transaction(async (tx) => {
			const off = await tx.offer.update({ where: { id: params.id }, data })

			if (carsWereTouched) {
				await tx.carOffer.deleteMany({ where: { offerId: params.id } })

				finalCarIds = appliedToAll
					? (await tx.car.findMany({ select: { id: true } })).map((c: { id: string }) => c.id)
					: (carIds ?? [])

				if (finalCarIds.length) {
					await tx.carOffer.createMany({
						data:           finalCarIds.map((carId: string) => ({ carId, offerId: params.id })),
						skipDuplicates: true,
					})
				}
			}

			return off
		})

		if (!carsWereTouched) {
			const links = await prisma.carOffer.findMany({
				where:  { offerId: params.id },
				select: { carId: true },
			})
			finalCarIds = links.map((l: { carId: string }) => l.carId)
		}

		await createAuditLog(session.user.id, 'UPDATE', 'Offer', params.id, { changes: parsed.data })
		await safePusher(
			() => broadcastOfferUpdated({ ...updatedOffer, carIds: finalCarIds }),
			'PATCH /api/offers/:id'
		)

		return NextResponse.json({ success: true, data: updatedOffer })
	} catch (err) {
		console.error('[PATCH /api/offers/:id]', err)
		return apiError('Erreur serveur')
	}
}

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await requireSession()
		if (!session) return apiError('Non autorisé', 401)

		const offer = await prisma.offer.findUnique({
			where:   { id: params.id },
			include: { cars: { select: { carId: true } } },
		})
		if (!offer) return apiError('Offre introuvable', 404)

		const carIds = offer.cars.map((c: { carId: string }) => c.carId)

		await prisma.offer.delete({ where: { id: params.id } })
		await createAuditLog(session.user.id, 'DELETE', 'Offer', params.id, { name: offer.name })
		await safePusher(
			() => broadcastOfferDeleted(params.id, carIds),
			'DELETE /api/offers/:id'
		)

		return NextResponse.json({ success: true, message: 'Offre supprimée' })
	} catch (err) {
		console.error('[DELETE /api/offers/:id]', err)
		return apiError('Erreur serveur')
	}
}
