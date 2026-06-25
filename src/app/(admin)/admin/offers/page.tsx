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
import AdminPageHeader  from '@/components/admin/shared/AdminPageHeader'
import AdminFilterTabs  from '@/components/admin/shared/AdminFilterTabs'
import AdminPagination  from '@/components/admin/shared/AdminPagination'

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
	if (status === 'ACTIVE')    { where.isActive = true;  where.startDate = { lte: now }; where.endDate = { gte: now } }
	if (status === 'PAUSED')    { where.isActive = false; where.endDate = { gte: now } }
	if (status === 'SCHEDULED') { where.isActive = true;  where.startDate = { gt: now } }
	if (status === 'EXPIRED')   { where.endDate = { lt: now } }

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
		<div className="space-y-6 min-w-0">
			<AdminPageHeader
				title="Offres & Promotions"
				subtitle={`${total} offre${total !== 1 ? 's' : ''}`}
				action={
					<Link href="/admin/offers/new" className="btn-primary">
						<Plus className="w-4 h-4" />
						Créer une offre
					</Link>
				}
			/>

			<AdminFilterTabs tabs={[
				{ label: 'Toutes',      href: '/admin/offers',                  active: status === '' },
				{ label: 'Actives',     href: '/admin/offers?status=ACTIVE',    active: status === 'ACTIVE' },
				{ label: 'Programmées', href: '/admin/offers?status=SCHEDULED', active: status === 'SCHEDULED' },
				{ label: 'En pause',    href: '/admin/offers?status=PAUSED',    active: status === 'PAUSED' },
				{ label: 'Expirées',    href: '/admin/offers?status=EXPIRED',   active: status === 'EXPIRED' },
			]} />

			<div className="card overflow-hidden">
				{offers.length === 0 ? (
					<div className="text-center py-16">
						<Tag className="w-10 h-10 text-dark-600 mx-auto mb-3" />
						<p className="text-dark-400 text-sm mb-4">Aucune offre</p>
						<Link href="/admin/offers/new" className="btn-primary inline-flex">
							<Plus className="w-4 h-4" /> Créer une offre
						</Link>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-dark-700 text-xs text-dark-400 uppercase tracking-wider">
									<th className="text-left px-4 py-3 font-medium">Offre</th>
									<th className="text-center px-4 py-3 font-medium hidden sm:table-cell">Type</th>
									<th className="text-right px-4 py-3 font-medium hidden md:table-cell">Valeur</th>
									<th className="text-center px-4 py-3 font-medium hidden lg:table-cell">Période</th>
									<th className="text-center px-4 py-3 font-medium hidden lg:table-cell">Véhicules</th>
									<th className="text-center px-4 py-3 font-medium">Statut</th>
									<th className="text-center px-4 py-3 font-medium w-28">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-dark-800">
								{offers.map((offer) => {
									const computed = getOfferStatus(offer)
									return (
										<tr key={offer.id} className="hover:bg-dark-800/30 transition-colors">
											<td className="px-4 py-3">
												<p className="text-sm font-medium text-white">{offer.name}</p>
												{offer.description && (
													<p className="text-xs text-dark-500 truncate max-w-[200px]">{offer.description}</p>
												)}
											</td>
											<td className="px-4 py-3 text-center hidden sm:table-cell">
												<span className="text-xs text-dark-300">
													{offer.type === 'PERCENTAGE' ? '%' : 'Fixe'}
												</span>
											</td>
											<td className="px-4 py-3 text-right hidden md:table-cell">
												<span className="text-sm font-bold text-white">
													{offer.type === 'PERCENTAGE'
														? `${offer.value}%`
														: formatPrice(offer.value)}
												</span>
											</td>
											<td className="px-4 py-3 text-center hidden lg:table-cell">
												<p className="text-xs text-dark-400">{formatDate(offer.startDate)}</p>
												<p className="text-xs text-dark-600">→ {formatDate(offer.endDate)}</p>
											</td>
											<td className="px-4 py-3 text-center hidden lg:table-cell">
												<span className="text-sm text-dark-300">
													{offer.appliedToAll ? 'Tous' : offer._count.cars}
												</span>
											</td>
											<td className="px-4 py-3 text-center">
												<span className={`badge flex items-center gap-1.5 w-fit mx-auto ${getOfferStatusColor(computed)}`}>
													<span className={`w-1.5 h-1.5 rounded-full ${getOfferStatusDot(computed)}`} />
													{getOfferStatusLabel(computed)}
												</span>
											</td>
											<td className="px-4 py-3">
												<AdminOfferActions
													offerId={offer.id}
													offerName={offer.name}
													computedStatus={computed}
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

			<AdminPagination
				page={page}
				totalPages={totalPages}
				buildHref={(p) => `/admin/offers?page=${p}${status ? `&status=${status}` : ''}`}
			/>
		</div>
	)
}
