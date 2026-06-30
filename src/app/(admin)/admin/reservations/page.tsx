// src/app/(admin)/admin/reservations/page.tsx
import type { Metadata } from 'next'
import prisma from '@/lib/db'
import { formatPrice } from '@/lib/utils'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import AdminPageHeader from '@/components/admin/shared/AdminPageHeader'
import AdminFilterTabs from '@/components/admin/shared/AdminFilterTabs'
import ReservationsListClient, { type ReservationRow } from '@/components/admin/reservations/ReservationsListClient'

export const metadata: Metadata = { title: 'Réservations' }

export default async function ReservationsPage({
	searchParams,
}: {
	searchParams: { status?: string; page?: string }
}) {
	const page   = Math.max(1, Number(searchParams.page ?? 1))
	const limit  = 15
	const status = searchParams.status ?? ''

	const where: Record<string, unknown> = {}
	if (status) where.status = status

	const [reservations, total, stats] = await Promise.all([
		prisma.reservation.findMany({
			where,
			include: {
				car: { select: { id: true, title: true, brand: true, model: true, mainImage: true } },
				paymentInstallments: { select: { paidAmount: true } },
			},
			orderBy: { reservedAt: 'desc' },
			skip:    (page - 1) * limit,
			take:    limit,
		}),
		prisma.reservation.count({ where }),
		Promise.all([
			prisma.reservation.count({ where: { status: 'PAID' } }),
			prisma.reservation.count({ where: { status: 'CONFIRMED' } }),
			prisma.reservation.count({ where: { status: 'COMPLETED' } }),
			prisma.reservation.aggregate({
				where: { status: { in: ['PAID', 'CONFIRMED', 'COMPLETED'] } },
				_sum:  { depositAmount: true },
			}),
		]),
	])

	const [payed, confirmed, completed, revenueAgg] = stats
	const totalPages = Math.ceil(total / limit)

	const rows: ReservationRow[] = reservations.map((r) => ({
		id:            r.id,
		status:        r.status,
		reservedAt:    r.reservedAt.toISOString(),
		expiresAt:     r.expiresAt.toISOString(),
		clientName:    r.clientName,
		clientEmail:   r.clientEmail,
		depositAmount: r.depositAmount,
		totalPrice:    r.totalPrice,
		car:           r.car,
		paymentInstallments: r.paymentInstallments,
	}))

	return (
		<div className="space-y-6 min-w-0">
			<AdminPageHeader
				title="Réservations"
				subtitle={`${total} réservation${total !== 1 ? 's' : ''}`}
				action={
					<Link href="/admin/reservations/new" className="btn-primary">
						<Plus className="w-4 h-4" />Nouvelle réservation
					</Link>
				}
			/>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{[
					{ label: 'Payées (à confirmer)', value: payed,     color: 'text-blue-400' },
					{ label: 'Confirmées',           value: confirmed, color: 'text-emerald-400' },
					{ label: 'Finalisées',           value: completed, color: 'text-brand-400' },
					{ label: 'Revenus (acomptes)',   value: formatPrice(revenueAgg._sum.depositAmount ?? 0), color: 'text-white', isText: true },
				].map(({ label, value, color, isText }) => (
					<div key={label} className="card p-5">
						<div className={`text-2xl font-display font-bold ${color} ${isText ? 'text-lg' : ''}`}>{value}</div>
						<div className="text-xs text-dark-400 mt-1">{label}</div>
					</div>
				))}
			</div>

			<AdminFilterTabs tabs={[
				{ label: 'Toutes',     href: '/admin/reservations',                   active: status === '' },
				{ label: 'En attente', href: '/admin/reservations?status=PENDING',    active: status === 'PENDING' },
				{ label: 'Payées',     href: '/admin/reservations?status=PAID',       active: status === 'PAID' },
				{ label: 'Confirmées', href: '/admin/reservations?status=CONFIRMED',  active: status === 'CONFIRMED' },
				{ label: 'Finalisées', href: '/admin/reservations?status=COMPLETED',  active: status === 'COMPLETED' },
				{ label: 'Expirées',   href: '/admin/reservations?status=EXPIRED',    active: status === 'EXPIRED' },
				{ label: 'Annulées',   href: '/admin/reservations?status=CANCELLED',  active: status === 'CANCELLED' },
			]} />

			<ReservationsListClient
				initialReservations={rows}
				status={status}
				page={page}
				totalPages={totalPages}
			/>
		</div>
	)
}
