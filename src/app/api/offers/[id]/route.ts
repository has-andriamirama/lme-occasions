// src/app/api/offers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

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
		return NextResponse.json({ success: true, data: offer })
	} catch (err) {
		console.error('[GET /api/offers/:id]', err)
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
		
		const body    = await req.json()
		const updated = await prisma.offer.update({ where: { id: params.id }, data: body })
		return NextResponse.json({ success: true, data: updated })
	} catch {
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
		await prisma.offer.delete({ where: { id: params.id } })
		return NextResponse.json({ success: true })
	} catch {
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}
