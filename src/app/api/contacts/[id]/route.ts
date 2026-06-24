// src/app/api/contacts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
		const { isRead } = await req.json()
		await prisma.contact.update({ where: { id: params.id }, data: { isRead: Boolean(isRead) } })
		return NextResponse.json({ success: true })
	} catch {
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
	try {
		const session = await getServerSession(authOptions)
		if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
		await prisma.contact.delete({ where: { id: params.id } })
		return NextResponse.json({ success: true })
	} catch {
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}
