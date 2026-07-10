// src/app/(admin)/admin/reservations/[id]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
	ChevronLeft,
	Pencil,
	Car,
	User,
	Phone,
	Mail,
	Calendar,
	BadgeInfo,
	FileText,
} from 'lucide-react'
import prisma from '@/lib/db'
import { formatPrice, formatDateTime } from '@/lib/utils'
import { isEditableReservationStatus, isFullyCoveredByDeposit } from '@/lib/balance'
import PaymentTracker from '@/components/admin/reservations/PaymentTracker'
import ReservationActions from '@/components/admin/reservations/ReservationActions'

export const metadata: Metadata = { title: 'Détail de la réservation' }

const STATUS_META: Record<string, { label: string; color: string }> = {
	PENDING:   { label: 'En attente', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
	PAID:      { label: 'Payée',      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
	CONFIRMED: { label: 'Confirmée',  color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
	COMPLETED: { label: 'Finalisée',  color: 'bg-brand-500/10 text-brand-400 border-brand-500/20' },
	EXPIRED:   { label: 'Expirée',    color: 'bg-red-500/10 text-red-400 border-red-500/20' },
	CANCELLED: { label: 'Annulée',    color: 'bg-dark-600/30 text-dark-400 border-dark-600/20' },
}

const INSTALLMENT_LABEL: Record<string, string> = {
	FULL:        'Paiement intégral du solde',
	THREE_TIMES: 'Paiement en 3 fois',
	FOUR_TIMES:  'Paiement en 4 fois',
}

export default async function ReservationDetailPage({
	params,
}: {
	params: { id: string }
}) {
	const reservation = await prisma.reservation.findUnique({
		where:   { id: params.id },
		include: {
			car: true,
			balancePayment: true,
		},
	})

	if (!reservation) notFound()

	const statusMeta = STATUS_META[reservation.status] ?? STATUS_META.CANCELLED
	const isEditable = isEditableReservationStatus(reservation.status, !!reservation.balancePayment)

	const balancePaymentSerialized = reservation.balancePayment ? {
		id:             reservation.balancePayment.id,
		expectedAmount: reservation.balancePayment.expectedAmount,
		paidAmount:     reservation.balancePayment.paidAmount,
		paidAt:         reservation.balancePayment.paidAt?.toISOString() ?? null,
		notes:          reservation.balancePayment.notes,
	} : null

	const totalEncaissed = reservation.depositAmount + (balancePaymentSerialized?.paidAmount ?? 0)

	const soldViaDepositOnly = !reservation.balancePayment
		&& isFullyCoveredByDeposit(reservation.depositAmount, reservation.totalPrice)

	return (
		<div className="space-y-6 max-w-5xl">

			<div className="flex items-start justify-between gap-4 flex-wrap">
				<div className="flex items-center gap-3">
					<Link href="/admin/reservations" className="btn-ghost p-2">
						<ChevronLeft className="w-5 h-5" />
					</Link>
					<div>
						<div className="flex items-center gap-2 flex-wrap">
							<h1 className="text-2xl font-display font-bold text-white">
								Réservation
							</h1>
							<span className="text-dark-500 font-mono text-sm hidden sm:block">#{params.id.slice(-8).toUpperCase()}</span>
							<span className={`badge ${statusMeta.color}`}>{statusMeta.label}</span>
						</div>
						<p className="text-dark-400 text-sm mt-0.5">
							{reservation.car.title} · réservé le {formatDateTime(reservation.reservedAt)}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{isEditable && (
						<Link
							href={`/admin/reservations/${params.id}/edit`}
							className="btn-secondary"
						>
							<Pencil className="w-4 h-4" />
							Modifier
						</Link>
					)}
					{isEditable && (
						<ReservationActions
							reservationId={params.id}
							status={reservation.status}
							hasBalancePayment={!!reservation.balancePayment}
						/>
					)}
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

				<div className="card p-5 space-y-3">
					<div className="flex items-center gap-2 pb-2 border-b border-dark-800">
						<User className="w-4 h-4 text-dark-400" />
						<p className="text-sm font-medium text-white">Informations client</p>
					</div>
					<div className="space-y-2">
						<div className="flex items-center gap-2">
							<User className="w-3.5 h-3.5 text-dark-500 shrink-0" />
							<span className="text-sm text-white">{reservation.clientName}</span>
						</div>
						<div className="flex items-center gap-2">
							<Mail className="w-3.5 h-3.5 text-dark-500 shrink-0" />
							<a
								href={`mailto:${reservation.clientEmail}`}
								className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
							>
								{reservation.clientEmail}
							</a>
						</div>
						<div className="flex items-center gap-2">
							<Phone className="w-3.5 h-3.5 text-dark-500 shrink-0" />
							<a
								href={`tel:${reservation.clientPhone}`}
								className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
							>
								{reservation.clientPhone}
							</a>
						</div>
					</div>
				</div>

				<div className="card p-5 space-y-3">
					<div className="flex items-center gap-2 pb-2 border-b border-dark-800">
						<Car className="w-4 h-4 text-dark-400" />
						<p className="text-sm font-medium text-white">Véhicule réservé</p>
					</div>
					<div className="flex items-center gap-3">
						{reservation.car.mainImage && (
							<div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-dark-700">
								<Image
									src={reservation.car.mainImage}
									alt={reservation.car.title}
									width={64}
									height={48}
									className="w-full h-full object-cover"
								/>
							</div>
						)}
						<div>
							<p className="text-sm font-medium text-white">{reservation.car.title}</p>
							<p className="text-xs text-dark-400">
								{reservation.car.brand} {reservation.car.model} · {reservation.car.year}
							</p>
							<Link
								href={`/cars/${reservation.car.id}`}
								className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
							>
								Voir la fiche
							</Link>
						</div>
					</div>
				</div>
			</div>

			<div className="card p-5">
				<div className="flex items-center gap-2 pb-3 mb-4 border-b border-dark-800">
					<BadgeInfo className="w-4 h-4 text-dark-400" />
					<p className="text-sm font-medium text-white">Récapitulatif financier</p>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
					<div>
						<p className="text-xs text-dark-500 mb-1">Prix total</p>
						<p className="text-base font-bold text-white">{formatPrice(reservation.totalPrice)}</p>
					</div>
					<div>
						<p className="text-xs text-dark-500 mb-1">Acompte versé</p>
						<p className="text-base font-bold text-brand-400">{formatPrice(reservation.depositAmount)}</p>
					</div>
					<div>
						<p className="text-xs text-dark-500 mb-1">Total encaissé</p>
						<p className="text-base font-bold text-emerald-400">{formatPrice(totalEncaissed)}</p>
					</div>
					<div>
						<p className="text-xs text-dark-500 mb-1">Modalité</p>
						<p className="text-sm font-medium text-white">
							{soldViaDepositOnly
								? 'Payé intégralement à la réservation'
								: INSTALLMENT_LABEL[reservation.installmentType ?? 'FULL']}
						</p>
					</div>
				</div>

				<div className="mt-4 pt-4 border-t border-dark-800 grid grid-cols-2 sm:grid-cols-3 gap-4">
					<div className="flex items-center gap-2">
						<Calendar className="w-3.5 h-3.5 text-dark-500 shrink-0" />
						<div>
							<p className="text-xs text-dark-500">Réservé le</p>
							<p className="text-xs text-white">{formatDateTime(reservation.reservedAt)}</p>
						</div>
					</div>

					{reservation.paidAt && (
						<div className="flex items-center gap-2">
							<Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
							<div>
								<p className="text-xs text-dark-500">Payé le</p>
								<p className="text-xs text-blue-400">{formatDateTime(reservation.paidAt)}</p>
							</div>
						</div>
					)}

					{reservation.confirmedAt && (
						<div className="flex items-center gap-2">
							<Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
							<div>
								<p className="text-xs text-dark-500">Confirmé le</p>
								<p className="text-xs text-emerald-400">{formatDateTime(reservation.confirmedAt)}</p>
							</div>
						</div>
					)}

					{reservation.status === 'PAID' && (
						<div className="flex items-center gap-2">
							<Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
							<div>
								<p className="text-xs text-dark-500">À confirmer avant le</p>
								<p className="text-xs text-amber-400">{formatDateTime(reservation.expiresAt)}</p>
							</div>
						</div>
					)}
					{reservation.expiredAt && (
						<div className="flex items-center gap-2">
							<Calendar className="w-3.5 h-3.5 text-red-400 shrink-0" />
							<div>
								<p className="text-xs text-dark-500">Expiré le</p>
								<p className="text-xs text-red-400">{formatDateTime(reservation.expiredAt)}</p>
							</div>
						</div>
					)}

					{reservation.completedAt && (
						<div className="flex items-center gap-2">
							<Calendar className="w-3.5 h-3.5 text-brand-400 shrink-0" />
							<div>
								<p className="text-xs text-dark-500">Finalisé le</p>
								<p className="text-xs text-brand-400">{formatDateTime(reservation.completedAt)}</p>
							</div>
						</div>
					)}
				</div>
			</div>

			{reservation.status === 'PAID' && (
				<div className="card p-4 border border-blue-500/30 bg-blue-500/5 flex items-start gap-3">
					<BadgeInfo className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
					<div className="flex-1">
						<p className="text-sm text-blue-300 font-medium">En attente de présentation en agence</p>
						<p className="text-xs text-dark-400 mt-0.5">
							L&apos;acompte a été encaissé. Confirmez la réservation une fois que le client s&apos;est présenté
							en agence — cela débloquera la saisie du paiement du reste.
						</p>
					</div>
				</div>
			)}

			<PaymentTracker
				reservationId={params.id}
				depositAmount={reservation.depositAmount}
				depositDate={reservation.reservedAt.toISOString()}
				totalPrice={reservation.totalPrice}
				installmentType={(reservation.installmentType ?? 'FULL') as 'FULL' | 'THREE_TIMES' | 'FOUR_TIMES'}
				reservationStatus={reservation.status}
				balancePayment={balancePaymentSerialized}
				depositInvoiceUrl={reservation.depositInvoiceUrl}
				fullInvoiceUrl={reservation.fullInvoiceUrl}
			/>

			{reservation.notes && (
				<div className="card p-5">
					<div className="flex items-center gap-2 pb-3 mb-3 border-b border-dark-800">
						<FileText className="w-4 h-4 text-dark-400" />
						<p className="text-sm font-medium text-white">Notes</p>
					</div>
					<p className="text-sm text-dark-300 whitespace-pre-wrap">{reservation.notes}</p>
				</div>
			)}
		</div>
	)
}
