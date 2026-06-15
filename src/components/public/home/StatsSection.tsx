// src/components/public/home/StatsSection.tsx
import { Car, TrendingUp, Shield, Users } from 'lucide-react'

interface Props { stats: { total: number; sold: number; available: number } }

export default function StatsSection({ stats }: Props) {
  const items = [
    { icon: Car,       value: `${stats.total}+`,     label: 'Véhicules référencés' },
    { icon: TrendingUp, value: `${stats.sold}+`,     label: 'Ventes réussies' },
    { icon: Shield,    value: '100%',                label: 'Contrôles qualité' },
    { icon: Users,     value: '5★',                  label: 'Satisfaction client' },
  ]
  return (
    <section className="py-16 bg-gradient-to-r from-brand-600/10 via-brand-500/5 to-brand-600/10 border-y border-brand-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {items.map(({ icon: Icon, value, label }) => (
            <div key={label}>
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-brand-400" />
                </div>
              </div>
              <p className="font-display font-black text-3xl text-white mb-1">{value}</p>
              <p className="text-sm text-dark-400">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
