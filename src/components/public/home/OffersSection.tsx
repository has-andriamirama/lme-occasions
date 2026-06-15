// src/components/public/home/OffersSection.tsx
import { Tag, Clock } from 'lucide-react'
import Link from 'next/link'
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
            <div key={offer.id}
              className="relative bg-dark-800 border border-brand-500/20 rounded-2xl p-6 overflow-hidden group
                         hover:border-brand-500/40 hover:shadow-brand transition-all duration-300">
              {/* Background glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl -translate-y-8 translate-x-8" />

              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-4">
                  <Tag className="w-5 h-5 text-brand-400" />
                </div>
                <h3 className="font-display font-bold text-white text-lg mb-2">{offer.name}</h3>
                {offer.description && (
                  <p className="text-sm text-dark-400 mb-4 line-clamp-2">{offer.description}</p>
                )}

                {/* Discount badge */}
                <div className="inline-flex items-center gap-1.5 bg-brand-500 text-dark-950 font-black text-xl px-4 py-2 rounded-xl mb-4">
                  {offer.type === 'PERCENTAGE' ? `-${offer.value}%` : `-${offer.value} €`}
                </div>

                {/* Expiry */}
                <div className="flex items-center gap-2 text-xs text-dark-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expire le {formatDate(offer.endDate)}</span>
                </div>

                {/* Vehicles count */}
                {offer.cars.length > 0 && (
                  <p className="text-xs text-dark-400 mt-2">
                    Applicable sur {offer.appliedToAll ? 'tous les véhicules' : `${offer.cars.length} véhicule(s)`}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/cars?hasOffer=true" className="btn-secondary">
            Voir les véhicules en promotion →
          </Link>
        </div>
      </div>
    </section>
  )
}

export default OffersSection
