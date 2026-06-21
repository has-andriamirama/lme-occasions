// src/app/(admin)/admin/reservations/new/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import prisma from '@/lib/db'
import ReservationForm from '@/components/admin/reservations/ReservationForm'
import { calculateDiscountedPrice } from '@/lib/utils'

export const metadata: Metadata = { title: 'Nouvelle réservation' }

export default async function NewReservationPage() {
	const now = new Date()

	const cars = await prisma.car.findMany({
		where:   { status: 'AVAILABLE' },
		select:  {
			id: true, title: true, brand: true, model: true, year: true, price: true,
			offers: {
				where: {
					offer: {
						isActive:  true,
						startDate: { lte: now },
						endDate:   { gte: now },
					},
				},
				include: {
					offer: { select: { id: true, name: true, type: true, value: true } },
				},
			},
		},
		orderBy: { brand: 'asc' },
	})

	const availableCars = cars.map((c) => {
		const activeOffer = c.offers[0]?.offer ?? null
		const finalPrice  = activeOffer
			? calculateDiscountedPrice(c.price, activeOffer.type as any, activeOffer.value)
			: c.price

		return {
			id:    c.id,
			title: c.title,
			brand: c.brand,
			model: c.model,
			year:  c.year,
			price: c.price,
			finalPrice,
			offer: activeOffer
				? { id: activeOffer.id, name: activeOffer.name, type: activeOffer.type, value: activeOffer.value }
				: null,
		}
	})

	const expiryDays      = Number(process.env.RESERVATION_EXPIRY_DAYS ?? 5)
	const defaultExpiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10)

	return (
		<div className="space-y-6 max-w-4xl">
			<div className="flex items-center gap-3">
				<Link href="/admin/reservations" className="btn-ghost p-2">
					<ChevronLeft className="w-5 h-5" />
				</Link>
				<div>
					<h1 className="text-2xl font-display font-bold text-white">Nouvelle réservation</h1>
					<p className="text-dark-400 text-sm mt-0.5">
						Enregistrer une réservation effectuée directement en agence
					</p>
				</div>
			</div>
			<ReservationForm mode="create" availableCars={availableCars} defaultExpiresAt={defaultExpiresAt} />
		</div>
	)
}
