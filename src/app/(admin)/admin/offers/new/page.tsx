// src/app/(admin)/admin/offers/new/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import prisma from '@/lib/db'
import OfferForm from '@/components/admin/offers/OfferForm'

export const metadata: Metadata = { title: 'Créer une offre' }

export default async function NewOfferPage() {
	const availableCars = await prisma.car.findMany({
		where:   { status: 'AVAILABLE' },
		select:  { id: true, title: true, brand: true, model: true, year: true },
		orderBy: { brand: 'asc' },
	})

	return (
		<div className="space-y-6 max-w-4xl">
			<div className="flex items-center gap-3">
				<Link href="/admin/offers" className="btn-ghost p-2">
					<ChevronLeft className="w-5 h-5" />
				</Link>
				<div>
					<h1 className="text-2xl font-display font-bold text-white">Nouvelle offre</h1>
					<p className="text-dark-400 text-sm mt-0.5">Remplissez les informations de la promotion</p>
				</div>
			</div>
			<OfferForm mode="create" availableCars={availableCars} />
		</div>
	)
}
