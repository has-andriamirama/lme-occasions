// src/app/sitemap.ts
import type { MetadataRoute } from 'next'
import prisma from '@/lib/db'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://localhost:3000'

	const cars = await prisma.car.findMany({
		where:  { status: { not: 'SOLD' } },
		select: { id: true, updatedAt: true },
	})

	const staticRoutes: MetadataRoute.Sitemap = [
		{ url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
		{ url: `${baseUrl}/cars`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
		{ url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
		{ url: `${baseUrl}/cgv`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
	]

	const carRoutes: MetadataRoute.Sitemap = cars.map((car) => ({
		url:             `${baseUrl}/cars/${car.id}`,
		lastModified:    car.updatedAt,
		changeFrequency: 'weekly',
		priority:        0.8,
	}))

	return [...staticRoutes, ...carRoutes]
}
