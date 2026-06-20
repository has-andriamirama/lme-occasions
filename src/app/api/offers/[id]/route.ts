// src/app/api/offers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { broadcastOfferChange, broadcastOfferDeleted } from '@/lib/pusher'
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

// ── GET single offer ───────────────────────────────────────────────────────
export async function GET(
	_req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const offer = await prisma.offer.findUnique({
			where: { id: params.id },
			include: {
				cars: {
					include: { car: true },
					where: {
						car: { status: 'AVAILABLE' },
					},
				},
			},
		})
		if (!offer) return NextResponse.json({ success: false, error: 'Offre introuvable' }, { status: 404 })
		return NextResponse.json({ success: true, offer: offer })
	} catch (err) {
		console.error('[GET /api/offers/:id]', err)
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}

// ── PATCH update offer (admin only) ──────────────────────────────────────────
// Sert à la fois pour : l'édition complète (formulaire), et les actions rapides
// "pause" / "reprendre" qui n'envoient que `{ isActive: boolean }`.
export async function PATCH(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

		const body   = await req.json()
		const parsed = updateOfferSchema.safeParse(body)
		if (!parsed.success) {
			return NextResponse.json({ success: false, error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
		}

		const existing = await prisma.offer.findUnique({ where: { id: params.id } })
		if (!existing) return NextResponse.json({ success: false, error: 'Offre introuvable' }, { status: 404 })

		const { carIds, appliedToAll, ...rest } = parsed.data

		const data: Record<string, unknown> = { ...rest }
		if (rest.startDate) data.startDate = new Date(rest.startDate)
		if (rest.endDate)   data.endDate   = new Date(rest.endDate)
		if (appliedToAll !== undefined) data.appliedToAll = appliedToAll

		const startCheck = (data.startDate as Date | undefined) ?? existing.startDate
		const endCheck   = (data.endDate as Date | undefined)   ?? existing.endDate
		if (new Date(endCheck) <= new Date(startCheck)) {
			return NextResponse.json({ success: false, error: 'La date de fin doit être après la date de début' }, { status: 400 })
		}

		// Transaction : mise à jour de l'offre + (re)liaison des véhicules concernés.
		// `carsWereTouched` distingue "le formulaire a renvoyé une sélection de véhicules"
		// (édition complète) de "seul isActive a été envoyé" (action rapide pause/reprise),
		// pour ne recalculer les liaisons CarOffer que quand c'est nécessaire.
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
						data: finalCarIds.map((carId: string) => ({ carId, offerId: params.id })),
						skipDuplicates: true,
					})
				}
			}

			return off
		})

		// Si les véhicules liés n'ont pas été touchés par cette requête (ex: simple pause),
		// on les récupère pour construire un payload de broadcast complet.
		if (!carsWereTouched) {
			const links = await prisma.carOffer.findMany({ where: { offerId: params.id }, select: { carId: true } })
			finalCarIds = links.map((l: { carId: string }) => l.carId)
		}

		await prisma.auditLog.create({
			data: {
				adminId:  session.user.id,
				action:   'UPDATE',
				entity:   'Offer',
				entityId: params.id,
				details:  { changes: parsed.data },
			},
		})

		// Broadcast Pusher (NON-CRITIQUE : une erreur Pusher ne doit pas faire échouer
		// la mise à jour de l'offre — la DB est déjà à jour avec succès)
		try {
			await broadcastOfferChange({ ...updatedOffer, carIds: finalCarIds })
		} catch (pusherErr) {
			console.error('[PATCH /api/offers/:id] Pusher broadcast échoué (non-critique) :', pusherErr)
		}

		return NextResponse.json({ success: true, data: updatedOffer })
	} catch (err) {
		console.error('[PATCH /api/offers/:id]', err)
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}

// ── DELETE offer ──────────────────────────────────────────────────────────────
export async function DELETE(
	_req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

		const offer = await prisma.offer.findUnique({
			where: { id: params.id },
			include: { cars: { select: { carId: true } } },
		})
		if (!offer) return NextResponse.json({ success: false, error: 'Offre introuvable' }, { status: 404 })

		const carIds = offer.cars.map((c: { carId: string }) => c.carId)

		await prisma.offer.delete({ where: { id: params.id } })

		await prisma.auditLog.create({
			data: {
				adminId:  session.user.id,
				action:   'DELETE',
				entity:   'Offer',
				entityId: params.id,
				details:  { name: offer.name },
			},
		})

		try {
			await broadcastOfferDeleted(params.id, carIds)
		} catch (pusherErr) {
			console.error('[DELETE /api/offers/:id] Pusher broadcast échoué (non-critique) :', pusherErr)
		}

		return NextResponse.json({ success: true, message: 'Offre supprimée' })
	} catch (err) {
		console.error('[DELETE /api/offers/:id]', err)
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}
