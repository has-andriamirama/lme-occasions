// src/app/api/cars/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { broadcastCarUpdate, broadcastCarDeleted } from '@/lib/pusher'
import { requireSession, apiError, validationError, createAuditLog, safePusher } from '@/lib/api'
import { getActiveOffersInclude } from '@/lib/queries'
import { z } from 'zod'

const updateSchema = z.object({
	title:            z.string().min(3).max(200).optional(),
	brand:            z.string().min(1).max(100).optional(),
	model:            z.string().min(1).max(100).optional(),
	year:             z.number().int().min(1900).optional(),
	mileage:          z.number().int().min(0).optional(),
	price:            z.number().positive().optional(),
	description:      z.string().min(10).optional(),
	mainImage:        z.string().url().optional(),
	images:           z.array(z.string()).optional(),
	equipments:       z.array(z.string()).optional(),
	status:           z.enum(['AVAILABLE', 'RESERVED', 'SOLD']).optional(),
	isFeatured:       z.boolean().optional(),
	transmission:     z.enum(['MANUAL', 'AUTOMATIC', 'SEMI_AUTOMATIC']).optional(),
	fuelType:         z.enum(['GASOLINE', 'DIESEL', 'ELECTRIC', 'HYBRID', 'GPL']).optional(),
	color:            z.string().optional(),
	engineSize:       z.string().optional(),
	seats:            z.number().int().min(1).max(20).optional(),
	doors:            z.number().int().min(2).max(7).optional(),
	condition:        z.string().optional(),
	allowInstallment: z.boolean().optional(),
}).strict()

export async function GET(
	_req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const car = await prisma.car.findUnique({
			where:   { id: params.id },
			include: { offers: getActiveOffersInclude() },
		})
		if (!car) return apiError('Voiture introuvable', 404)
		return NextResponse.json({ success: true, data: car })
	} catch (err) {
		console.error('[GET /api/cars/:id]', err)
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

		const body         = await req.json()
		const { id, ...data } = body
		const parsed       = updateSchema.safeParse(data)
		if (!parsed.success) return validationError(parsed.error.flatten())

		const existing = await prisma.car.findUnique({ where: { id: params.id } })
		if (!existing) return apiError('Voiture introuvable', 404)

		const updated = await prisma.car.update({ where: { id: params.id }, data: parsed.data })

		if (Object.keys(parsed.data).length > 0) {
			await safePusher(
				() => broadcastCarUpdate({ id: updated.id, ...parsed.data }),
				'PATCH /api/cars/:id'
			)
		}

		await createAuditLog(session.user.id, 'UPDATE', 'Car', updated.id, { changes: parsed.data })

		return NextResponse.json({ success: true, data: updated })
	} catch (err) {
		console.error('[PATCH /api/cars/:id]', err)
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

		const car = await prisma.car.findUnique({ where: { id: params.id } })
		if (!car) return apiError('Voiture introuvable', 404)
		if (car.status === 'RESERVED') {
			return apiError('Impossible de supprimer un véhicule réservé', 400)
		}

		await prisma.car.delete({ where: { id: params.id } })
		await createAuditLog(session.user.id, 'DELETE', 'Car', params.id, { title: car.title, brand: car.brand })
		await safePusher(() => broadcastCarDeleted(params.id), 'DELETE /api/cars/:id')

		return NextResponse.json({ success: true, message: 'Véhicule supprimé' })
	} catch (err) {
		console.error('[DELETE /api/cars/:id]', err)
		return apiError('Erreur serveur')
	}
}
