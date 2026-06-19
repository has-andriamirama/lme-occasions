// src/app/(admin)/admin/offers/[id]/edit/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import prisma from '@/lib/db'
import OfferForm from '@/components/admin/offers/OfferForm'

export const metadata: Metadata = { title: 'Modifier l\'offre' }

interface CarOption { id: string; title: string; brand: string; model: string; year: number }

export default async function EditOfferPage({ params }: { params: { id: string } }) {
	const offer = await prisma.offer.findUnique({
		where: { id: params.id },
		include: { cars: { include: { car: { select: { id: true, title: true, brand: true, model: true, year: true } } } } },
	})
	if (!offer) notFound()

	const availableCars: CarOption[] = await prisma.car.findMany({
		where:   { status: 'AVAILABLE' },
		select:  { id: true, title: true, brand: true, model: true, year: true },
		orderBy: { brand: 'asc' },
	})

	// On fusionne les véhicules "disponibles" avec ceux déjà liés à l'offre
	// (qui peuvent entre-temps être passés Réservé/Vendu) pour ne pas les
	// faire disparaître silencieusement du formulaire d'édition.
	const linkedCars: CarOption[] = offer.cars.map((co) => co.car)
	const carsById = new Map<string, CarOption>(availableCars.map((c) => [c.id, c]))
	for (const c of linkedCars) carsById.set(c.id, c)
	const mergedCars: CarOption[] = Array.from(carsById.values()).sort((a, b) => a.brand.localeCompare(b.brand))

	return (
		<div className="space-y-6 max-w-4xl">
			<div className="flex items-center gap-3">
				<Link href="/admin/offers" className="btn-ghost p-2">
					<ChevronLeft className="w-5 h-5" />
				</Link>
				<div>
					<h1 className="text-2xl font-display font-bold text-white">Modifier : {offer.name}</h1>
					<p className="text-dark-400 text-sm mt-0.5">
						{offer.type === 'PERCENTAGE' ? `-${offer.value}%` : `-${offer.value}€`}
					</p>
				</div>
			</div>
			<OfferForm
				mode="edit"
				availableCars={mergedCars}
				initialData={{
					id: offer.id,
					name: offer.name,
					description: offer.description ?? '',
					type: offer.type,
					value: offer.value,
					startDate: offer.startDate.toISOString().slice(0, 16),
					endDate: offer.endDate.toISOString().slice(0, 16),
					isActive: offer.isActive,
					appliedToAll: offer.appliedToAll,
					carIds: linkedCars.map((c) => c.id),
				}}
			/>
		</div>
	)
}
