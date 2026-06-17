// src/components/public/offers/OfferCard.tsx
'use client'
import Link from 'next/link'
import { Tag, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────
interface Offer {
	id: string
	name: string
	description?: string | null
	type: 'PERCENTAGE' | 'FIXED_AMOUNT'
	value: number
	startDate: string
	endDate: string
	isActive: boolean
	appliedToAll: boolean
	cars: Array<{ car: { id: string; title: string; brand: string; mainImage: string } }>
}

// ── Helpers ────────────────────────────────────────────────────────────────
function isOfferCurrentlyActive(offer: Offer): boolean {
	const now = new Date()
	return offer.isActive && new Date(offer.startDate) <= now && new Date(offer.endDate) >= now
}

export default function OfferCard({ offer }: { offer: Offer }) {
	const active   = isOfferCurrentlyActive(offer)
	const daysLeft = getDaysLeft(offer.endDate)

	return (
		<div className={cn(
			'relative bg-dark-800 border rounded-2xl p-6 overflow-hidden flex flex-col gap-4 transition-all duration-300',
			active
				? 'border-brand-500/30 hover:border-brand-500/50 hover:shadow-brand'
				: 'border-dark-700 opacity-70 hover:opacity-90',
		)}>
			{/* Glow */}
			{active && (
				<div className="absolute top-0 right-0 w-40 h-40 bg-brand-500/8 rounded-full blur-3xl -translate-y-10 translate-x-10 pointer-events-none" />
			)}

			<div className="relative flex items-start gap-4">
				{/* Icon */}
				<div className={cn(
					'flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border',
					active
						? 'bg-brand-500/15 border-brand-500/30'
						: 'bg-dark-700 border-dark-600',
				)}>
					<Tag className={cn('w-6 h-6', active ? 'text-brand-400' : 'text-dark-400')} />
				</div>

				{/* Badge status */}
				<div className="ml-auto flex-shrink-0">
					{active ? (
						<span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400
														 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
							<CheckCircle2 className="w-3 h-3" /> En cours
						</span>
					) : (
						<span className="inline-flex items-center gap-1 text-xs font-semibold text-dark-400
														 bg-dark-700 border border-dark-600 rounded-full px-2.5 py-1">
							<XCircle className="w-3 h-3" /> Expirée
						</span>
					)}
				</div>
			</div>

			{/* Content */}
			<div className="flex-1">
				<h3 className="font-display font-bold text-white text-lg mb-1 line-clamp-1">{offer.name}</h3>
				{offer.description && (
					<p className="text-sm text-dark-400 line-clamp-2 mb-3">{offer.description}</p>
				)}

				{/* Discount badge */}
				<div className={cn(
					'inline-flex items-center font-black text-2xl px-4 py-2 rounded-xl mb-3',
					active ? 'bg-brand-500 text-dark-950' : 'bg-dark-700 text-dark-300',
				)}>
					{offer.type === 'PERCENTAGE'
						? `-${offer.value}%`
						: `-${offer.value.toLocaleString('fr-FR')} €`}
				</div>
			</div>

			{/* Meta */}
			<div className="space-y-1.5 text-xs text-dark-500">
				<div className="flex items-center gap-2">
					<Clock className="w-3.5 h-3.5 flex-shrink-0" />
					{active
						? <span>Expire le <span className="text-dark-300">{formatDate(offer.endDate)}</span>
								{daysLeft <= 7 && (
									<span className="ml-1.5 text-amber-400 font-semibold">
										({daysLeft === 0 ? 'Aujourd\'hui !' : `J-${daysLeft}`})
									</span>
								)}
							</span>
						: <span>Expiré le {formatDate(offer.endDate)}</span>}
				</div>
				<div>
					{offer.appliedToAll
						? 'Applicable sur tous les véhicules'
						: `${offer.cars.length} véhicule(s) éligible(s)`}
				</div>
			</div>

			{/* CTA */}
			{active && (
				<Link
					href={`/cars?offerId=${offer.id}`}
					className="btn-primary w-full text-center mt-1"
				>
					Voir les véhicules →
				</Link>
			)}
		</div>
	)
}
