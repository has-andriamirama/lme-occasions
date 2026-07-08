// src/app/(admin)/admin/reservations/[id]/edit/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Lock } from 'lucide-react'
import prisma from '@/lib/db'
import { formatDateTime } from '@/lib/utils'
import { isEditableReservationStatus } from '@/lib/balance'
import ReservationForm from '@/components/admin/reservations/ReservationForm'

export const metadata: Metadata = { title: 'Modifier la réservation' }

const STATUS_LABEL: Record<string, string> = {
	PENDING:   'En attente',
	PAID:      'Payée',
	CONFIRMED: 'Confirmée',
	COMPLETED: 'Finalisée',
	EXPIRED:   'Expirée',
	CANCELLED: 'Annulée',
}

export default async function EditReservationPage({ params }: { params: { id: string } }) {
	const reservation = await prisma.reservation.findUnique({
		where:   { id: params.id },
		include: {
			car:            { select: { id: true, title: true, brand: true, model: true, year: true, price: true } },
			balancePayment: { select: { id: true } },
		},
	})
	if (!reservation) notFound()

	const editable = isEditableReservationStatus(reservation.status, !!reservation.balancePayment)

	return (
		<div className="space-y-6 max-w-4xl">
			<div className="flex items-center gap-3">
				<Link href="/admin/reservations" className="btn-ghost p-2">
					<ChevronLeft className="w-5 h-5" />
				</Link>
				<div>
					<h1 className="text-2xl font-display font-bold text-white">Modifier la réservation</h1>
					<p className="text-dark-400 text-sm mt-0.5">
						{reservation.car.title} — {reservation.clientName} · réservée le {formatDateTime(reservation.reservedAt)}
					</p>
				</div>
			</div>

			{editable ? (
				<>
					{reservation.status === 'COMPLETED' && (
						<div className="flex items-start gap-3 rounded-xl border border-brand-500/20 bg-brand-500/10 p-4">
							<Lock className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
							<p className="text-sm text-brand-200/90">
								Cette vente a été finalisée directement via un acompte couvrant tout le prix. En abaissant
								l&apos;acompte ci-dessous, la réservation repassera au statut « Confirmée » (véhicule « Réservé »)
								et le reste à payer sera recalculé.
							</p>
						</div>
					)}
					<ReservationForm
						mode="edit"
						availableCars={[reservation.car]}
						initialData={{
							id:              reservation.id,
							carId:           reservation.carId,
							carLabel:        `${reservation.car.brand} ${reservation.car.model} ${reservation.car.year}`,
							clientName:      reservation.clientName,
							clientEmail:     reservation.clientEmail,
							clientPhone:     reservation.clientPhone,
							totalPrice:      reservation.totalPrice,
							depositAmount:   reservation.depositAmount,
							installmentType: reservation.installmentType ?? 'FULL',
							expiresAt:       reservation.expiresAt.toISOString().slice(0, 10),
							notes:           reservation.notes ?? '',
							status:          reservation.status,
						}}
					/>
				</>
			) : (
				<div className="card p-6 flex items-start gap-3">
					<Lock className="w-5 h-5 text-dark-500 mt-0.5 shrink-0" />
					<div>
						<p className="text-white font-medium">
							Réservation {STATUS_LABEL[reservation.status]?.toLowerCase()} — modification impossible
						</p>
						<p className="text-sm text-dark-400 mt-1">
							Seules les réservations « En attente », « Payée » ou « Confirmée » peuvent être modifiées
							— tout comme une réservation « Finalisée » directement via un acompte couvrant tout le prix.
						</p>
					</div>
				</div>
			)}
		</div>
	)
}
