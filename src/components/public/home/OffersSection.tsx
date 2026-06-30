// src/components/public/home/OffersSection.tsx
'use client'
import { useMemo, useState } from 'react'
import { Tag, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import OfferCard from '@/components/public/offers/OfferCard'
import { useNow } from '@/hooks/useNow'
import { useOfferUpdates } from '@/hooks/useOfferUpdates'
import { getOfferStatus } from '@/lib/utils'

const MAX_HOME_OFFERS = 3

export function OffersSection({ offers: initialOffers }: { offers: any[] }) {
	const [offers, setOffers] = useState<any[]>(initialOffers)

	const now = useNow(15000)

	useOfferUpdates({
		onCreate: (offer) => {
			setOffers((prev) => {
				if (prev.some((o) => o.id === offer.id)) return prev

				const incoming = {
					...offer,
					cars: offer.carIds.map((id: string) => ({ car: { id } })),
				}
				const isActive = getOfferStatus(incoming, now) === 'ACTIVE'

				if (isActive && prev.length < MAX_HOME_OFFERS) {
					return [...prev, incoming]
				}
				return prev
			})
		},
		onChange: (offer) => {
			setOffers((prev) => {
				const idx = prev.findIndex((o) => o.id === offer.id)
				if (idx === -1) return prev

				const incoming = {
					...offer,
					cars: offer.carIds.map((id: string) => ({ car: { id } })),
				}
				const isNowActive = getOfferStatus(incoming, now) === 'ACTIVE'

				if (!isNowActive) {
					return prev.filter((o) => o.id !== offer.id)
				}
				const next = [...prev]
				next[idx] = { ...next[idx], ...incoming }
				return next
			})
		},
		onDelete: (offerId) => {
			setOffers((prev) => prev.filter((o) => o.id !== offerId))
		},
	})

	const activeOffers = useMemo(
		() => offers.filter((offer) => getOfferStatus(offer, now) === 'ACTIVE'),
		[offers, now],
	)

	return (
		<section id="offres" className="py-20 bg-dark-900/30">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-12">
					<p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-2">Promotions</p>
					<h2 className="font-display font-black text-3xl sm:text-4xl text-white mb-4">Offres en cours</h2>
					<p className="text-dark-400 max-w-xl mx-auto">Profitez de nos offres limitées pour acquérir votre véhicule au meilleur prix.</p>
				</div>

				{activeOffers.length > 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{activeOffers.map((offer) => (
							<OfferCard key={offer.id} offer={offer} now={now} />
						))}
					</div>
				) : (
					<div className="text-center py-14 rounded-2xl border border-dashed border-dark-700 bg-dark-800/40">
						<Tag className="w-10 h-10 text-dark-600 mx-auto mb-3" />
						<p className="text-dark-400">Aucune offre en cours</p>
					</div>
				)}

				<div className="text-center mt-10">
					<Link href="/offers" className="btn-secondary text-sm">
						Voir toutes les offres <ArrowRight className="w-4 h-4" />
					</Link>
				</div>
			</div>
		</section>
	)
}

export default OffersSection
