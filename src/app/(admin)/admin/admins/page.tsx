// src/app/(admin)/admin/admins/page.tsx
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/db'
import { Shield, ShieldCheck } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import AdminForm from '@/components/admin/admins/AdminForm'
import AdminActions from '@/components/admin/admins/AdminActions'

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

	const currentAdminId = session!.user.id

	return (
		<div className="space-y-6 max-w-4xl">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-display font-bold text-white">Administrateurs</h1>
					<p className="text-dark-400 text-sm mt-0.5">
						{admins.length} compte{admins.length !== 1 ? 's' : ''}
					</p>
				</div>
				<AdminForm />
			</div>

			<div className="card overflow-hidden">
				{admins.length === 0 ? (
					<div className="text-center py-16">
						<Shield className="w-10 h-10 text-dark-600 mx-auto mb-3" />
						<p className="text-dark-400 text-sm mb-4">Aucun administrateur</p>
						<AdminForm />
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-dark-700 text-xs text-dark-400 uppercase tracking-wider">
									<th className="text-left px-5 py-3 font-medium">Utilisateur</th>
									<th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Rôle</th>
									<th className="text-left px-5 py-3 font-medium hidden md:table-cell">Dernière connexion</th>
									<th className="text-center px-5 py-3 font-medium w-20">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-dark-800">
								{admins.map((a) => (
									<tr key={a.id} className="hover:bg-dark-800/30 transition-colors">
										<td className="px-5 py-4">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-black text-dark-950 shrink-0">
													{a.username.charAt(0).toUpperCase()}
												</div>
												<div>
													<p className="text-sm font-medium text-white flex items-center gap-2 flex-wrap">
														{a.username}
														{a.id === currentAdminId && (
															<span className="text-[10px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded">
																Vous
															</span>
														)}
														{a.mustChangePassword && (
															<span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
																MDP à changer
															</span>
														)}
													</p>
													<p className="text-xs text-dark-400">{a.email}</p>
												</div>
											</div>
										</td>

										<td className="px-5 py-4 hidden sm:table-cell">
											<span className={`flex items-center gap-1.5 text-xs font-medium w-fit ${
												a.role === 'SUPER_ADMIN' ? 'text-brand-400' : 'text-dark-300'
											}`}>
												{a.role === 'SUPER_ADMIN'
													? <><ShieldCheck className="w-3.5 h-3.5" /> Super Admin</>
													: <><Shield className="w-3.5 h-3.5" /> Admin</>}
											</span>
										</td>

										<td className="px-5 py-4 hidden md:table-cell">
											<span className="text-xs text-dark-400">
												{a.lastLoginAt ? formatDateTime(a.lastLoginAt) : 'Jamais'}
											</span>
										</td>

										<td className="px-5 py-4">
											<AdminActions admin={a} isSelf={a.id === currentAdminId} />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	)
}
