// src/app/api/admins/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, validatePassword } from '@/lib/auth'
import prisma from '@/lib/db'
import { requireSuperAdmin, apiError, validationError, createAuditLog } from '@/lib/api'
import { z } from 'zod'

const createSchema = z.object({
	username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Caractères autorisés : a-z, 0-9, _, -'),
	email:    z.string().email(),
	password: z.string().min(8),
})

export async function GET(_req: NextRequest) {
	try {
		const session = await requireSuperAdmin()
		if (!session) return apiError('Super Admin requis', 403)

		const admins = await prisma.admin.findMany({
			select: {
				id: true, username: true, email: true, role: true,
				isActive: true, lastLoginAt: true, createdAt: true, mustChangePassword: true,
			},
			orderBy: { createdAt: 'asc' },
		})
		return NextResponse.json({ success: true, data: admins })
	} catch (err) {
		console.error('[GET /api/admins]', err)
		return apiError('Erreur serveur')
	}
}

export async function POST(req: NextRequest) {
	try {
		const session = await requireSuperAdmin()
		if (!session) return apiError('Super Admin requis', 403)

		const body   = await req.json()
		const parsed = createSchema.safeParse(body)
		if (!parsed.success) return validationError(parsed.error.flatten())

		const validation = validatePassword(parsed.data.password)
		if (!validation.valid) return apiError(validation.errors.join(', '), 400)

		const existing = await prisma.admin.findFirst({
			where: { OR: [{ username: parsed.data.username }, { email: parsed.data.email }] },
		})
		if (existing) return apiError('Identifiant ou email déjà utilisé', 409)

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

		await createAuditLog(session.user.id, 'CREATE', 'Admin', admin.id)

		return NextResponse.json({ success: true, data: admin }, { status: 201 })
	} catch (err) {
		console.error('[POST /api/admins]', err)
		return apiError('Erreur serveur')
	}
}
