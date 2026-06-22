// src/components/public/cars/CarsPageClient.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X, ChevronDown, Tag, Clock, ArrowLeft } from 'lucide-react'
import CarCard from './CarCard'
import { useCarUpdates } from '@/hooks/useCarUpdates'
import { useOfferUpdates, type OfferBroadcastPayload } from '@/hooks/useOfferUpdates'
import { cn, formatDate, getOfferStatus, getOfferStatusLabel } from '@/lib/utils'
import type { OfferWithCars } from '@/types'

const SORT_OPTIONS = [
	{ value: 'newest',      label: 'Plus récents' },
	{ value: 'price_asc',   label: 'Prix croissant' },
	{ value: 'price_desc',  label: 'Prix décroissant' },
	{ value: 'year_desc',   label: 'Année (récente)' },
	{ value: 'mileage_asc', label: 'Km (faible)' },
]

const FUEL_OPTIONS = [
	{ value: '',          label: 'Tous' },
	{ value: 'GASOLINE',  label: 'Essence' },
	{ value: 'DIESEL',    label: 'Diesel' },
	{ value: 'ELECTRIC',  label: 'Électrique' },
	{ value: 'HYBRID',    label: 'Hybride' },
]
const TRANS_OPTIONS = [
	{ value: '',          label: 'Toutes' },
	{ value: 'MANUAL',    label: 'Manuelle' },
	{ value: 'AUTOMATIC', label: 'Automatique' },
]
const STATUS_OPTIONS = [
	{ value: 'ALL',       label: 'Tous' },
	{ value: 'AVAILABLE', label: 'Disponibles' },
	{ value: 'RESERVED',  label: 'Réservés' },
	{ value: 'SOLD',      label: 'Vendus' },
]

interface Filters {
	search: string; brand: string; status: string; fuelType: string;
	transmission: string; minPrice: string; maxPrice: string;
	minYear: string; maxYear: string; maxMileage: string; sortBy: string; offerId: string;
}

const INIT_FILTERS: Filters = {
	search: '', brand: '', status: 'ALL', fuelType: '', transmission: '',
	minPrice: '', maxPrice: '', minYear: '', maxYear: '', maxMileage: '', sortBy: 'newest', offerId: '',
}

const OFFER_STATUS_COLORS = {
	ACTIVE:    'text-emerald-400',
	PAUSED:    'text-amber-400',
	SCHEDULED: 'text-blue-400',
	EXPIRED:   'text-red-400',
} as const

function applyOfferChange(cars: any[], offer: OfferBroadcastPayload): any[] {
	return cars.map((car) => {
		const isTargeted  = offer.carIds.includes(car.id)
		const existingIdx = (car.offers as Array<{ offer: any }>).findIndex((o) => o.offer.id === offer.id)

		if (isTargeted) {
			const existing = car.offers[existingIdx]?.offer
			const updatedOffer = {
				id:           offer.id,
				name:         offer.name,
				description:  offer.description,
				type:         offer.type,
				value:        offer.value,
				startDate:    new Date(offer.startDate),
				endDate:      new Date(offer.endDate),
				isActive:     offer.isActive,
				appliedToAll: offer.appliedToAll,
				createdAt:    existing?.createdAt ?? new Date(),
				updatedAt:    new Date(),
			}

			if (existingIdx !== -1) {
				const updatedOffers = [...car.offers]
				updatedOffers[existingIdx] = { offer: updatedOffer }
				return { ...car, offers: updatedOffers }
			}
			return { ...car, offers: [...car.offers, { offer: updatedOffer }] }
		}

		if (existingIdx !== -1) {
			return { ...car, offers: car.offers.filter((o: any) => o.offer.id !== offer.id) }
		}

		return car
	})
}

