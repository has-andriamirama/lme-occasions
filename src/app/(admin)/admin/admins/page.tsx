// src/app/(admin)/admin/admins/page.tsx
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/db'
import { formatDateTime } from '@/lib/utils'
import AdminsClient from '@/components/admin/admins/AdminsClient'

export const metadata: Metadata = { title: 'Administrateurs' }

export default async function AdminsPage() {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== 'SUPER_ADMIN') redirect('/admin/dashboard')

  const admins = await prisma.admin.findMany({
    select: {
      id: true, username: true, email: true, role: true,
      isActive: true, lastLoginAt: true, createdAt: true, mustChangePassword: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Administrateurs</h1>
        <p className="text-dark-400 text-sm mt-0.5">{admins.length} compte{admins.length !== 1 ? 's' : ''}</p>
      </div>
      <AdminsClient admins={admins} currentAdminId={session!.user.id} />
    </div>
  )
}
