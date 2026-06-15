// src/components/public/layout/PublicFooter.tsx
import Link from 'next/link'
import { Car, MapPin, Phone, Mail, Facebook, Instagram, Twitter } from 'lucide-react'

export default function PublicFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-dark-900 border-t border-dark-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
                <Car className="w-4 h-4 text-dark-950" />
              </div>
              <span className="font-display font-black tracking-widest text-brand-gradient">LME OCCASIONS</span>
            </div>
            <p className="text-dark-400 text-sm leading-relaxed mb-5">
              Votre spécialiste de la vente de voitures d'occasion premium. Sélection rigoureuse, qualité garantie.
            </p>
            {/* Social */}
            <div className="flex items-center gap-3">
              {[
                { icon: Facebook,  href: '#', label: 'Facebook' },
                { icon: Instagram, href: '#', label: 'Instagram' },
                { icon: Twitter,   href: '#', label: 'Twitter' },
              ].map(({ icon: Icon, href, label }) => (
                <a key={label} href={href} aria-label={label}
                  className="w-9 h-9 rounded-lg bg-dark-800 border border-dark-700 flex items-center justify-center
                             text-dark-400 hover:text-brand-400 hover:border-brand-500/40 transition-all">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Navigation</h3>
            <ul className="space-y-2.5">
              {[
                { href: '/',       label: 'Accueil' },
                { href: '/cars',   label: 'Nos véhicules' },
                { href: '/#offres', label: 'Offres en cours' },
                { href: '/contact', label: 'Contact' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-dark-400 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Légal</h3>
            <ul className="space-y-2.5">
              {[
                { href: '/cgv',             label: 'Conditions générales de vente' },
                { href: '/confidentialite', label: 'Politique de confidentialité' },
                { href: '/mentions-legales', label: 'Mentions légales' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-dark-400 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">Nous trouver</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-dark-400">
                <MapPin className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
                <span>62 Bd du Chaudron<br />Centre d'Affaires Cadgee<br />97490 Sainte-Clotilde, La Réunion</span>
              </li>
              <li>
                <a href="tel:+262693405407"
                  className="flex items-center gap-3 text-sm text-dark-400 hover:text-white transition-colors">
                  <Phone className="w-4 h-4 text-brand-400 shrink-0" />
                  06 92 40 54 07
                </a>
              </li>
              <li>
                <a href="mailto:contact@lmeoccasions.com"
                  className="flex items-center gap-3 text-sm text-dark-400 hover:text-white transition-colors">
                  <Mail className="w-4 h-4 text-brand-400 shrink-0" />
                  contact@lmeoccasions.com
                </a>
              </li>
            </ul>
            <div className="mt-4 p-3 bg-dark-800 rounded-lg border border-dark-700">
              <p className="text-xs text-dark-400 font-medium">Horaires d'ouverture</p>
              <p className="text-xs text-white mt-1">Lun – Ven : 8h30 – 12h / 14h – 17h</p>
              <p className="text-xs text-white mt-1">Sam : 8h30 – 12h</p>
              <p className="text-xs text-dark-500 mt-1">Dimanche : Fermé</p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-dark-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-dark-500">
            © {year} EXXE. Tous droits réservés.
          </p>
          <p className="text-xs text-dark-600">
            Fait avec ❤️ · Paiement sécurisé Stripe
          </p>
        </div>
      </div>
    </footer>
  )
}
