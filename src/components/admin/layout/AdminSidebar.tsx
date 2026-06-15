// src/components/admin/layout/AdminSidebar.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Car, Tag, Calendar, MessageSquare,
  Users, Settings, ChevronLeft, ChevronRight, LogOut, Bell
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin/dashboard',    label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/admin/cars',         label: 'Véhicules',       icon: Car },
  { href: '/admin/offers',       label: 'Offres',          icon: Tag },
  { href: '/admin/reservations', label: 'Réservations',    icon: Calendar },
  { href: '/admin/contacts',     label: 'Messages',        icon: MessageSquare },
  { href: '/admin/admins',       label: 'Administrateurs', icon: Users, superOnly: true },
  { href: '/admin/settings',     label: 'Paramètres',      icon: Settings },
]

interface Props {
  user: { name?: string | null; username: string; role: string }
}

export default function AdminSidebar({ user }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'relative h-full bg-dark-900 border-r border-dark-800 flex flex-col transition-all duration-300 z-20',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 border-b border-dark-800 px-4 shrink-0 overflow-hidden',
        collapsed ? 'justify-center' : 'gap-3'
      )}>
        <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shrink-0">
          <Car className="w-4 h-4 text-dark-950" />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm font-display font-black tracking-wider text-brand-gradient leading-none">
              LME OCCASIONS
            </div>
            <div className="text-[10px] text-dark-500 tracking-widest uppercase mt-0.5">Admin</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {NAV.map(({ href, label, icon: Icon, superOnly }) => {
          if (superOnly && user.role !== 'SUPER_ADMIN') return null
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800'
              )}
            >
              <Icon className={cn('w-4.5 h-4.5 shrink-0', active ? 'text-brand-400' : '')} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="shrink-0 border-t border-dark-800 p-3 space-y-2">
        {/* User info */}
        {!collapsed && (
          <div className="px-2 py-2">
            <div className="text-xs font-medium text-white truncate">{user.username}</div>
            <div className="text-[11px] text-dark-500 capitalize">{user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}</div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          title={collapsed ? 'Déconnexion' : undefined}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium',
            'text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-dark-800 border border-dark-700
                   flex items-center justify-center text-dark-400 hover:text-white
                   hover:border-brand-500/50 transition-all duration-150 z-10"
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3" />
          : <ChevronLeft  className="w-3 h-3" />}
      </button>
    </aside>
  )
}
