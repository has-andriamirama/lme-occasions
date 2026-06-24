// src/components/admin/layout/AdminTopbar.tsx
'use client'
import { useEffect, useState } from 'react'
import { Bell, Search } from 'lucide-react'
import { getPusherClient, CHANNELS, EVENTS } from '@/lib/pusher'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Notification {
	id: string
	type: 'reservation' | 'contact'
	title: string
	subtitle: string
	href: string
	at: string
	read: boolean
}

interface Props {
	user: { name?: string | null; username: string; role: string }
}

export default function AdminTopbar({ user }: Props) {
	const [notifications, setNotifications] = useState<Notification[]>([])
	const [showDropdown, setShowDropdown]   = useState(false)
	const [search, setSearch]               = useState('')

	const unread = notifications.filter((n) => !n.read).length

	useEffect(() => {
		const pusher  = getPusherClient()
		const channel = pusher.subscribe(CHANNELS.admin)

		channel.bind(EVENTS.newReservation, (data: any) => {
			setNotifications((prev) => [{
				id:       crypto.randomUUID(),
				type:     'reservation',
				title:    'Nouvelle réservation',
				subtitle: `${data.clientName} — ${data.carTitle}`,
				href:     '/admin/reservations',
				at:       new Date().toISOString(),
				read:     false,
			}, ...prev.slice(0, 19)])
		})

		channel.bind(EVENTS.newContact, (data: any) => {
			setNotifications((prev) => [{
				id:       crypto.randomUUID(),
				type:     'contact',
				title:    'Nouveau message',
				subtitle: `Contact reçu — ${data.name ?? ''}`,
				href:     '/admin/contacts',
				at:       new Date().toISOString(),
				read:     false,
			}, ...prev.slice(0, 19)])
		})

		return () => {
			channel.unbind_all()
			pusher.unsubscribe(CHANNELS.admin)
		}
	}, [])

	function markAllRead() {
		setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
	}

	return (
		<header className="h-16 bg-dark-900/80 border-b border-dark-800 backdrop-blur-sm
											 flex items-center gap-4 px-6 shrink-0">
			<div className="flex-1 max-w-xs relative hidden sm:block">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
				<input
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Rechercher…"
					className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-9 pr-4 py-2
										 text-sm text-white placeholder-dark-500
										 focus:outline-none focus:border-brand-500/50 transition-colors"
				/>
			</div>

			<div className="flex-1" />

			<div className="relative">
				<button
					onClick={() => setShowDropdown((v) => !v)}
					className="relative p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-all"
				>
					<Bell className="w-5 h-5" />
					{unread > 0 && (
						<span className="absolute top-1 right-1 w-4 h-4 bg-brand-500 text-dark-950 text-[10px]
														 font-black rounded-full flex items-center justify-center">
							{unread > 9 ? '9+' : unread}
						</span>
					)}
				</button>

				{showDropdown && (
					<>
						<div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
						<div className="absolute right-0 top-full mt-2 w-80 bg-dark-800 border border-dark-700
														rounded-xl shadow-card-lg z-20 overflow-hidden">
							<div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
								<span className="text-sm font-semibold text-white">Notifications</span>
								{unread > 0 && (
									<button onClick={markAllRead} className="text-xs text-brand-400 hover:text-brand-300">
										Tout lire
									</button>
								)}
							</div>
							<div className="max-h-80 overflow-y-auto divide-y divide-dark-700">
								{notifications.length === 0 ? (
									<p className="text-center text-sm text-dark-400 py-8">Aucune notification</p>
								) : notifications.map((n) => (
									<Link
										key={n.id}
										href={n.href}
										onClick={() => {
											setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))
											setShowDropdown(false)
										}}
										className={cn(
											'flex items-start gap-3 px-4 py-3 hover:bg-dark-700 transition-colors block',
											!n.read && 'bg-brand-500/5'
										)}
									>
										{!n.read && <div className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0 mt-2" />}
										<div className="flex-1 min-w-0">
											<p className="text-xs font-semibold text-white">{n.title}</p>
											<p className="text-xs text-dark-400 truncate mt-0.5">{n.subtitle}</p>
											<p className="text-[11px] text-dark-500 mt-1">{formatDateTime(n.at)}</p>
										</div>
									</Link>
								))}
							</div>
						</div>
					</>
				)}
			</div>

			<div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center shrink-0">
				<span className="text-xs font-black text-dark-950">
					{user.username.charAt(0).toUpperCase()}
				</span>
			</div>
		</header>
	)
}
