// src/app/api/contacts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireSession, apiError } from '@/lib/api'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
	try {
		const session = await requireSession()
		if (!session) return apiError('Non autorisé', 401)

		const { isRead } = await req.json()
		await prisma.contact.update({ where: { id: params.id }, data: { isRead: Boolean(isRead) } })
		return NextResponse.json({ success: true })
	} catch {
		return apiError('Erreur serveur')
	}
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
	try {
		const session = await requireSession()
		if (!session) return apiError('Non autorisé', 401)

		await prisma.contact.delete({ where: { id: params.id } })
		return NextResponse.json({ success: true })
	} catch {
		return apiError('Erreur serveur')
	}
}
