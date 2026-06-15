// src/app/(admin)/admin/offers/page.tsx
import type { Metadata } from 'next'
import prisma from '@/lib/db'
import { formatDate, formatPrice } from '@/lib/utils'
import { Tag, Plus } from 'lucide-react'
import OffersClient from '@/components/admin/offers/OffersClient'

export const metadata: Metadata = { title: 'Offres & Promotions' }

export default async function OffersPage() {
  const now = new Date()
  const [offers, cars] = await Promise.all([
    prisma.offer.findMany({
      include: { cars: { include: { car: { select: { id: true, title: true, brand: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.car.findMany({
      where:   { status: 'AVAILABLE' },
      select:  { id: true, title: true, brand: true, model: true, year: true },
      orderBy: { brand: 'asc' },
    }),
  ])

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Offres & Promotions</h1>
          <p className="text-dark-400 text-sm mt-0.5">{offers.length} offre{offers.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <OffersClient offers={offers} availableCars={cars} />
    </div>
  )
}
