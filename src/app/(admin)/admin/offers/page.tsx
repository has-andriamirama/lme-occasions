// src/app/(admin)/admin/offers/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import prisma from '@/lib/db'
import { Plus, Tag } from 'lucide-react'
import {
	formatPrice, formatDate, getOfferStatus, getOfferStatusLabel,
	getOfferStatusColor, getOfferStatusDot, type OfferStatusComputed,
} from '@/lib/utils'
import AdminOfferActions from '@/components/admin/offers/AdminOfferActions'

export const metadata: Metadata = { title: 'Offres & Promotions' }

export default async function OffersPage({
	searchParams,
}: {
	searchParams: { status?: string; page?: string }
}) {
	const page   = Math.max(1, Number(searchParams.page ?? 1))
	const limit  = 15
	const status = (searchParams.status ?? '') as OfferStatusComputed | ''
	const now    = new Date()

	const where: Record<string, unknown> = {}
	if (status === 'ACTIVE') {
		where.isActive  = true
		where.startDate = { lte: now }
		where.endDate   = { gte: now }
	}
	if (status === 'PAUSED') {
		where.isActive = false
		where.endDate  = { gte: now }
	}
	if (status === 'SCHEDULED') {
		where.isActive  = true
		where.startDate = { gt: now }
	}
	if (status === 'EXPIRED') {
		where.endDate = { lt: now }
	}

	const [offers, total] = await Promise.all([
		prisma.offer.findMany({
			where,
			include: { _count: { select: { cars: true } } },
			orderBy: { createdAt: 'desc' },
			skip: (page - 1) * limit,
			take: limit,
		}),
		prisma.offer.count({ where }),
	])
	const totalPages = Math.ceil(total / limit)

	return (
		<div className="space-y-6 max-w-7xl">
			{/* Header */}
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-display font-bold text-white">Offres & Promotions</h1>
					<p className="text-dark-400 text-sm mt-0.5">{total} offre{total !== 1 ? 's' : ''}</p>
				</div>
				<Link href="/admin/offers/new" className="btn-primary">
					<Plus className="w-4 h-4" />
					Créer une offre
				</Link>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap gap-2">
				{[
					{ label: 'Toutes',      value: '' },
					{ label: 'Actives',     value: 'ACTIVE' },
					{ label: 'Programmées', value: 'SCHEDULED' },
					{ label: 'En pause',    value: 'PAUSED' },
					{ label: 'Expirées',    value: 'EXPIRED' },
				].map(({ label, value }) => (
					<Link
						key={value}
						href={`/admin/offers${value ? `?status=${value}` : ''}`}
						className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border
							${status === value
								? 'bg-brand-500/10 text-brand-400 border-brand-500/30'
								: 'bg-dark-800 text-dark-400 border-dark-700 hover:text-white hover:border-dark-600'}`}
					>
						{label}
					</Link>
				))}
			</div>

			{/* Table */}
			<div className="card overflow-hidden">
				{offers.length === 0 ? (
					<div className="text-center py-16">
						<p className="text-dark-400">Aucune offre trouvée</p>
						<Link href="/admin/offers/new" className="btn-primary mt-4 inline-flex">
							<Plus className="w-4 h-4" /> Créer une offre
						</Link>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-dark-700 text-xs text-dark-400 uppercase tracking-wider">
									<th className="text-left px-4 py-3 font-medium w-10"></th>
									<th className="text-left px-4 py-3 font-medium">Offre</th>
									<th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Réduction</th>
									<th className="text-left px-4 py-3 font-medium hidden md:table-cell">Période</th>
									<th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Véhicules</th>
									<th className="text-center px-4 py-3 font-medium">Statut</th>
									<th className="text-center px-4 py-3 font-medium w-32">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-dark-800">
								{offers.map((offer) => {
									const computed = getOfferStatus(offer, now)
									return (
										<tr key={offer.id} className="hover:bg-dark-800/30 transition-colors group">
											{/* Icon */}
											<td className="px-4 py-3">
												<div className="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
													<Tag className="w-4 h-4 text-brand-400" />
												</div>
											</td>
											{/* Name + description */}
											<td className="px-4 py-3">
												<p className="text-sm font-medium text-white">{offer.name}</p>
												{offer.description && (
													<p className="text-xs text-dark-400 line-clamp-1 max-w-xs">{offer.description}</p>
												)}
											</td>
											{/* Discount */}
											<td className="px-4 py-3 text-right hidden sm:table-cell">
												<span className="badge bg-brand-500/10 text-brand-400 border-brand-500/20 font-bold">
													{offer.type === 'PERCENTAGE' ? `-${offer.value}%` : `-${formatPrice(offer.value)}`}
												</span>
											</td>
											{/* Period */}
											<td className="px-4 py-3 hidden md:table-cell">
												<span className="text-sm text-dark-300 whitespace-nowrap">
													{formatDate(offer.startDate)} - {formatDate(offer.endDate)}
												</span>
											</td>
											{/* Cars */}
											<td className="px-4 py-3 hidden lg:table-cell">
												<span className="text-sm text-dark-400">
													{offer.appliedToAll ? 'Tous les véhicules' : `${offer._count.cars} véhicule${offer._count.cars !== 1 ? 's' : ''}`}
												</span>
											</td>
											{/* Status */}
											<td className="px-4 py-3 text-center">
												<span className={`badge ${getOfferStatusColor(computed)}`}>
													<span className={`status-dot ${getOfferStatusDot(computed)}`} />
													{getOfferStatusLabel(computed)}
												</span>
											</td>
											{/* Actions */}
											<td className="px-4 py-3">
												<AdminOfferActions
													offerId={offer.id}
													offerName={offer.name}
													status={computed}
													isActive={offer.isActive}
												/>
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-center gap-2">
					{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
						<Link key={p} href={`/admin/offers?page=${p}${status ? `&status=${status}` : ''}`}
							className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all
								${p === page ? 'bg-brand-500 text-dark-950' : 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700'}`}>
							{p}
						</Link>
					))}
				</div>
			)}
		</div>
	)
}
