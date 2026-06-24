// src/app/(admin)/admin/settings/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Lock, Bell, FileText } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ChangePasswordButton from '@/components/admin/settings/ChangePasswordButton'

export const metadata: Metadata = { title: 'Paramètres' }

export default async function SettingsPage() {
	const session = await getServerSession(authOptions)

	return (
		<div className="space-y-6 max-w-7xl">
			<div>
				<h1 className="text-2xl font-display font-bold text-white">Paramètres</h1>
				<p className="text-dark-400 text-sm mt-0.5">Gérez votre compte et les préférences du site.</p>
			</div>

			<div className="card p-6">
				<h2 className="font-display font-semibold text-white mb-4 text-sm uppercase tracking-widest">Mon compte</h2>
				<div className="flex items-center gap-4">
					<div className="w-14 h-14 rounded-full bg-gradient-brand flex items-center justify-center text-xl font-black text-dark-950">
						{session?.user.username.charAt(0).toUpperCase()}
					</div>
					<div>
						<p className="font-semibold text-white">{session?.user.username}</p>
						<p className="text-sm text-dark-400">{session?.user.email}</p>
						<p className="text-xs text-brand-400 mt-0.5 capitalize">
							{session?.user.role === 'SUPER_ADMIN' ? 'Super Administrateur' : 'Administrateur'}
						</p>
					</div>
				</div>
			</div>

			<div className="space-y-3">
				<div className="card p-5 flex items-center gap-4">
					<div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center shrink-0">
						<Lock className="w-5 h-5 text-brand-400" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="font-semibold text-white text-sm">Sécurité</p>
						<p className="text-xs text-dark-400 mt-0.5">Modifier votre mot de passe administrateur.</p>
					</div>
					<ChangePasswordButton />
				</div>

				<div className="card p-5 flex items-center gap-4">
					<div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center shrink-0">
						<Bell className="w-5 h-5 text-brand-400" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="font-semibold text-white text-sm">Notifications</p>
						<p className="text-xs text-dark-400 mt-0.5">Configurer les alertes emails et les notifications admin.</p>
					</div>
					<span className="badge bg-dark-700 text-dark-500 border-dark-600 shrink-0">Bientôt disponible</span>
				</div>

				<div className="card p-5 flex items-center gap-4">
					<div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center shrink-0">
						<FileText className="w-5 h-5 text-brand-400" />
					</div>
					<div className="flex-1 min-w-0">
						<p className="font-semibold text-white text-sm">Audit</p>
						<p className="text-xs text-dark-400 mt-0.5">Consulter l&apos;historique des actions administrateurs.</p>
					</div>
					<Link href="/admin/settings/audit" className="btn-secondary text-xs px-4 py-2 shrink-0">Voir les logs</Link>
				</div>
			</div>
		</div>
	)
}
