// src/components/public/home/AllCarsPreview.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import CarCard from '@/components/public/cars/CarCard'
import { useCarStatusUpdates } from '@/hooks/useCarStatusUpdates'
import { ArrowRight } from 'lucide-react'
import type { Car, Offer } from '@prisma/client'

type CarWithOffers = Car & { offers: Array<{ offer: Offer }> }

export default function AllCarsPreview({ cars: initialCars }: { cars: CarWithOffers[] }) {
  const [cars, setCars] = useState(initialCars)

  useCarStatusUpdates((carId, newStatus) => {
    setCars((prev) =>
      prev.map((c) => (c.id === carId ? { ...c, status: newStatus as Car['status'] } : c)))
  })

  return (
    <section id="vehicules" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-2">Notre sélection</p>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white">
            Véhicules disponibles
          </h2>
        </div>
        <Link href="/cars" className="btn-secondary text-sm shrink-0">
          Voir tout le catalogue <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger">
        {cars.map((car) => (
          <CarCard key={car.id} car={car} />
        ))}
      </div>
    </section>
  )
}
