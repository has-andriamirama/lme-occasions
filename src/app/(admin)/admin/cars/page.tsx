// src/app/(admin)/admin/cars/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import prisma from '@/lib/db'
import { Plus, Pencil, Trash2, Star, Eye } from 'lucide-react'
import { formatPrice, formatMileage, getStatusLabel, getStatusColor } from '@/lib/utils'
import AdminCarsActions from '@/components/admin/cars/AdminCarsActions'

export const metadata: Metadata = { title: 'Gestion des véhicules' }

export default async function AdminCarsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string; search?: string }
}) {
  const page   = Math.max(1, Number(searchParams.page ?? 1))
  const limit  = 15
  const status = searchParams.status ?? ''
  const search = searchParams.search ?? ''

  const where: Record<string, unknown> = {}
  if (status && status !== 'ALL') where.status = status
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [cars, total] = await Promise.all([
    prisma.car.findMany({
      where,
      include: {
        offers: { include: { offer: true }, where: { offer: { isActive: true, startDate: { lte: new Date() }, endDate: { gte: new Date() } } } },
        _count: { select: { reservations: true } },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      skip:  (page - 1) * limit,
      take:  limit,
    }),
    prisma.car.count({ where }),
  ])
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Véhicules</h1>
          <p className="text-dark-400 text-sm mt-0.5">{total} véhicule{total !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/admin/cars/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          Ajouter un véhicule
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Tous', value: '' },
          { label: 'Disponibles', value: 'AVAILABLE' },
          { label: 'Réservés',    value: 'RESERVED' },
          { label: 'Vendus',      value: 'SOLD' },
        ].map(({ label, value }) => (
          <Link
            key={value}
            href={`/admin/cars${value ? `?status=${value}` : ''}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border
              ${status === value
                ? 'bg-brand-500/10 text-brand-400 border-brand-500/30'
                : 'bg-dark-800 text-dark-400 border-dark-700 hover:text-white hover:border-dark-600'}`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        {cars.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-dark-400">Aucun véhicule trouvé</p>
            <Link href="/admin/cars/new" className="btn-primary mt-4 inline-flex">
              <Plus className="w-4 h-4" /> Ajouter
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700 text-xs text-dark-400 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium w-16">Photo</th>
                  <th className="text-left px-4 py-3 font-medium">Véhicule</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Prix</th>
                  <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Km</th>
                  <th className="text-center px-4 py-3 font-medium">Statut</th>
                  <th className="text-center px-4 py-3 font-medium w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {cars.map((car) => (
                  <tr key={car.id} className="hover:bg-dark-800/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="w-12 h-9 rounded-lg bg-dark-700 overflow-hidden">
                        {car.mainImage && (
                          <Image src={car.mainImage} alt={car.title} width={48} height={36}
                            className="w-full h-full object-cover" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {car.isFeatured && (
                          <Star className="w-3.5 h-3.5 text-brand-400 shrink-0" fill="currentColor" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{car.title}</p>
                          <p className="text-xs text-dark-400">{car.brand} · {car.year} · {car._count.reservations} rés.</p>
                        </div>
                        {car.offers.length > 0 && (
                          <span className="badge bg-brand-500/10 text-brand-400 border-brand-500/20 text-[10px]">PROMO</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className="text-sm font-bold text-white">{formatPrice(car.price)}</span>
                    </td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span className="text-sm text-dark-400">{formatMileage(car.mileage)}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge ${getStatusColor(car.status)}`}>
                        <span className={`status-dot ${
                          car.status === 'AVAILABLE' ? 'bg-emerald-400' :
                          car.status === 'RESERVED'  ? 'bg-amber-400'   : 'bg-red-400'
                        }`} />
                        {getStatusLabel(car.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link href={`/cars/${car.id}`} target="_blank"
                          className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700 transition-all">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link href={`/admin/cars/${car.id}/edit`}
                          className="p-1.5 text-dark-400 hover:text-brand-400 rounded-lg hover:bg-dark-700 transition-all">
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <AdminCarsActions carId={car.id} carTitle={car.title} carStatus={car.status} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={`/admin/cars?page=${p}${status ? `&status=${status}` : ''}`}
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
