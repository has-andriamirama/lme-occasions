// src/app/api/admins/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, hashPassword, validatePassword } from '@/lib/auth'
import prisma from '@/lib/db'
import { z } from 'zod'

const createSchema = z.object({
	username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Caractères autorisés : a-z, 0-9, _, -'),
	email:    z.string().email(),
	password: z.string().min(8),
})

async function requireSuperAdmin() {
	const session = await getServerSession(authOptions)
	if (!session?.user) return null
	if (session.user.role !== 'SUPER_ADMIN') return null
	return session
}

export async function GET(_req: NextRequest) {
	try {
		const session = await requireSuperAdmin()
		if (!session) return NextResponse.json({ success: false, error: 'Super Admin requis' }, { status: 403 })

		const admins = await prisma.admin.findMany({
			select: {
				id: true, username: true, email: true, role: true,
				isActive: true, lastLoginAt: true, createdAt: true, mustChangePassword: true,
			},
			orderBy: { createdAt: 'asc' },
		})
		return NextResponse.json({ success: true, data: admins })
	} catch (err) {
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}

export async function POST(req: NextRequest) {
	try {
		const session = await requireSuperAdmin()
		if (!session) return NextResponse.json({ success: false, error: 'Super Admin requis' }, { status: 403 })

		const body   = await req.json()
		const parsed = createSchema.safeParse(body)
		if (!parsed.success) {
			return NextResponse.json({ success: false, error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
		}

		const validation = validatePassword(parsed.data.password)
		if (!validation.valid) {
			return NextResponse.json({ success: false, error: validation.errors.join(', ') }, { status: 400 })
		}

		const existing = await prisma.admin.findFirst({
			where: { OR: [{ username: parsed.data.username }, { email: parsed.data.email }] },
		})
		if (existing) {
			return NextResponse.json({ success: false, error: 'Identifiant ou email déjà utilisé' }, { status: 409 })
		}

		const admin = await prisma.admin.create({
			data: {
				username:           parsed.data.username,
				email:              parsed.data.email,
				password:           await hashPassword(parsed.data.password),
				role:               'ADMIN',
				mustChangePassword: true,
			},
			select: { id: true, username: true, email: true, role: true, isActive: true, createdAt: true },
		})

		await prisma.auditLog.create({
			data: { adminId: session.user.id, action: 'CREATE', entity: 'Admin', entityId: admin.id },
		})

		return NextResponse.json({ success: true, data: admin }, { status: 201 })
	} catch (err) {
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}
