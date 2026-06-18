// src/components/public/home/OffersSection.tsx
import { Tag, Clock } from 'lucide-react'
import Link from 'next/link'
import OfferCard from '@/components/public/offers/OfferCard'
import { formatDate } from '@/lib/utils'

export function OffersSection({ offers }: { offers: any[] }) {
	return (
		<section id="offres" className="py-20 bg-dark-900/30">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-12">
					<p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-2">Promotions</p>
					<h2 className="font-display font-black text-3xl sm:text-4xl text-white mb-4">Offres en cours</h2>
					<p className="text-dark-400 max-w-xl mx-auto">Profitez de nos offres limitées pour acquérir votre véhicule au meilleur prix.</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{offers.map((offer) => (
						<OfferCard key={offer.id} offer={offer} />
					))}
				</div>

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
