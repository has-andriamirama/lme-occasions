// src/app/api/admins/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, validatePassword } from '@/lib/auth'
import prisma from '@/lib/db'
import { requireSession, requireSuperAdmin, apiError, validationError, createAuditLog } from '@/lib/api'
import { z } from 'zod'

const updateSchema = z.object({
	username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Caractères autorisés : a-z, 0-9, _, -').optional(),
	email:    z.string().email().optional(),
	password: z.string().min(8).optional(),
	role:     z.enum(['SUPER_ADMIN', 'ADMIN']).optional(),
	isActive: z.boolean().optional(),
})

export async function PATCH(
	req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await requireSession()
		if (!session) return apiError('Non autorisé', 401)

		const isSelf       = session.user.id === params.id
		const isSuperAdmin = session.user.role === 'SUPER_ADMIN'

		if (!isSelf && !isSuperAdmin) return apiError('Non autorisé', 403)

		const body   = await req.json()
		const parsed = updateSchema.safeParse(body)
		if (!parsed.success) return validationError(parsed.error.flatten())

		if (isSelf && (parsed.data.role !== undefined || parsed.data.isActive !== undefined)) {
			return apiError('Vous ne pouvez pas modifier votre propre rôle ou statut', 400)
		}

		const target = await prisma.admin.findUnique({ where: { id: params.id } })
		if (!target) return apiError('Administrateur introuvable', 404)

		if (parsed.data.username !== undefined || parsed.data.email !== undefined) {
			const orConditions: Array<Record<string, string>> = []
			if (parsed.data.username !== undefined) orConditions.push({ username: parsed.data.username })
			if (parsed.data.email    !== undefined) orConditions.push({ email: parsed.data.email })

			const conflict = await prisma.admin.findFirst({
				where: { id: { not: params.id }, OR: orConditions },
			})
			if (conflict) return apiError('Identifiant ou email déjà utilisé', 409)
		}

		const data: Record<string, unknown> = {}
		if (parsed.data.username !== undefined) data.username = parsed.data.username
		if (parsed.data.email    !== undefined) data.email    = parsed.data.email

		if (parsed.data.password) {
			const validation = validatePassword(parsed.data.password)
			if (!validation.valid) return apiError(validation.errors.join(', '), 400)
			data.password           = await hashPassword(parsed.data.password)
			data.mustChangePassword = false
		}

		if (parsed.data.role === 'SUPER_ADMIN' && target.role !== 'SUPER_ADMIN') {
			const [updatedTarget] = await prisma.$transaction([
				prisma.admin.update({
					where:  { id: params.id },
					data:   { ...data, role: 'SUPER_ADMIN' },
					select: { id: true, username: true, email: true, role: true, isActive: true },
				}),
				prisma.admin.update({ where: { id: session.user.id }, data: { role: 'ADMIN' } }),
				prisma.auditLog.create({
					data: {
						adminId: session.user.id, action: 'UPDATE', entity: 'Admin', entityId: params.id,
						details: { type: 'SUPER_ADMIN_TRANSFER', promoted: target.username },
					},
				}),
				prisma.auditLog.create({
					data: {
						adminId: session.user.id, action: 'UPDATE', entity: 'Admin', entityId: session.user.id,
						details: { type: 'SUPER_ADMIN_TRANSFER', demotedTo: 'ADMIN' },
					},
				}),
			])
			return NextResponse.json({ success: true, data: updatedTarget, superAdminTransferred: true })
		}

		if (parsed.data.role === 'ADMIN' && target.role === 'SUPER_ADMIN') {
			return apiError(
				'Impossible : promouvez un autre administrateur avant de rétrograder le Super Admin actuel',
				400
			)
		}

		if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive

		const admin = await prisma.admin.update({
			where:  { id: params.id },
			data,
			select: { id: true, username: true, email: true, role: true, isActive: true },
		})

		await createAuditLog(session.user.id, 'UPDATE', 'Admin', params.id)

		return NextResponse.json({ success: true, data: admin })
	} catch (err) {
		console.error('[PATCH /api/admins/:id]', err)
		return apiError('Erreur serveur')
	}
}

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const session = await requireSuperAdmin()
		if (!session) return apiError('Super Admin requis', 403)
		if (session.user.id === params.id) {
			return apiError('Vous ne pouvez pas supprimer votre propre compte', 400)
		}

		const target = await prisma.admin.findUnique({ where: { id: params.id } })
		if (!target) return apiError('Administrateur introuvable', 404)
		if (target.role === 'SUPER_ADMIN') return apiError('Impossible de supprimer un Super Admin', 400)

		const totalAdmins = await prisma.admin.count()
		if (totalAdmins <= 1) {
			return apiError('Impossible de supprimer le dernier administrateur', 400)
		}

		await prisma.admin.delete({ where: { id: params.id } })
		await createAuditLog(session.user.id, 'DELETE', 'Admin', params.id)

		return NextResponse.json({ success: true, message: 'Administrateur supprimé' })
	} catch (err) {
		console.error('[DELETE /api/admins/:id]', err)
		return apiError('Erreur serveur')
	}
}
