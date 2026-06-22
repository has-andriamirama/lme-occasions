// src/components/public/home/AllCarsPreview.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import CarCard from '@/components/public/cars/CarCard'
import { useCarUpdates } from '@/hooks/useCarUpdates'
import { useOfferUpdates, type OfferBroadcastPayload } from '@/hooks/useOfferUpdates'
import { ArrowRight } from 'lucide-react'
import type { Car, Offer } from '@prisma/client'

type CarWithOffers = Car & { offers: Array<{ offer: Offer }> }

function applyOfferChange(
	cars: CarWithOffers[],
	offer: OfferBroadcastPayload,
): CarWithOffers[] {
	return cars.map((car) => {
		const isTargeted  = offer.carIds.includes(car.id)
		const existingIdx = car.offers.findIndex((o) => o.offer.id === offer.id)

		if (isTargeted) {
			const existing = car.offers[existingIdx]?.offer

			const updatedOffer: Offer = {
				id:           offer.id,
				name:         offer.name,
				description:  offer.description,
				type:         offer.type as Offer['type'],
				value:        offer.value,
				startDate:    new Date(offer.startDate),
				endDate:      new Date(offer.endDate),
				isActive:     offer.isActive,
				appliedToAll: offer.appliedToAll,
				createdAt:    existing?.createdAt ?? new Date(),
				updatedAt:    new Date(),
			}

			if (existingIdx !== -1) {
				const updatedOffers = [...car.offers]
				updatedOffers[existingIdx] = { offer: updatedOffer }
				return { ...car, offers: updatedOffers }
			}
			return { ...car, offers: [...car.offers, { offer: updatedOffer }] }
		}

		if (existingIdx !== -1) {
			return { ...car, offers: car.offers.filter((o) => o.offer.id !== offer.id) }
		}

		return car
	})
}

export default function AllCarsPreview({ cars: initialCars }: { cars: CarWithOffers[] }) {
	const [cars, setCars] = useState(initialCars)

	useCarUpdates({
		onChange: (updatedCar) => {
			setCars((prev) =>
				prev.map((c) => (c.id === updatedCar.id ? ({ ...c, ...updatedCar } as CarWithOffers) : c))
			)
		},
		onDelete: (carId) => {
			setCars((prev) => prev.filter((c) => c.id !== carId))
		},
	})

	useOfferUpdates({
		onChange: (offer) => {
			setCars((prev) => applyOfferChange(prev, offer))
		},
		onDelete: (offerId) => {
			setCars((prev) =>
				prev.map((car) => ({
					...car,
					offers: car.offers.filter((o) => o.offer.id !== offerId),
				}))
			)
		},
	})

	return (
		<section id="vehicules" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
				<div>
					<p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-2">Notre sélection</p>
					<h2 className="font-display font-black text-3xl sm:text-4xl text-white">
						Véhicules disponibles
					</h2>
				</div>
				<Link href="/cars" className="btn-secondary text-sm shrink-0">
					Voir tout le catalogue <ArrowRight className="w-4 h-4" />
				</Link>
			</div>

			{/* Grid */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger">
				{cars.map((car) => (
					<CarCard key={car.id} car={car} />
				))}
			</div>
		</section>
	)
}
