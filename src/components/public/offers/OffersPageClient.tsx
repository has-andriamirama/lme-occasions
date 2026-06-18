// src/components/public/offers/OffersPageClient.tsx
'use client'
import { useState, useEffect, useCallback } from 'react'
import { Tag, Clock, Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import OfferCard from './OfferCard'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ── Filter options ─────────────────────────────────────────────────────────
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

// ── Main Component ─────────────────────────────────────────────────────────
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

	// Real-time: update car status in list when another user reserves

	//
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

	const set = (key: keyof Filters, value: string) => {
    setPage(1)
    setFilters((f) => ({ ...f, [key]: value }))
  }

  const reset = () => { setFilters(INIT_FILTERS); setPage(1) }
  const activeFiltersCount = Object.entries(filters).filter(
    ([k, v]) => v && v !== 'ALL' && v !== 'newest' && k !== 'sortBy'
  ).length











	/*const [allOffers, setAllOffers]     = useState<any[]>([])
	const [filtered, setFiltered]       = useState<any[]>([])
	const [loading, setLoading]         = useState(true)
	const [search, setSearch]           = useState('')
	const [status, setStatus]           = useState('ALL')
	const [type, setType]               = useState('')
	const [sortBy, setSortBy]           = useState('newest')
	const [showFilters, setShowFilters] = useState(false)
	const [page, setPage]               = useState(1)

	// Fetch ALL offers (public + inactive, using ?all=true)
	const fetchOffers = useCallback(async () => {
		setLoading(true)
		try {
			const res  = await fetch('/api/offers?all=true')
			const data = await res.json()
			if (data.success) setAllOffers(data.data)
		} catch {
			setAllOffers([])
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => { fetchOffers() }, [fetchOffers])

	// Client-side filter + sort
	useEffect(() => {
		const now = new Date()
		let result = [...allOffers]

		// Search
		if (search.trim()) {
			const q = search.toLowerCase()
			result = result.filter(
				(o) =>
					o.name.toLowerCase().includes(q) ||
					(o.description ?? '').toLowerCase().includes(q),
			)
		}

		// Status filter
		if (status === 'ACTIVE') {
			result = result.filter(
				(o) => o.isActive && new Date(o.startDate) <= now && new Date(o.endDate) >= now,
			)
		} else if (status === 'INACTIVE') {
			result = result.filter(
				(o) => !o.isActive || new Date(o.endDate) < now,
			)
		}

		// Type filter
		if (type) {
			result = result.filter((o) => o.type === type)
		}

		// Sort
		switch (sortBy) {
			case 'ending':
				result.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
				break
			case 'value_desc':
				result.sort((a, b) => {
					// normalise: PERCENTAGE is compared directly, FIXED vs PERCENTAGE can't really be compared, sort by value
					return b.value - a.value
				})
				break
			case 'value_asc':
				result.sort((a, b) => a.value - b.value)
				break
			default: // newest
				result.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
		}

		setFiltered(result)
		setPage(1)
	}, [allOffers, search, status, type, sortBy])

	const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
	const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

	const hasFilters  = search || status !== 'ALL' || type || sortBy !== 'newest'

	const reset = () => {
		setSearch('')
		setStatus('ALL')
		setType('')
		setSortBy('newest')
	}*/

	return (
		<div className="pt-24 pb-20 min-h-screen">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

				{/* ── Header ────────────────────────────────────────── */}
				<div className="mb-8">
					<p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-2">Promotions</p>
					<h1 className="font-display font-black text-3xl sm:text-4xl text-white mb-2">
						Toutes nos offres
					</h1>
					<p className="text-dark-400 text-sm">
						{loading ? 'Chargement...' : `${meta.total} offre${meta.total !== 1 ? 's' : ''} trouvée${meta.total !== 1 ? 's' : ''}`}
					</p>
				</div>

				{/* ── Search + sort row ──────────────────────────────────── */}
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
						className={cn('btn-secondary gap-2', activeFiltersCount && 'border-brand-500/50 text-brand-400')}
					>
						<SlidersHorizontal className="w-4 h-4" />
						Filtres
						{activeFiltersCount && (
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

				{/* ── Advanced filters ───────────────────────────────────── */}
				{showFilters && (
					<div className="card p-5 mb-6 animate-slide-down">
						<div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
							{/* Status */}
							<div>
								<label className="text-xs text-dark-400 font-semibold uppercase tracking-wider block mb-1.5">Statut</label>
								<select value={filters.status} onChange={(e) => set('status', e.target.value)} className="input-base text-sm">
									{STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</div>
							{/* Type */}
							<div>
								<label className="text-xs text-dark-400 font-semibold uppercase tracking-wider block mb-1.5">Type de réduction</label>
								<select value={filters.type} onChange={(e) => set('type', e.target.value)} className="input-base text-sm">
									{TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
								</select>
							</div>
						</div>
						{activeFiltersCount && (
							<button onClick={reset} className="btn-ghost text-xs text-red-400 hover:text-red-300">
								<X className="w-3.5 h-3.5" /> Réinitialiser les filtres
							</button>
						)}
					</div>
				)}

				{/* ── Grid ──────────────────────────────────────────────── */}
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
						{activeFiltersCount && (
							<button onClick={reset} className="btn-secondary mt-4">
								Réinitialiser les filtres
							</button>
						)}
					</div>
				) : (
					<>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
							{offers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
						</div>

						{/* Pagination */}
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
