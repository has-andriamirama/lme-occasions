// src/app/(admin)/admin/cars/new/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import CarForm from '@/components/admin/cars/CarForm'

export const metadata: Metadata = { title: 'Ajouter un véhicule' }

export default function NewCarPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/cars" className="btn-ghost p-2">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Nouveau véhicule</h1>
          <p className="text-dark-400 text-sm mt-0.5">Remplissez les informations du véhicule</p>
        </div>
      </div>
      <CarForm mode="create" />
    </div>
  )
}
