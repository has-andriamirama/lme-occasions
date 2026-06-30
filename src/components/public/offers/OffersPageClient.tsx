// src/components/public/offers/OffersPageClient.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Tag, Clock, Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import OfferCard from './OfferCard'
import { cn, getOfferStatus } from '@/lib/utils'
import { useNow } from '@/hooks/useNow'
import { useOfferUpdates } from '@/hooks/useOfferUpdates'

const STATUS_OPTIONS = [
	{ value: 'ALL',      label: 'Toutes' },
	{ value: 'ACTIVE',   label: 'En cours' },
	{ value: 'INACTIVE', label: 'Expirées / Inactives' },
]

const TYPE_OPTIONS = [
	{ value: '',             label: 'Tous types' },
	{ value: 'PERCENTAGE',   label: 'Pourcentage (%)' },
	{ value: 'FIXED_AMOUNT', label: 'Montant fixe (€)' },
]

const SORT_OPTIONS = [
	{ value: 'newest',     label: 'Plus récentes' },
	{ value: 'ending',     label: 'Expire bientôt' },
	{ value: 'value_desc', label: 'Réduction (haute)' },
	{ value: 'value_asc',  label: 'Réduction (basse)' },
]

interface Filters { search: string; status: string; type: string; sortBy: string }

const INIT_FILTERS: Filters = { search: '', status: 'ALL', type: '', sortBy: 'newest' }

export default function OffersPageClient() {
	const searchParams = useSearchParams()

	const [filters, setFilters] = useState<Filters>(() => ({
		...INIT_FILTERS,
	}))

	const [offers, setOffers]           = useState<any[]>([])
	const [meta, setMeta]               = useState({ total: 0, page: 1, totalPages: 1 })
	const [loading, setLoading]         = useState(true)
	const [showFilters, setShowFilters] = useState(false)
	const [page, setPage]               = useState(1)

	const fetchOffers = useCallback(async (f: Filters, p: number) => {
		setLoading(true)
		try {
			const params = new URLSearchParams()
			params.set('page', p.toString())
			params.set('limit', '12')
			if (f.search)                       params.set('search', f.search)
			if (f.status && f.status !== 'ALL') params.set('status', f.status)
			if (f.type)                         params.set('type', f.type)
			params.set('sortBy', f.sortBy)

			const res  = await fetch(`/api/offers?${params}`)
			const data = await res.json()
			if (data.success) { setOffers(data.data); setMeta(data.meta) }
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => { fetchOffers(filters, page) }, [filters, page, fetchOffers])

	const now = useNow(15000)

	useOfferUpdates({
		onCreate: (offer) => {
			if (page !== 1) return
			if (filters.sortBy !== 'newest') return

			const normalized = {
				...offer,
				startDate: new Date(offer.startDate),
				endDate:   new Date(offer.endDate),
				cars:      offer.carIds.map((id: string) => ({ car: { id } })),
			}

			const isActive = getOfferStatus(normalized, now) === 'ACTIVE'

			if (filters.status === 'ACTIVE' && !isActive) return
			if (filters.status === 'INACTIVE' && isActive) return

			if (filters.type && normalized.type !== filters.type) return

			if (filters.search) {
				const q = filters.search.toLowerCase()
				const matched =
					normalized.name?.toLowerCase().includes(q) ||
					normalized.description?.toLowerCase().includes(q)
				if (!matched) return
			}

			setOffers((prev) => {
				if (prev.some((o) => o.id === normalized.id)) return prev
				setMeta((m) => ({ ...m, total: m.total + 1 }))
				return [normalized, ...prev]
			})
		},
		onChange: (offer) => {
			setOffers((prev) => {
				const idx = prev.findIndex((o) => o.id === offer.id)
				if (idx === -1) return prev

				const normalized = {
					...offer,
					startDate: new Date(offer.startDate),
					endDate:   new Date(offer.endDate),
					cars:      offer.carIds.map((id: string) => ({ car: { id } })),
				}

				const next = [...prev]
				next[idx]  = { ...next[idx], ...normalized }
				return next
			})
		},
		onDelete: (offerId) => {
			setOffers((prev) => {
				const wasPresent = prev.some((o) => o.id === offerId)
				if (wasPresent) setMeta((m) => ({ ...m, total: Math.max(0, m.total - 1) }))
				return prev.filter((o) => o.id !== offerId)
			})
		},
	})
	
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

				<div className="mb-8">
					<p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-2">Promotions</p>
					<h1 className="font-display font-black text-3xl sm:text-4xl text-white mb-2">
						Toutes nos offres
					</h1>
					<p className="text-dark-400 text-sm">
						{loading ? 'Chargement...' : `${meta.total} offre${meta.total !== 1 ? 's' : ''} trouvée${meta.total !== 1 ? 's' : ''}`}
					</p>
				</div>

				<div className="flex flex-col sm:flex-row gap-3 mb-4">
					<div className="relative flex-1">
						<Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
						<input
							value={filters.search}
							onChange={(e) => set('search', e.target.value)}
							placeholder="Rechercher une offre..."
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
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
							<div>
								<label className="text-xs text-dark-400 font-semibold uppercase tracking-wider block mb-1.5">Statut</label>
								<select value={filters.status} onChange={(e) => set('status', e.target.value)} className="input-base text-sm">
									{STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</div>
							<div>
								<label className="text-xs text-dark-400 font-semibold uppercase tracking-wider block mb-1.5">Type de réduction</label>
								<select value={filters.type} onChange={(e) => set('type', e.target.value)} className="input-base text-sm">
									{TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
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
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="rounded-2xl bg-dark-800 border border-dark-700 p-6 space-y-4">
								<div className="h-10 w-10 shimmer rounded-xl" />
								<div className="h-5 w-2/3 shimmer rounded" />
								<div className="h-4 w-full shimmer rounded" />
								<div className="h-10 w-1/3 shimmer rounded-xl" />
							</div>
						))}
					</div>
				) : offers.length === 0 ? (
					<div className="text-center py-20">
						<Tag className="w-12 h-12 text-dark-600 mx-auto mb-4" />
						<p className="text-dark-400 text-lg mb-2">Aucune offre trouvée</p>
						{activeFiltersCount > 0 && (
							<button onClick={reset} className="btn-secondary mt-4">
								Réinitialiser les filtres
							</button>
						)}
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
							{offers.map((offer) => <OfferCard key={offer.id} offer={offer} now={now} />)}
						</div>

						{meta.totalPages > 1 && (
							<div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
								{Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
									<button
										key={p}
										onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
										className={cn(
											'w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium transition-all',
											p === page
												? 'bg-brand-500 text-dark-950 shadow-brand'
												: 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700 border border-dark-700',
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
