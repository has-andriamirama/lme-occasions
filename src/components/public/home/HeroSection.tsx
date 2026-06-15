// src/components/public/home/HeroSection.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, Shield, Star, Zap } from 'lucide-react'

const BG_IMAGES = [
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1920&q=80',
  'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1920&q=80',
  'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=1920&q=80',
]

interface Props {
  stats: { total: number; sold: number; available: number }
}

export default function HeroSection({ stats }: Props) {
  const [bgIdx, setBgIdx] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setBgIdx((i) => (i + 1) % BG_IMAGES.length), 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image slider */}
      {BG_IMAGES.map((src, i) => (
        <div key={src} className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === bgIdx ? 1 : 0 }}>
          <img src={src} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-dark-950/60 via-dark-950/40 to-dark-950" />
        </div>
      ))}

      {/* Noise overlay */}
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E")` }} />

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/30
                        rounded-full px-4 py-1.5 text-xs font-semibold text-brand-400 mb-6 animate-fade-in">
          <Star className="w-3.5 h-3.5" fill="currentColor" />
          <span>N°1 de la vente automobile premium</span>
        </div>

        {/* Headline */}
        <h1 className="font-display font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl
                       text-white leading-[1.05] tracking-tight mb-6 animate-fade-in-up">
          Votre prochain véhicule
          <br />
          <span className="text-brand-gradient">vous attend ici</span>
        </h1>

        <p className="text-lg text-dark-300 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
          style={{ animationDelay: '0.1s' }}>
          Découvrez notre sélection exclusive de véhicules d'occasion haut de gamme.
          Chaque voiture est soigneusement contrôlée et garantie.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14 animate-fade-in-up"
          style={{ animationDelay: '0.2s' }}>
          <Link href="/cars" className="btn-primary px-8 py-4 text-base shadow-brand-lg">
            Explorer nos véhicules
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/contact" className="btn-secondary px-8 py-4 text-base">
            Nous contacter
          </Link>
        </div>

        {/* Stats bar */}
        <div className="inline-flex items-center gap-6 sm:gap-10 bg-dark-900/80 backdrop-blur-md
                        border border-dark-700 rounded-2xl px-8 py-5 animate-fade-in-up"
          style={{ animationDelay: '0.3s' }}>
          {[
            { label: 'Véhicules',   value: stats.total + '+', icon: Zap },
            { label: 'Vendus',      value: stats.sold + '+',  icon: Star },
            { label: 'Disponibles', value: stats.available,   icon: Shield },
          ].map(({ label, value, icon: Icon }, i) => (
            <div key={label} className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Icon className="w-4 h-4 text-brand-400" />
                <span className="text-xl sm:text-2xl font-display font-black text-white">{value}</span>
              </div>
              <p className="text-xs text-dark-400 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Slide indicators */}
        <div className="flex items-center justify-center gap-2 mt-10">
          {BG_IMAGES.map((_, i) => (
            <button key={i} onClick={() => setBgIdx(i)}
              className={`transition-all duration-300 rounded-full
                ${i === bgIdx ? 'w-8 h-1.5 bg-brand-400' : 'w-1.5 h-1.5 bg-dark-600 hover:bg-dark-400'}`}
            />
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <ChevronDown className="w-6 h-6 text-dark-400" />
      </div>
    </section>
  )
}
