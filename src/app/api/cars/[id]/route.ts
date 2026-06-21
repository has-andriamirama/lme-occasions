// src/app/api/cars/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { broadcastCarUpdate } from '@/lib/pusher'
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

// ── GET single car ─────────────────────────────────────────────────────────
export async function GET(
	_req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const car = await prisma.car.findUnique({
			where: { id: params.id },
			include: {
				offers: {
					include: { offer: true },
					where: {
						offer: {
							isActive:  true,
							startDate: { lte: new Date() },
							endDate:   { gte: new Date() },
						},
					},
				},
			},
		})
		if (!car) return NextResponse.json({ success: false, error: 'Voiture introuvable' }, { status: 404 })
		return NextResponse.json({ success: true, data: car })
	} catch (err) {
		console.error('[GET /api/cars/:id]', err)
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}

// ── PATCH update car ─────────────────────────────────────────────────────────
export async function PATCH(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

		const body = await req.json()
		const { id, ...data } = body
		const parsed = updateSchema.safeParse(data)
		if (!parsed.success) {
			return NextResponse.json({ success: false, error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
		}

		const existing = await prisma.car.findUnique({ where: { id: params.id } })
		if (!existing) return NextResponse.json({ success: false, error: 'Voiture introuvable' }, { status: 404 })

		const updated = await prisma.car.update({
			where: { id: params.id },
			data:  parsed.data,
		})

		// Broadcast Pusher (NON-CRITIQUE : une erreur Pusher ne doit pas faire échouer
		// la mise à jour de la voiture — la DB est déjà mise à jour avec succès)
		// On diffuse dès qu'au moins un champ a changé, pas seulement le statut,
		// et on envoie uniquement les champs réellement modifiés (mise à jour partielle).
		if (Object.keys(parsed.data).length > 0) {
			try {
				await broadcastCarUpdate({ id: updated.id, ...parsed.data })
				console.log('[PATCH /api/cars/:id] Pusher broadcast OK :', Object.keys(parsed.data))
			} catch (pusherErr) {
				// Pusher a échoué → on logge mais la réponse reste 200
				// Les clients verront la mise à jour au prochain refresh
				console.error('[PATCH /api/cars/:id] Pusher broadcast échoué (non-critique) :', pusherErr)
			}
		}

		await prisma.auditLog.create({
			data: {
				adminId:  session.user.id,
				action:   'UPDATE',
				entity:   'Car',
				entityId: updated.id,
				details:  { changes: parsed.data },
			},
		})

		return NextResponse.json({ success: true, data: updated })
	} catch (err) {
		console.error('[PATCH /api/cars/:id]', err)
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}

// ── DELETE car ────────────────────────────────────────────────────────────────
export async function DELETE(
	_req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

		const car = await prisma.car.findUnique({ where: { id: params.id } })
		if (!car) return NextResponse.json({ success: false, error: 'Voiture introuvable' }, { status: 404 })

		if (car.status === 'RESERVED') {
			return NextResponse.json(
				{ success: false, error: 'Impossible de supprimer un véhicule réservé' },
				{ status: 400 }
			)
		}

		await prisma.car.delete({ where: { id: params.id } })

		await prisma.auditLog.create({
			data: {
				adminId:  session.user.id,
				action:   'DELETE',
				entity:   'Car',
				entityId: params.id,
				details:  { title: car.title, brand: car.brand },
			},
		})

		return NextResponse.json({ success: true, message: 'Véhicule supprimé' })
	} catch (err) {
		console.error('[DELETE /api/cars/:id]', err)
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}
