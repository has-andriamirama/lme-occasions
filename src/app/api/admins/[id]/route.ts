// src/app/api/admins/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, hashPassword, validatePassword } from '@/lib/auth'
import prisma from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  username:  z.string().min(3).max(50).optional(),
  email:     z.string().email().optional(),
  password:  z.string().min(8).optional(),
  role:      z.enum(['SUPER_ADMIN', 'ADMIN']).optional(),
  isActive:  z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

    // Allow admin to update their own password; super admin can update any admin
    const isSelf       = session.user.id === params.id
    const isSuperAdmin = session.user.role === 'SUPER_ADMIN'
    if (!isSelf && !isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    const body   = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 })
    }

    const data: Record<string, unknown> = { ...parsed.data }

    if (parsed.data.password) {
      const validation = validatePassword(parsed.data.password)
      if (!validation.valid) {
        return NextResponse.json({ success: false, error: validation.errors.join(', ') }, { status: 400 })
      }
      data.password           = await hashPassword(parsed.data.password)
      data.mustChangePassword = false
    }

    const admin = await prisma.admin.update({
      where: { id: params.id },
      data,
      select: { id: true, username: true, email: true, role: true, isActive: true },
    })

    await prisma.auditLog.create({
      data: { adminId: session.user.id, action: 'UPDATE', entity: 'Admin', entityId: params.id },
    })

    return NextResponse.json({ success: true, data: admin })
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Super Admin requis' }, { status: 403 })
    }
    if (session.user.id === params.id) {
      return NextResponse.json({ success: false, error: 'Vous ne pouvez pas supprimer votre propre compte' }, { status: 400 })
    }

    const totalAdmins = await prisma.admin.count()
    if (totalAdmins <= 1) {
      return NextResponse.json({ success: false, error: 'Impossible de supprimer le dernier administrateur' }, { status: 400 })
    }

    await prisma.admin.delete({ where: { id: params.id } })

    await prisma.auditLog.create({
      data: { adminId: session.user.id, action: 'DELETE', entity: 'Admin', entityId: params.id },
    })

    return NextResponse.json({ success: true, message: 'Administrateur supprimé' })
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
