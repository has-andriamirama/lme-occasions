// src/app/(admin)/admin/reservations/page.tsx
import type { Metadata } from 'next'
import prisma from '@/lib/db'
import Image from 'next/image'
import { formatPrice, formatDateTime, getDaysRemaining } from '@/lib/utils'
import ReservationActions from '@/components/admin/reservations/ReservationActions'
import { Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Réservations' }

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING:   { label: 'En attente',  color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   icon: <Clock className="w-3.5 h-3.5" /> },
  CONFIRMED: { label: 'Confirmée',   color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  COMPLETED: { label: 'Finalisée',   color: 'bg-brand-500/10 text-brand-400 border-brand-500/20',   icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  EXPIRED:   { label: 'Expirée',     color: 'bg-red-500/10 text-red-400 border-red-500/20',         icon: <XCircle className="w-3.5 h-3.5" /> },
  CANCELLED: { label: 'Annulée',     color: 'bg-dark-600/30 text-dark-400 border-dark-600/20',      icon: <XCircle className="w-3.5 h-3.5" /> },
}

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
      include: { car: { select: { id: true, title: true, brand: true, model: true, mainImage: true } } },
      orderBy: { reservedAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.reservation.count({ where }),
    Promise.all([
      prisma.reservation.count({ where: { status: 'CONFIRMED' } }),
      prisma.reservation.count({ where: { status: 'COMPLETED' } }),
      prisma.reservation.count({ where: { status: 'EXPIRED' } }),
      prisma.reservation.aggregate({ where: { status: { in: ['CONFIRMED','COMPLETED'] } }, _sum: { depositAmount: true } }),
    ]),
  ])

  const [active, completed, expired, revenueAgg] = stats
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Réservations</h1>
        <p className="text-dark-400 text-sm mt-0.5">{total} réservation{total !== 1 ? 's' : ''}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Actives',     value: active,    color: 'text-emerald-400' },
          { label: 'Finalisées',  value: completed, color: 'text-brand-400' },
          { label: 'Expirées',    value: expired,   color: 'text-red-400' },
          { label: 'Revenus (acomptes)', value: formatPrice(revenueAgg._sum.depositAmount ?? 0), color: 'text-white', isText: true },
        ].map(({ label, value, color, isText }) => (
          <div key={label} className="card p-5">
            <div className={`text-2xl font-display font-bold ${color} ${isText ? 'text-lg' : ''}`}>{value}</div>
            <div className="text-xs text-dark-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Toutes',     value: '' },
          { label: 'Confirmées', value: 'CONFIRMED' },
          { label: 'En attente', value: 'PENDING' },
          { label: 'Finalisées', value: 'COMPLETED' },
          { label: 'Expirées',   value: 'EXPIRED' },
          { label: 'Annulées',   value: 'CANCELLED' },
        ].map(({ label, value }) => (
          <Link key={value} href={`/admin/reservations${value ? `?status=${value}` : ''}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border
              ${status === value
                ? 'bg-brand-500/10 text-brand-400 border-brand-500/30'
                : 'bg-dark-800 text-dark-400 border-dark-700 hover:text-white hover:border-dark-600'}`}>
            {label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {reservations.length === 0 ? (
          <p className="text-center text-dark-400 py-12">Aucune réservation</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700 text-xs text-dark-400 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Véhicule</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Client</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Acompte</th>
                  <th className="text-center px-4 py-3 font-medium hidden lg:table-cell">Expiration</th>
                  <th className="text-center px-4 py-3 font-medium">Statut</th>
                  <th className="text-center px-4 py-3 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {reservations.map((r) => {
                  const meta       = STATUS_META[r.status] ?? STATUS_META.CANCELLED
                  const daysLeft   = getDaysRemaining(r.expiresAt)
                  const isUrgent   = r.status === 'CONFIRMED' && daysLeft <= 1

                  return (
                    <tr key={r.id} className={`hover:bg-dark-800/30 transition-colors ${isUrgent ? 'bg-amber-500/5' : ''}`}>
                      {/* Car */}
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
                      {/* Client */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-sm text-white">{r.clientName}</p>
                        <p className="text-xs text-dark-400">{r.clientEmail}</p>
                      </td>
                      {/* Amount */}
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <p className="text-sm font-bold text-brand-400">{formatPrice(r.depositAmount)}</p>
                        <p className="text-xs text-dark-500">/ {formatPrice(r.totalPrice)}</p>
                      </td>
                      {/* Expiry */}
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        {r.status === 'CONFIRMED' ? (
                          <div className={`flex items-center justify-center gap-1 text-xs font-medium
                            ${isUrgent ? 'text-red-400' : daysLeft <= 2 ? 'text-amber-400' : 'text-dark-400'}`}>
                            {isUrgent && <AlertTriangle className="w-3.5 h-3.5" />}
                            {daysLeft === 0 ? 'Expire aujourd\'hui' : `J-${daysLeft}`}
                          </div>
                        ) : (
                          <span className="text-xs text-dark-600">—</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${meta.color}`}>
                          {meta.icon}{meta.label}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        {(r.status === 'CONFIRMED' || r.status === 'PENDING') && (
                          <ReservationActions reservationId={r.id} />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={`/admin/reservations?page=${p}${status ? `&status=${status}` : ''}`}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all
                ${p === page ? 'bg-brand-500 text-dark-950' : 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700'}`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
