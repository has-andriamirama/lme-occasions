// src/app/(admin)/admin/dashboard/page.tsx
import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { startOfMonth } from 'date-fns'
import {
	Car, TrendingUp, Calendar, MessageSquare,
	CheckCircle2, Clock, XCircle, DollarSign
} from 'lucide-react'
import { formatPrice, formatDateTime, getStatusColor, getStatusLabel } from '@/lib/utils'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = { title: 'Tableau de bord' }

async function getStats() {
	const monthStart = startOfMonth(new Date())
	const [
		totalCars, availableCars, reservedCars, soldCars,
		totalReservations, activeReservations, pendingContacts,
		totalRevenueAgg, monthlyRevenueAgg, recentReservations, recentContacts,
	] = await Promise.all([
		prisma.car.count(),
		prisma.car.count({ where: { status: 'AVAILABLE' } }),
		prisma.car.count({ where: { status: 'RESERVED' } }),
		prisma.car.count({ where: { status: 'SOLD' } }),
		prisma.reservation.count(),
		prisma.reservation.count({ where: { status: { in: ['PAID', 'CONFIRMED'] } } }),
		prisma.contact.count({ where: { isRead: false } }),
		prisma.reservation.aggregate({ where: { status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] } }, _sum: { depositAmount: true } }),
		prisma.reservation.aggregate({ where: { status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] }, reservedAt: { gte: monthStart } }, _sum: { depositAmount: true } }),
		prisma.reservation.findMany({
			where: { status: { in: ['PAID', 'CONFIRMED', 'COMPLETED', 'EXPIRED'] } },
			include: { car: { select: { title: true, brand: true, mainImage: true } } },
			orderBy: { reservedAt: 'desc' },
			take: 5,
		}),
		prisma.contact.findMany({ where: { isRead: false }, orderBy: { createdAt: 'desc' }, take: 5 }),
	])
	return { totalCars, availableCars, reservedCars, soldCars, totalReservations, activeReservations, pendingContacts,
		totalRevenue: totalRevenueAgg._sum.depositAmount ?? 0,
		monthlyRevenue: monthlyRevenueAgg._sum.depositAmount ?? 0,
		recentReservations, recentContacts }
}

const RESERVATION_STATUS_ICONS: Record<string, React.ReactNode> = {
	PENDING:   <Clock className="w-4 h-4 text-amber-400" />,
	PAID:      <DollarSign className="w-4 h-4 text-blue-400" />,
	CONFIRMED: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
	COMPLETED: <CheckCircle2 className="w-4 h-4 text-brand-400" />,
	EXPIRED:   <XCircle className="w-4 h-4 text-red-400" />,
	CANCELLED: <XCircle className="w-4 h-4 text-dark-400" />,
}

