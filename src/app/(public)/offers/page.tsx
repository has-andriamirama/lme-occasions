// src/app/(public)/offers/page.tsx
import type { Metadata } from 'next'
import OffersPageClient from '@/components/public/offers/OffersPageClient'

export const metadata: Metadata = {
	title: 'Toutes nos offres — LME Occasions',
	description: 'Consultez l\'ensemble de nos promotions et offres spéciales sur nos véhicules d\'occasion.',
}

export default function OffersPage() {
	return <OffersPageClient />
}
