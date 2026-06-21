// src/components/public/home/FeaturedCars.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Star, ArrowRight } from 'lucide-react'
import {
	formatPrice, calculateDiscountedPrice, getStatusLabel, getStatusColor,
	getOfferStatus, cn,
} from '@/lib/utils'
import { useCarStatusUpdates } from '@/hooks/useCarStatusUpdates'
import { useOfferUpdates, type OfferBroadcastPayload } from '@/hooks/useOfferUpdates'
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

export default function FeaturedCars({ cars: initialCars }: { cars: CarWithOffers[] }) {
	const [cars, setCars] = useState(initialCars)

	useCarStatusUpdates((carId, newStatus) => {
		setCars((prev) =>
			prev.map((c) => (c.id === carId ? { ...c, status: newStatus as Car['status'] } : c))
		)
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
		<section className="py-20 bg-dark-900/50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex items-center gap-3 mb-10">
					<div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
						<Star className="w-4 h-4 text-brand-400" fill="currentColor" />
					</div>
					<div>
						<p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-2">Sélection</p>
						<h2 className="font-display font-black text-2xl text-white">Véhicules vedettes</h2>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{cars.slice(0, 2).map((car) => {
						const now         = new Date()
						const rawOffer    = car.offers[0]?.offer ?? null
						const activeOffer = rawOffer && getOfferStatus(rawOffer, now) === 'ACTIVE' ? rawOffer : null
						const finalPrice  = activeOffer
							? calculateDiscountedPrice(car.price, activeOffer.type as any, activeOffer.value)
							: car.price
						const isUnavailable = car.status !== 'AVAILABLE'

						return (
							<Link
								key={car.id}
								href={`/cars/${car.id}`}
								className={cn(
									'group relative rounded-2xl overflow-hidden aspect-[16/9] bg-dark-800 border transition-all duration-300',
									isUnavailable
										? 'border-dark-700 opacity-80 cursor-default pointer-events-none'
										: 'border-dark-700 hover:border-brand-500/40 hover:shadow-brand'
								)}
							>
								{car.mainImage && (
									<Image
										src={car.mainImage}
										alt={car.title}
										fill
										className={cn(
											'object-cover transition-transform duration-700',
											!isUnavailable && 'group-hover:scale-105'
										)}
									/>
								)}
								<div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/40 to-transparent" />

								<div className="absolute top-4 left-4">
									<span className={`badge ${getStatusColor(car.status)}`}>
										<span className={`status-dot ${
											car.status === 'AVAILABLE' ? 'bg-emerald-400'
											: car.status === 'RESERVED' ? 'bg-amber-400' : 'bg-red-400'
										}`} />
										{getStatusLabel(car.status)}
									</span>
								</div>

								<div className="absolute bottom-0 left-0 right-0 p-6">
									<p className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-1">
										{car.brand} · {car.year}
									</p>
									<h3 className="font-display font-black text-xl text-white mb-1 line-clamp-1">
										{car.title}
									</h3>
									<div className="flex items-center justify-between">
										<div>
											{activeOffer && (
												<p className="text-sm text-dark-400 line-through">
													{formatPrice(car.price)}
												</p>
											)}
											<p className="text-2xl font-display font-black text-brand-gradient">
												{formatPrice(finalPrice)}
											</p>
										</div>
										{!isUnavailable && (
											<span className="text-sm font-semibold text-white bg-brand-500/20 border border-brand-500/30
											                 px-4 py-2 rounded-lg group-hover:bg-brand-500/30 transition-colors flex items-center gap-2">
												Voir <ArrowRight className="w-4 h-4" />
											</span>
										)}
									</div>
								</div>

								{activeOffer && (
									<div className="absolute top-4 right-4 badge bg-brand-500 text-dark-950 border-0 font-bold">
										{activeOffer.type === 'PERCENTAGE'
											? `-${activeOffer.value}%`
											: `-${activeOffer.value}€`}
									</div>
								)}
							</Link>
						)
					})}
				</div>
			</div>
		</section>
	)
}
