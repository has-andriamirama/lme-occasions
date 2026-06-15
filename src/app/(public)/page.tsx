// src/app/(public)/page.tsx
import type { Metadata } from 'next'
import prisma from '@/lib/db'
import HeroSection      from '@/components/public/home/HeroSection'
import FeaturedCars     from '@/components/public/home/FeaturedCars'
import OffersSection    from '@/components/public/home/OffersSection'
import StatsSection     from '@/components/public/home/StatsSection'
import ContactSection   from '@/components/public/home/ContactSection'
import AllCarsPreview   from '@/components/public/home/AllCarsPreview'

export const metadata: Metadata = {
  title: 'LME Occasions — Voitures d\'occasion premium',
  description: 'Trouvez votre prochain véhicule parmi notre sélection de voitures d\'occasion haut de gamme. Réservez en ligne avec un acompte sécurisé.',
}

export const revalidate = 60 // ISR every 60s

async function getData() {
  const now = new Date()
  const [featuredCars, allCars, activeOffers, stats] = await Promise.all([
    prisma.car.findMany({
      where: { isFeatured: true },
      include: { offers: { include: { offer: true }, where: { offer: { isActive: true, startDate: { lte: now }, endDate: { gte: now } } } } },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    prisma.car.findMany({
      include: { offers: { include: { offer: true }, where: { offer: { isActive: true, startDate: { lte: now }, endDate: { gte: now } } } } },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 8,
    }),
    prisma.offer.findMany({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      include: { cars: { include: { car: { select: { id: true, title: true, brand: true, mainImage: true } } } } },
      take: 3,
    }),
    Promise.all([
      prisma.car.count(),
      prisma.car.count({ where: { status: 'SOLD' } }),
      prisma.car.count({ where: { status: 'AVAILABLE' } }),
    ]),
  ])
  return { featuredCars, allCars, activeOffers, stats: { total: stats[0], sold: stats[1], available: stats[2] } }
}

export default async function HomePage() {
  const { featuredCars, allCars, activeOffers, stats } = await getData()

  return (
    <>
      <HeroSection stats={stats} />
      {featuredCars.length > 0 && <FeaturedCars cars={featuredCars} />}
      <AllCarsPreview cars={allCars} />
      {activeOffers.length > 0 && <OffersSection offers={activeOffers} />}
      <StatsSection stats={stats} />
      <ContactSection />
    </>
  )
}
