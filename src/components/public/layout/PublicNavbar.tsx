// src/components/public/layout/PublicNavbar.tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Car, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/#vehicules', label: 'Véhicules' },
  { href: '/#offres',    label: 'Offres' },
  { href: '/contact',    label: 'Contact' },
]

export default function PublicNavbar() {
  const [scrolled, setScrolled]   = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header className={cn(
      'fixed top-0 inset-x-0 z-40 transition-all duration-300',
      scrolled
        ? 'bg-dark-900/95 backdrop-blur-md border-b border-dark-800 shadow-card'
        : 'bg-transparent'
    )}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
            <Car className="w-4 h-4 text-dark-950" />
          </div>
          <span className="text-base font-display font-black tracking-widest text-brand-gradient">
            LME OCCASIONS
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link href={href}
                className="px-4 py-2 rounded-lg text-sm font-medium text-dark-300 hover:text-white hover:bg-dark-800 transition-all">
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <a href="tel:+262693405407"
            className="flex items-center gap-2 text-sm font-medium text-dark-300 hover:text-white transition-colors">
            <Phone className="w-4 h-4" />
            <span>06 93 40 54 07</span>
          </a>
          <Link href="/cars" className="btn-primary text-sm px-5 py-2.5">
            Voir les véhicules
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-800 transition-all">
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-dark-900/98 backdrop-blur-md border-b border-dark-800">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 rounded-lg text-sm font-medium text-dark-300 hover:text-white hover:bg-dark-800 transition-all">
                {label}
              </Link>
            ))}
            <div className="pt-3 border-t border-dark-800 mt-3">
              <Link href="/cars" onClick={() => setMenuOpen(false)} className="btn-primary w-full justify-center text-sm">
                Voir les véhicules
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
