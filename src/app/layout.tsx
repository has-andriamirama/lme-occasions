// src/app/layout.tsx
import type { Metadata } from 'next'
import { Syne, Outfit, JetBrains_Mono } from 'next/font/google'
import '@/styles/globals.css'
import { Providers } from '@/components/providers'

const syne = Syne({
	subsets: ['latin'],
	variable: '--font-syne',
	display: 'swap',
	weight: ['400', '500', '600', '700', '800'],
})
const outfit = Outfit({
	subsets: ['latin'],
	variable: '--font-outfit',
	display: 'swap',
	weight: ['300', '400', '500', '600', '700'],
})
const jetbrainsMono = JetBrains_Mono({
	subsets: ['latin'],
	variable: '--font-jetbrains-mono',
	display: 'swap',
	weight: ['400', '500'],
})

export const metadata: Metadata = {
	metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
	title: {
		default: 'LME Occasions — Voitures d\'occasion premium',
		template: '%s | LME Occasions',
	},
	description: 'LME Occasions — Spécialiste de la vente de voitures d\'occasion sélectionnées. Trouvez votre prochain véhicule parmi notre sélection de qualité. Réservez en ligne, livraison possible.',
	keywords: ['voitures occasion', 'auto occasion', 'LME Occasions', 'achat voiture', 'véhicule premium'],
	openGraph: {
		type: 'website',
		locale: 'fr_FR',
		siteName: 'LME Occasions',
		title: 'LME Occasions — Voitures d\'occasion premium',
		description: 'Trouvez votre prochain véhicule parmi notre sélection de voitures d\'occasion de qualité.',
		images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'LME Occasions' }],
	},
	twitter: { card: 'summary_large_image' },
	robots: { index: true, follow: true },
	themeColor: '#0A0A0B',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang="fr"
			className={`${syne.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
			suppressHydrationWarning
		>
			<body className="font-body antialiased bg-dark-950 text-white min-h-screen">
				<Providers>{children}</Providers>
			</body>
		</html>
	)
}
