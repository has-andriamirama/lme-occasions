// src/app/(public)/cars/page.tsx
import type { Metadata } from 'next'
import { Suspense } from 'react'
import prisma from '@/lib/db'
import CarsPageClient from '@/components/public/cars/CarsPageClient'

export const metadata: Metadata = {
  title: 'Catalogue',
  description: 'Parcourez l\'intégralité de nos véhicules d\'occasion. Filtrez par marque, prix, kilométrage et plus.',
}

async function getBrands() {
  const results = await prisma.car.groupBy({ by: ['brand'], orderBy: { brand: 'asc' } })
  return results.map((r) => r.brand)
}

export default async function CarsPage() {
  const brands = await getBrands()
  return (
    <Suspense fallback={<div className="pt-24 text-center text-dark-400">Chargement…</div>}>
      <CarsPageClient brands={brands} />
    </Suspense>
  )
}
