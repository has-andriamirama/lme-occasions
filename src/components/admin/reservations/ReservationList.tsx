// src/components/admin/reservations/ReservationList.tsx
'use client'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Clock, CheckCircle2, XCircle, AlertTriangle, CreditCard, Plus } from 'lucide-react'
import { formatPrice, formatDateTime, getDaysRemaining } from '@/lib/utils'
import ReservationActions from '@/components/admin/reservations/ReservationActions'
import AdminPagination from '@/components/admin/shared/AdminPagination'
import { useReservationUpdates } from '@/hooks/useReservationUpdates'

export interface ReservationRow {
	id:            string
	status:        string
	reservedAt:    string
	expiresAt:     string
	clientName:    string
	clientEmail:   string
	depositAmount: number
	totalPrice:    number
	car:           { id: string; title: string; brand: string; model: string; mainImage: string }
	paymentInstallments: { paidAmount: number | null }[]
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
	PENDING:   { label: 'En attente', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',       icon: <Clock className="w-3.5 h-3.5" /> },
	PAID:      { label: 'Payée',      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',          icon: <CreditCard className="w-3.5 h-3.5" /> },
	CONFIRMED: { label: 'Confirmée',  color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
	COMPLETED: { label: 'Finalisée',  color: 'bg-brand-500/10 text-brand-400 border-brand-500/20',       icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
	EXPIRED:   { label: 'Expirée',    color: 'bg-red-500/10 text-red-400 border-red-500/20',             icon: <XCircle className="w-3.5 h-3.5" /> },
	CANCELLED: { label: 'Annulée',    color: 'bg-dark-600/30 text-dark-400 border-dark-600/20',          icon: <XCircle className="w-3.5 h-3.5" /> },
}

function PaymentProgress({
	status, installments, depositAmount, totalPrice,
}: {
	status:       string
	installments: { paidAmount: number | null }[]
	depositAmount: number
	totalPrice:   number
}) {
	if (['EXPIRED', 'CANCELLED', 'PENDING'].includes(status)) {
		return <span className="text-xs text-dark-600">—</span>
	}
	if (status === 'COMPLETED') {
		return (
			<span className="flex items-center gap-1 text-xs font-medium text-brand-400">
				<CheckCircle2 className="w-3.5 h-3.5" />Réglé
			</span>
		)
	}
	if (installments.length === 0) return <span className="text-xs text-dark-500">—</span>

	const paidCount  = installments.filter((i) => i.paidAmount !== null).length
	const totalCount = installments.length
	const totalPaid  = depositAmount + installments.reduce((s, i) => s + (i.paidAmount ?? 0), 0)
	const percent    = Math.min(100, Math.round((totalPaid / totalPrice) * 100))

	return (
		<div className="space-y-1">
			<span className="text-xs text-dark-300">
				{paidCount}/{totalCount} tranche{totalCount > 1 ? 's' : ''}
			</span>
			<div className="h-1 w-16 bg-dark-700 rounded-full overflow-hidden">
				<div
					className={`h-full rounded-full ${paidCount === totalCount ? 'bg-emerald-500' : 'bg-brand-500'}`}
					style={{ width: `${percent}%` }}
				/>
			</div>
		</div>
	)
}

interface Props {
	initialReservations: ReservationRow[]
	status:              string
	page:                number
	totalPages:          number
}

export default function ReservationList({ initialReservations, status, page, totalPages }: Props) {
	const [reservations, setReservations] = useState<ReservationRow[]>(initialReservations)

	useReservationUpdates({
		onCreate: (incoming) => {
			if (page !== 1) return
			if (status && incoming.status !== status) return
			const car = incoming.car
			if (!car) return
			setReservations((prev) => {
				if (prev.some((r) => r.id === incoming.id)) return prev
				return [{
					id:            incoming.id,
					status:        incoming.status,
					reservedAt:    incoming.reservedAt,
					expiresAt:     incoming.expiresAt,
					clientName:    incoming.clientName,
					clientEmail:   incoming.clientEmail,
					depositAmount: incoming.depositAmount,
					totalPrice:    incoming.totalPrice,
					car,
					paymentInstallments: [],
				}, ...prev]
			})
		},
		onChange: (incoming) => {
			setReservations((prev) => {
				const idx = prev.findIndex((r) => r.id === incoming.id)
				if (idx === -1) return prev
				if (status && incoming.status !== status) {
					return prev.filter((r) => r.id !== incoming.id)
				}
				const next = [...prev]
				next[idx] = {
					...next[idx],
					status:        incoming.status,
					depositAmount: incoming.depositAmount,
					totalPrice:    incoming.totalPrice,
					expiresAt:     incoming.expiresAt,
				}
				return next
			})
		},
		onCancel: (reservationId) => {
			setReservations((prev) => {
				if (!prev.some((r) => r.id === reservationId)) return prev
				if (status && status !== 'CANCELLED') {
					return prev.filter((r) => r.id !== reservationId)
				}
				return prev.map((r) => (r.id === reservationId ? { ...r, status: 'CANCELLED' } : r))
			})
		},
	})

	return (
		<>
			<div className="card overflow-hidden">
				{reservations.length === 0 ? (
					<div className="text-center py-12">
						<p className="text-dark-400">Aucune réservation</p>
						{!status && (
							<Link href="/admin/reservations/new" className="btn-primary mt-4 inline-flex">
								<Plus className="w-4 h-4" /> Créer une réservation
							</Link>
						)}
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-dark-700 text-xs text-dark-400 uppercase tracking-wider">
									<th className="text-left px-4 py-3 font-medium">Véhicule</th>
									<th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Client</th>
									<th className="text-right px-4 py-3 font-medium hidden md:table-cell">Acompte</th>
									<th className="text-center px-4 py-3 font-medium hidden lg:table-cell">Paiements</th>
									<th className="text-center px-4 py-3 font-medium hidden lg:table-cell">Expiration</th>
									<th className="text-center px-4 py-3 font-medium">Statut</th>
									<th className="text-center px-4 py-3 font-medium w-28">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-dark-800">
								{reservations.map((r) => {
									const meta     = STATUS_META[r.status] ?? STATUS_META.CANCELLED
									const daysLeft = getDaysRemaining(r.expiresAt)
									const isUrgent = r.status === 'PAID' && daysLeft <= 1
									return (
										<tr key={r.id} className={`hover:bg-dark-800/30 transition-colors ${isUrgent ? 'bg-amber-500/5' : ''}`}>
											<td className="px-4 py-3">
												<div className="flex items-center gap-3">
													<div className="w-10 h-8 rounded-lg bg-dark-700 overflow-hidden shrink-0">
														{r.car.mainImage && (
															<Image src={r.car.mainImage} alt={r.car.title} width={40} height={32}
																className="w-full h-full object-cover" />
														)}
													</div>
													<div className="min-w-0">
														<p className="text-sm font-medium text-white truncate max-w-[160px]">{r.car.title}</p>
														<p className="text-xs text-dark-500">{formatDateTime(r.reservedAt)}</p>
													</div>
												</div>
											</td>
											<td className="px-4 py-3 hidden sm:table-cell">
												<p className="text-sm text-white">{r.clientName}</p>
												<p className="text-xs text-dark-400">{r.clientEmail}</p>
											</td>
											<td className="px-4 py-3 text-right hidden md:table-cell">
												<p className={`text-sm font-bold ${r.status === 'PENDING' ? 'text-dark-500' : 'text-brand-400'}`}>
													{formatPrice(r.depositAmount)}
												</p>
												<p className="text-xs text-dark-500">
													{r.status === 'PENDING' ? 'non encaissé' : `/ ${formatPrice(r.totalPrice)}`}
												</p>
											</td>
											<td className="px-4 py-3 text-center hidden lg:table-cell">
												<PaymentProgress
													status={r.status}
													installments={r.paymentInstallments}
													depositAmount={r.depositAmount}
													totalPrice={r.totalPrice}
												/>
											</td>
											<td className="px-4 py-3 text-center hidden lg:table-cell">
												{r.status === 'PAID' ? (
													<div className={`flex items-center justify-center gap-1 text-xs font-medium
														${isUrgent ? 'text-red-400' : daysLeft <= 2 ? 'text-amber-400' : 'text-dark-400'}`}>
														{isUrgent && <AlertTriangle className="w-3.5 h-3.5" />}
														{daysLeft === 0 ? "Expire aujourd'hui" : `J-${daysLeft}`}
													</div>
												) : (
													<span className="text-xs text-dark-600">—</span>
												)}
											</td>
											<td className="px-4 py-3 text-center">
												<span className={`badge ${meta.color}`}>{meta.icon}{meta.label}</span>
											</td>
											<td className="px-4 py-3">
												<ReservationActions
													reservationId={r.id}
													status={r.status}
													installmentsCount={r.paymentInstallments.length}
												/>
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

			<AdminPagination
				page={page}
				totalPages={totalPages}
				buildHref={(p) => `/admin/reservations?page=${p}${status ? `&status=${status}` : ''}`}
			/>
		</>
	)
}