export default async function DashboardPage() {
	const session = await getServerSession(authOptions)
	const stats   = await getStats()

	const kpis = [
		{ label: 'Véhicules total',   value: stats.totalCars,       icon: Car,           color: 'brand',   href: '/admin/cars' },
		{ label: 'Disponibles',       value: stats.availableCars,   icon: CheckCircle2,  color: 'emerald', href: '/admin/cars?status=AVAILABLE' },
		{ label: 'Réservés',          value: stats.reservedCars,    icon: Clock,         color: 'amber',   href: '/admin/cars?status=RESERVED' },
		{ label: 'Vendus',            value: stats.soldCars,        icon: TrendingUp,    color: 'blue',    href: '/admin/cars?status=SOLD' },
		{ label: 'Réservations act.', value: stats.activeReservations, icon: Calendar,   color: 'purple',  href: '/admin/reservations' },
		{ label: 'Messages non lus',  value: stats.pendingContacts, icon: MessageSquare, color: 'pink',    href: '/admin/contacts' },
		{ label: 'Revenus total',     value: formatPrice(stats.totalRevenue),  icon: DollarSign, color: 'brand', href: '/admin/reservations', isText: true },
		{ label: 'Ce mois',           value: formatPrice(stats.monthlyRevenue), icon: DollarSign, color: 'emerald', href: '/admin/reservations', isText: true },
	]

	const colorMap: Record<string, string> = {
		brand:   'text-brand-400 bg-brand-500/10 border-brand-500/20',
		emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
		amber:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
		blue:    'text-blue-400 bg-blue-500/10 border-blue-500/20',
		purple:  'text-purple-400 bg-purple-500/10 border-purple-500/20',
		pink:    'text-pink-400 bg-pink-500/10 border-pink-500/20',
	}

	return (
		<div className="space-y-8 max-w-7xl">
			<div>
				<h1 className="text-2xl font-display font-bold text-white">
					Bonjour, {session?.user.username} 👋
				</h1>
				<p className="text-dark-400 text-sm mt-1">
					Voici un résumé de votre activité
				</p>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger">
				{kpis.map(({ label, value, icon: Icon, color, href, isText }) => (
					<Link key={label} href={href}
						className="card p-5 hover:border-dark-600 transition-all duration-200 hover:-translate-y-0.5 group"
					>
						<div className="flex items-start justify-between mb-3">
							<div className={`p-2 rounded-lg border ${colorMap[color]}`}>
								<Icon className="w-4 h-4" />
							</div>
						</div>
						<div className={`text-2xl font-display font-bold ${isText ? 'text-lg' : ''} text-white mb-1 group-hover:text-brand-400 transition-colors`}>
							{value}
						</div>
						<div className="text-xs text-dark-400 font-medium">{label}</div>
					</Link>
				))}
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="card overflow-hidden">
					<div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
						<h2 className="font-display font-semibold text-white text-sm">Dernières réservations</h2>
						<Link href="/admin/reservations" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
							Voir tout
						</Link>
					</div>
					<div className="divide-y divide-dark-800">
						{stats.recentReservations.length === 0 ? (
							<p className="text-center text-sm text-dark-500 py-8">Aucune réservation</p>
						) : stats.recentReservations.map((r) => (
							<Link key={r.id} href="/admin/reservations"
								className="flex items-center gap-4 px-6 py-3 hover:bg-dark-800/50 transition-colors"
							>
								<div className="w-10 h-10 rounded-lg bg-dark-700 overflow-hidden shrink-0">
									{r.car.mainImage && (
										<Image src={r.car.mainImage} alt={r.car.title} width={40} height={40}
											className="w-full h-full object-cover" />
									)}
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-white truncate">{r.car.title}</p>
									<p className="text-xs text-dark-400 truncate">{r.clientName} · {formatDateTime(r.reservedAt)}</p>
								</div>
								<div className="shrink-0">{RESERVATION_STATUS_ICONS[r.status]}</div>
							</Link>
						))}
					</div>
				</div>

				<div className="card overflow-hidden">
					<div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
						<h2 className="font-display font-semibold text-white text-sm">Messages non lus</h2>
						<Link href="/admin/contacts" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
							Voir tout
						</Link>
					</div>
					<div className="divide-y divide-dark-800">
						{stats.recentContacts.length === 0 ? (
							<p className="text-center text-sm text-dark-500 py-8">Aucun message non lu</p>
						) : stats.recentContacts.map((c) => (
							<Link key={c.id} href="/admin/contacts"
								className="flex items-start gap-4 px-6 py-3 hover:bg-dark-800/50 transition-colors"
							>
								<div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center shrink-0 text-sm font-bold text-brand-400">
									{c.name.charAt(0).toUpperCase()}
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-white">{c.name}</p>
									<p className="text-xs text-dark-400 truncate">{c.message}</p>
									<p className="text-[11px] text-dark-500 mt-1">{formatDateTime(c.createdAt)}</p>
								</div>
								<span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0 mt-2" />
							</Link>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
