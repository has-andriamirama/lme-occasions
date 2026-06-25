// src/app/(admin)/admin/cars/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import prisma from '@/lib/db'
import { Plus, Star } from 'lucide-react'
import { formatPrice, formatMileage, getStatusLabel, getStatusColor } from '@/lib/utils'
import { getActiveOffersInclude } from '@/lib/queries'
import AdminCarsActions from '@/components/admin/cars/AdminCarsActions'
import AdminPageHeader from '@/components/admin/shared/AdminPageHeader'
import AdminFilterTabs from '@/components/admin/shared/AdminFilterTabs'
import AdminPagination from '@/components/admin/shared/AdminPagination'

export const metadata: Metadata = { title: 'Gestion des véhicules' }

export default async function AdminCarsPage({
	searchParams,
}: {
	searchParams: { status?: string; page?: string; search?: string }
}) {
	const page   = Math.max(1, Number(searchParams.page ?? 1))
	const limit  = 15
	const status = searchParams.status ?? ''
	const search = searchParams.search ?? ''

	const where: Record<string, unknown> = {}
	if (status && status !== 'ALL') where.status = status
	if (search) {
		where.OR = [
			{ title: { contains: search, mode: 'insensitive' } },
			{ brand: { contains: search, mode: 'insensitive' } },
			{ model: { contains: search, mode: 'insensitive' } },
		]
	}

	const [cars, total] = await Promise.all([
		prisma.car.findMany({
			where,
			include: {
				offers: getActiveOffersInclude(),
				_count:  { select: { reservations: true } },
			},
			orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
			skip:  (page - 1) * limit,
			take:  limit,
		}),
		prisma.car.count({ where }),
	])
	const totalPages = Math.ceil(total / limit)

	return (
		<div className="space-y-6 min-w-0">
			<AdminPageHeader
				title="Véhicules"
				subtitle={`${total} véhicule${total !== 1 ? 's' : ''}`}
				action={
					<Link href="/admin/cars/new" className="btn-primary">
						<Plus className="w-4 h-4" />
						Ajouter un véhicule
					</Link>
				}
			/>

			<AdminFilterTabs tabs={[
				{ label: 'Tous',        href: '/admin/cars',                  active: status === '' },
				{ label: 'Disponibles', href: '/admin/cars?status=AVAILABLE', active: status === 'AVAILABLE' },
				{ label: 'Réservés',    href: '/admin/cars?status=RESERVED',  active: status === 'RESERVED' },
				{ label: 'Vendus',      href: '/admin/cars?status=SOLD',      active: status === 'SOLD' },
			]} />

			<div className="card overflow-hidden">
				{cars.length === 0 ? (
					<div className="text-center py-16">
						<p className="text-dark-400 text-sm mb-4">Aucun véhicule</p>
						<Link href="/admin/cars/new" className="btn-primary inline-flex">
							<Plus className="w-4 h-4" /> Ajouter un véhicule
						</Link>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-dark-700 text-xs text-dark-400 uppercase tracking-wider">
									<th className="text-left px-4 py-3 font-medium">Véhicule</th>
									<th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Prix</th>
									<th className="text-right px-4 py-3 font-medium hidden md:table-cell">Km</th>
									<th className="text-center px-4 py-3 font-medium">Statut</th>
									<th className="text-center px-4 py-3 font-medium w-28">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-dark-800">
								{cars.map((car) => (
									<tr key={car.id} className="hover:bg-dark-800/30 transition-colors">
										<td className="px-4 py-3">
											<div className="flex items-center gap-3">
												<div className="w-14 h-10 rounded-lg bg-dark-700 overflow-hidden shrink-0">
													{car.mainImage && (
														<Image src={car.mainImage} alt={car.title} width={56} height={40}
															className="w-full h-full object-cover" />
													)}
												</div>
												<div className="min-w-0">
													<p className="text-sm font-medium text-white truncate max-w-[200px] flex items-center gap-1.5">
														{car.isFeatured && <Star className="w-3 h-3 text-brand-400 shrink-0" />}
														{car.title}
													</p>
													<p className="text-xs text-dark-500">{car.year} · {car.brand}</p>
												</div>
											</div>
										</td>
										<td className="px-4 py-3 text-right hidden sm:table-cell">
											<p className="text-sm font-bold text-white">{formatPrice(car.price)}</p>
											{car.offers.length > 0 && (
												<p className="text-xs text-brand-400">
													-{car.offers[0].offer.type === 'PERCENTAGE'
														? `${car.offers[0].offer.value}%`
														: formatPrice(car.offers[0].offer.value)}
												</p>
											)}
										</td>
										<td className="px-4 py-3 text-right text-sm text-dark-300 hidden md:table-cell">
											{formatMileage(car.mileage)}
										</td>
										<td className="px-4 py-3 text-center">
											<span className={`badge ${getStatusColor(car.status)}`}>
												{getStatusLabel(car.status)}
											</span>
										</td>
										<td className="px-4 py-3">
											<AdminCarsActions
												carId={car.id}
												carTitle={car.title}
												status={car.status}
											/>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<AdminPagination
				page={page}
				totalPages={totalPages}
				buildHref={(p) => `/admin/cars?page=${p}${status ? `&status=${status}` : ''}`}
			/>
		</div>
	)
}
