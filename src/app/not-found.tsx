// src/app/not-found.tsx
import Link from 'next/link'
import { Car, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark-950 flex flex-col items-center justify-center p-6 text-center">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                        w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative animate-fade-in-up">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-brand-500/10 border border-brand-500/20
                        flex items-center justify-center mx-auto mb-8">
          <Car className="w-10 h-10 text-brand-400" />
        </div>

        {/* 404 */}
        <div className="font-display font-black text-[120px] sm:text-[160px] leading-none
                        text-brand-gradient mb-2 select-none">
          404
        </div>

        <h1 className="font-display font-bold text-2xl sm:text-3xl text-white mb-3">
          Page introuvable
        </h1>
        <p className="text-dark-400 max-w-sm mx-auto mb-10 text-sm leading-relaxed">
          Il semblerait que cette page ait pris la route. Elle n'existe pas ou a été déplacée.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/" className="btn-primary px-6">
            <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
          </Link>
          <Link href="/cars" className="btn-secondary px-6">
            Voir nos véhicules
          </Link>
        </div>
      </div>
    </div>
  )
}
