// src/app/(admin)/layout.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/layout/AdminSidebar'
import AdminTopbar  from '@/components/admin/layout/AdminTopbar'
import ChangePasswordForm from '@/components/admin/settings/ChangePasswordForm'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
	const session = await getServerSession(authOptions)
	if (!session?.user) redirect('/login')

	return (
		<div className="flex h-screen bg-dark-950 overflow-hidden">
			<AdminSidebar user={session.user} />
			<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
				<AdminTopbar user={session.user} />
				<main className="flex-1 overflow-y-auto p-6">
					{children}
				</main>
			</div>
			<ChangePasswordModal open={session.user.mustChangePassword} />
		</div>
	)
}
