// src/app/(public)/contact/page.tsx
import type { Metadata } from 'next'
import ContactSection from '@/components/public/home/ContactSection'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contactez l\'équipe LME Occasions pour toute question sur nos véhicules.',
}

export default function ContactPage() {
  return (
    <div className="pt-20 min-h-screen">
      <div className="pt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <h1 className="font-display font-black text-3xl sm:text-4xl text-white">Contactez-nous</h1>
          <p className="text-dark-400 mt-2">Notre équipe est à votre disposition du lundi au vendredi 8h30 à 12h et de 14h à 17h ; le samedi de 8h30 à 12h.</p>
        </div>
        <ContactSection />
      </div>
    </div>
  )
}
