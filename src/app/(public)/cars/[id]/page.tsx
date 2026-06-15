// src/app/(public)/cars/[id]/page.tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import prisma from '@/lib/db'
import CarDetailClient from '@/components/public/cars/CarDetailClient'

interface Props { params: { id: string }; searchParams: { success?: string; cancelled?: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const car = await prisma.car.findUnique({ where: { id: params.id } })
  if (!car) return { title: 'Véhicule introuvable' }
  return {
    title: car.title,
    description: car.description.slice(0, 160),
    openGraph: { images: [{ url: car.mainImage, width: 800, height: 600 }] },
  }
}

export default async function CarDetailPage({ params, searchParams }: Props) {
  const now = new Date()
  const car = await prisma.car.findUnique({
    where: { id: params.id },
    include: {
      offers: {
        include: { offer: true },
        where: { offer: { isActive: true, startDate: { lte: now }, endDate: { gte: now } } },
      },
    },
  })
  if (!car) notFound()

  return (
    <CarDetailClient
      car={car}
      paymentSuccess={searchParams.success === 'true'}
      paymentCancelled={searchParams.cancelled === 'true'}
    />
  )
}
