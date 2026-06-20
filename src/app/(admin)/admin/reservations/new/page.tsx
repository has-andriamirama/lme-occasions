// src/app/(admin)/admin/reservations/new/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import prisma from '@/lib/db'
import ReservationForm from '@/components/admin/reservations/ReservationForm'

export const metadata: Metadata = { title: 'Nouvelle réservation' }

export default async function NewReservationPage() {
	const availableCars = await prisma.car.findMany({
		where:   { status: 'AVAILABLE' },
		select:  { id: true, title: true, brand: true, model: true, year: true, price: true },
		orderBy: { brand: 'asc' },
	})

	// Même délai par défaut que la réservation publique (cf. /api/payments/create-checkout)
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
