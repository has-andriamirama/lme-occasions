// src/app/(admin)/admin/cars/[id]/edit/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import prisma from '@/lib/db'
import CarForm from '@/components/admin/cars/CarForm'

export const metadata: Metadata = { title: 'Modifier le véhicule' }

export default async function EditCarPage({ params }: { params: { id: string } }) {
  const car = await prisma.car.findUnique({ where: { id: params.id } })
  if (!car) notFound()

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/cars" className="btn-ghost p-2">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Modifier : {car.title}</h1>
          <p className="text-dark-400 text-sm mt-0.5">{car.brand} {car.model} · {car.year}</p>
        </div>
      </div>
      <CarForm
        mode="edit"
        initialData={{
          id: car.id,
          title: car.title, brand: car.brand, model: car.model, year: car.year,
          mileage: car.mileage, price: car.price, description: car.description,
          mainImage: car.mainImage, images: car.images, equipments: car.equipments,
          status: car.status, isFeatured: car.isFeatured,
          transmission: car.transmission, fuelType: car.fuelType,
          color: car.color ?? '', engineSize: car.engineSize ?? '',
          seats: car.seats ?? 5, doors: car.doors ?? 4,
          condition: car.condition ?? '', allowInstallment: car.allowInstallment,
        }}
      />
    </div>
  )
}