export default function CarsPageClient({ brands }: { brands: string[] }) {
	const searchParams = useSearchParams()

	const [filters, setFilters] = useState<Filters>(() => ({
		...INIT_FILTERS,
		offerId: searchParams.get('offerId') ?? '',
	}))

	const [cars, setCars]                 = useState<any[]>([])
	const [meta, setMeta]                 = useState({ total: 0, page: 1, totalPages: 1 })
	const [loading, setLoading]           = useState(true)
	const [showFilters, setShowFilters]   = useState(false)
	const [page, setPage]                 = useState(1)
	const [offer, setOffer]               = useState<OfferWithCars | null>(null)
	const [loadingOffer, setLoadingOffer] = useState(false)

	useCarUpdates({
		onChange: (updatedCar) => {
			setCars((prev) => prev.map((c) => (c.id === updatedCar.id ? { ...c, ...updatedCar } : c)))
		},
		onDelete: (carId) => {
			const wasPresent = cars.some((c) => c.id === carId)
			setCars((prev) => prev.filter((c) => c.id !== carId))
			if (wasPresent) {
				setMeta((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }))
			}
		},
	})

	useOfferUpdates({
		onChange: (incoming) => {
			setCars((prev) => applyOfferChange(prev, incoming))

			if (filters.offerId === incoming.id) {
				setOffer((prev) =>
					prev
						? {
								...prev,
								name:         incoming.name,
								description:  incoming.description,
								type:         incoming.type as any,
								value:        incoming.value,
								startDate:    new Date(incoming.startDate),
								endDate:      new Date(incoming.endDate),
								isActive:     incoming.isActive,
								appliedToAll: incoming.appliedToAll,
								
								cars: incoming.appliedToAll
									? prev.cars
									: prev.cars.filter((c) => incoming.carIds.includes(c.car.id)),
							}
						: null
				)
			}
		},
		onDelete: (offerId) => {
			setCars((prev) =>
				prev.map((car) => ({
					...car,
					offers: car.offers.filter((o: any) => o.offer.id !== offerId),
				}))
			)
			if (filters.offerId === offerId) {
				setOffer(null)
			}
		},
	})

	useEffect(() => {
		if (!filters.offerId) {
			setOffer(null)
			return
		}
		setLoadingOffer(true)
		fetch(`/api/offers/${filters.offerId}`)
			.then((r) => r.json())
			.then((data) => {
				if (data.success && data.offer) {
					setOffer(data.offer ?? null)
				} else {
					setOffer(null)
				}
			})
			.catch(() => setOffer(null))
			.finally(() => setLoadingOffer(false))
	}, [filters.offerId])

	const fetchCars = useCallback(async (f: Filters, p: number) => {
		setLoading(true)
		try {
			const params = new URLSearchParams()
			params.set('page', p.toString())
			params.set('limit', '12')
			if (f.search)       params.set('search', f.search)
			if (f.brand)        params.set('brand', f.brand)
			if (f.status && f.status !== 'ALL') params.set('status', f.status)
			if (f.fuelType)     params.set('fuelType', f.fuelType)
			if (f.transmission) params.set('transmission', f.transmission)
			if (f.minPrice)     params.set('minPrice', f.minPrice)
			if (f.maxPrice)     params.set('maxPrice', f.maxPrice)
			if (f.minYear)      params.set('minYear', f.minYear)
			if (f.maxYear)      params.set('maxYear', f.maxYear)
			if (f.maxMileage)   params.set('maxMileage', f.maxMileage)
			if (f.offerId)      params.set('offerId', f.offerId)
			params.set('sortBy', f.sortBy)

			const res  = await fetch(`/api/cars?${params}`)
			const data = await res.json()
			if (data.success) { setCars(data.data); setMeta(data.meta) }
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => { fetchCars(filters, page) }, [filters, page, fetchCars])

	const set = (key: keyof Filters, value: string) => {
		setPage(1)
		setFilters((f) => ({ ...f, [key]: value }))
	}

	const reset = () => { setFilters(INIT_FILTERS); setPage(1) }
	const activeFiltersCount = Object.entries(filters).filter(
		([k, v]) => v && v !== 'ALL' && v !== 'newest' && k !== 'sortBy'
	).length

	return (
		<div className="pt-24 pb-20 min-h-screen">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

				{filters.offerId && (
					<div className="mb-8">
						{loadingOffer ? (
							<div className="rounded-2xl bg-dark-800 border border-brand-500/20 p-6 animate-pulse">
								<div className="h-5 w-1/3 shimmer rounded mb-3" />
								<div className="h-4 w-1/2 shimmer rounded" />
							</div>
						) : offer ? (() => {
							const now           = new Date()
							const offerStatus   = getOfferStatus(offer, now)
							const statusLabel   = getOfferStatusLabel(offerStatus)
							const statusColor   = OFFER_STATUS_COLORS[offerStatus]

							return (
								<div className="relative rounded-2xl bg-dark-800 border border-brand-500/30 overflow-hidden shadow-brand">
									<div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl -translate-y-16 translate-x-16 pointer-events-none" />
									<div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-500/5 rounded-full blur-2xl translate-y-12 -translate-x-12 pointer-events-none" />

									<div className="relative p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-6">
										<div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-brand-500/15 border border-brand-500/30
																		flex items-center justify-center">
											<Tag className="w-6 h-6 text-brand-400" />
										</div>

										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2 mb-1">
												<span className={`text-xs font-bold uppercase tracking-widest ${statusColor}`}>
													{statusLabel}
												</span>
												<span className="inline-flex items-center gap-1 bg-brand-500 text-dark-950 font-black text-sm px-2.5 py-0.5 rounded-lg">
													{offer.type === 'PERCENTAGE'
														? `-${offer.value}%`
														: `-${offer.value.toLocaleString('fr-FR')} €`}
												</span>
											</div>

											<h2 className="font-display font-black text-xl sm:text-2xl text-white mb-1 truncate">
												{offer.name}
											</h2>

											{offer.description && (
												<p className="text-sm text-dark-400 line-clamp-2 mb-2">{offer.description}</p>
											)}

											<div className="flex flex-wrap items-center gap-4 text-xs text-dark-500">
												<span className="flex items-center gap-2">
													<Clock className="w-3.5 h-3.5 text-brand-500/70" />
													<span>Expire le <span className="text-dark-300">{formatDate(offer.endDate)}</span></span>
												</span>
												<span>
													{offer.appliedToAll
														? 'Applicable sur tous les véhicules'
														: `Applicable sur ${offer.cars.length} véhicule${offer.cars.length !== 1 ? 's' : ''}`}
												</span>
											</div>
										</div>

										<div className="flex-shrink-0">
											<Link href="/offers" className="btn-secondary text-sm shrink-0">
												<ArrowLeft className="w-4 h-4" />
												Voir toutes les offres
											</Link>
										</div>
									</div>
								</div>
							)
						})() : null}
					</div>
				)}

				<div className="mb-8">
					<p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-2">Notre sélection</p>
					<h1 className="font-display font-black text-3xl sm:text-4xl text-white mb-2">
						{filters.offerId ? `Véhicules — ${offer ? offer.name : ''}` : 'Notre catalogue'}
					</h1>
					<p className="text-dark-400 text-sm">
						{loading ? 'Chargement...' : `${meta.total} véhicule${meta.total !== 1 ? 's' : ''} trouvé${meta.total !== 1 ? 's' : ''}`}
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-3 mb-4">
					<div className="relative flex-1">
						<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
						<input
							value={filters.search}
							onChange={(e) => set('search', e.target.value)}
							placeholder="Rechercher une marque, un modèle..."
							className="input-base pl-10"
						/>
					</div>

					<button
						onClick={() => setShowFilters((v) => !v)}
						className={cn('btn-secondary gap-2', activeFiltersCount > 0 && 'border-brand-500/50 text-brand-400')}
					>
						<SlidersHorizontal className="w-4 h-4" />
						Filtres
						{activeFiltersCount > 0 && (
							<span className="w-5 h-5 rounded-full bg-brand-500 text-dark-950 text-xs font-black flex items-center justify-center">
								{activeFiltersCount}
							</span>
						)}
					</button>

					<div className="relative">
						<select
							value={filters.sortBy}
							onChange={(e) => set('sortBy', e.target.value)}
							className="input-base pr-8 appearance-none cursor-pointer min-w-[160px]"
						>
							{SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
						</select>
						<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 pointer-events-none" />
					</div>
				</div>

				{showFilters && (
					<div className="card p-5 mb-6 animate-slide-down">
						<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
							<div>
								<label className="text-xs text-dark-400 font-semibold uppercase tracking-wider block mb-1.5">Marque</label>
								<select value={filters.brand} onChange={(e) => set('brand', e.target.value)} className="input-base text-sm">
									<option value="">Toutes</option>
									{brands.map((b) => <option key={b} value={b}>{b}</option>)}
								</select>
							</div>
							<div>
								<label className="text-xs text-dark-400 font-semibold uppercase tracking-wider block mb-1.5">Statut</label>
								<select value={filters.status} onChange={(e) => set('status', e.target.value)} className="input-base text-sm">
									{STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</div>
							<div>
								<label className="text-xs text-dark-400 font-semibold uppercase tracking-wider block mb-1.5">Carburant</label>
								<select value={filters.fuelType} onChange={(e) => set('fuelType', e.target.value)} className="input-base text-sm">
									{FUEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</div>
							<div>
								<label className="text-xs text-dark-400 font-semibold uppercase tracking-wider block mb-1.5">Boîte</label>
								<select value={filters.transmission} onChange={(e) => set('transmission', e.target.value)} className="input-base text-sm">
									{TRANS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</div>
							<div>
								<label className="text-xs text-dark-400 font-semibold uppercase tracking-wider block mb-1.5">Km max</label>
								<input
									type="number" value={filters.maxMileage}
									onChange={(e) => set('maxMileage', e.target.value)}
									placeholder="200000" className="input-base text-sm" min={0}
								/>
							</div>
							<div>
								<label className="text-xs text-dark-400 font-semibold uppercase tracking-wider block mb-1.5">Prix min (€)</label>
								<input
									type="number" value={filters.minPrice}
									onChange={(e) => set('minPrice', e.target.value)}
									placeholder="0" className="input-base text-sm" min={0}
								/>
							</div>
							<div>
								<label className="text-xs text-dark-400 font-semibold uppercase tracking-wider block mb-1.5">Prix max (€)</label>
								<input
									type="number" value={filters.maxPrice}
									onChange={(e) => set('maxPrice', e.target.value)}
									placeholder="100000" className="input-base text-sm" min={0}
								/>
							</div>
							<div>
								<label className="text-xs text-dark-400 font-semibold uppercase tracking-wider block mb-1.5">Année min</label>
								<input
									type="number" value={filters.minYear}
									onChange={(e) => set('minYear', e.target.value)}
									placeholder="2015" className="input-base text-sm" min={1900} max={2030}
								/>
							</div>
							<div>
								<label className="text-xs text-dark-400 font-semibold uppercase tracking-wider block mb-1.5">Année max</label>
								<input
									type="number" value={filters.maxYear}
									onChange={(e) => set('maxYear', e.target.value)}
									placeholder={String(new Date().getFullYear())} className="input-base text-sm" min={1900} max={2030}
								/>
							</div>
						</div>
						{activeFiltersCount > 0 && (
							<button onClick={reset} className="btn-ghost text-xs text-red-400 hover:text-red-300">
								<X className="w-3.5 h-3.5" /> Réinitialiser les filtres
							</button>
						)}
					</div>
				)}

				{loading ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{Array.from({ length: 8 }).map((_, i) => (
							<div key={i} className="rounded-2xl bg-dark-800 border border-dark-700 overflow-hidden">
								<div className="aspect-[16/10] shimmer" />
								<div className="p-5 space-y-3">
									<div className="h-3 w-1/3 shimmer rounded" />
									<div className="h-4 w-2/3 shimmer rounded" />
									<div className="h-3 w-1/2 shimmer rounded" />
								</div>
							</div>
						))}
					</div>
				) : cars.length === 0 ? (
					<div className="text-center py-20">
						<p className="text-dark-400 text-lg mb-2">Aucun véhicule trouvé</p>
						<button onClick={reset} className="btn-secondary mt-4">Réinitialiser les filtres</button>
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger">
							{cars.map((car) => <CarCard key={car.id} car={car} />)}
						</div>

						{meta.totalPages > 1 && (
							<div className="flex items-center justify-center gap-2 mt-10">
								{Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
									<button
										key={p}
										onClick={() => setPage(p)}
										className={cn(
											'w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium transition-all',
											p === page
												? 'bg-brand-500 text-dark-950 shadow-brand'
												: 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700 border border-dark-700'
										)}
									>
										{p}
									</button>
								))}
							</div>
						)}
					</>
				)}
			</div>
		</div>
	)
}
