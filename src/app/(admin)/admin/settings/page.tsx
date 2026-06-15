// src/app/(admin)/admin/settings/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Lock, Bell, Database, FileText } from 'lucide-react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const metadata: Metadata = { title: 'Paramètres' }

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)

  const sections = [
    {
      icon: Lock,
      title: 'Sécurité',
      description: 'Modifier votre mot de passe administrateur.',
      href: '/admin/settings/change-password',
      label: 'Changer le mot de passe',
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Configurer les alertes emails et les notifications admin.',
      href: '#',
      label: 'Bientôt disponible',
      disabled: true,
    },
    {
      icon: FileText,
      title: 'Audit',
      description: 'Consulter l\'historique des actions administrateurs.',
      href: '/admin/settings/audit',
      label: 'Voir les logs',
    },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Paramètres</h1>
        <p className="text-dark-400 text-sm mt-0.5">Gérez votre compte et les préférences du site.</p>
      </div>

      {/* Account card */}
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

      {/* Settings sections */}
      <div className="space-y-3">
        {sections.map(({ icon: Icon, title, description, href, label, disabled }) => (
          <div key={title} className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-brand-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm">{title}</p>
              <p className="text-xs text-dark-400 mt-0.5">{description}</p>
            </div>
            {disabled ? (
              <span className="badge bg-dark-700 text-dark-500 border-dark-600 shrink-0">{label}</span>
            ) : (
              <Link href={href} className="btn-secondary text-xs px-4 py-2 shrink-0">{label}</Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
