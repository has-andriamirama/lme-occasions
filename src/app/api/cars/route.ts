// src/app/api/cars/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { z } from 'zod'

const carSchema = z.object({
  title:           z.string().min(3).max(200),
  brand:           z.string().min(1).max(100),
  model:           z.string().min(1).max(100),
  year:            z.number().int().min(1900).max(new Date().getFullYear() + 1),
  mileage:         z.number().int().min(0),
  price:           z.number().positive(),
  description:     z.string().min(10),
  mainImage:       z.string().url(),
  images:          z.array(z.string().url()).default([]),
  equipments:      z.array(z.string()).default([]),
  status:          z.enum(['AVAILABLE', 'RESERVED', 'SOLD']).default('AVAILABLE'),
  isFeatured:      z.boolean().default(false),
  transmission:    z.enum(['MANUAL', 'AUTOMATIC', 'SEMI_AUTOMATIC']).default('MANUAL'),
  fuelType:        z.enum(['GASOLINE', 'DIESEL', 'ELECTRIC', 'HYBRID', 'GPL']).default('GASOLINE'),
  color:           z.string().optional(),
  engineSize:      z.string().optional(),
  seats:           z.number().int().min(1).max(20).optional(),
  doors:           z.number().int().min(2).max(7).optional(),
  condition:       z.string().optional(),
  allowInstallment:z.boolean().default(false),
})

// ── GET — Public car listing with filters ────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const page       = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit      = Math.min(24, Math.max(1, Number(searchParams.get('limit') ?? 12)))
    const skip       = (page - 1) * limit
    const search     = searchParams.get('search') ?? ''
    const brand      = searchParams.get('brand') ?? ''
    const status     = searchParams.get('status') ?? ''
    const fuelType   = searchParams.get('fuelType') ?? ''
    const transmission = searchParams.get('transmission') ?? ''
    const minPrice   = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined
    const maxPrice   = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined
    const minYear    = searchParams.get('minYear')  ? Number(searchParams.get('minYear'))  : undefined
    const maxYear    = searchParams.get('maxYear')  ? Number(searchParams.get('maxYear'))  : undefined
    const maxMileage = searchParams.get('maxMileage') ? Number(searchParams.get('maxMileage')) : undefined
    const isFeatured = searchParams.get('isFeatured') === 'true' ? true : undefined
    const sortBy     = searchParams.get('sortBy') ?? 'newest'

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { title:       { contains: search, mode: 'insensitive' } },
        { brand:       { contains: search, mode: 'insensitive' } },
        { model:       { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (brand)        where.brand       = { equals: brand, mode: 'insensitive' }
    if (status && status !== 'ALL') where.status = status
    if (fuelType)     where.fuelType    = fuelType
    if (transmission) where.transmission = transmission
    if (isFeatured !== undefined) where.isFeatured = isFeatured
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) (where.price as any).gte = minPrice
      if (maxPrice) (where.price as any).lte = maxPrice
    }
    if (minYear || maxYear) {
      where.year = {}
      if (minYear) (where.year as any).gte = minYear
      if (maxYear) (where.year as any).lte = maxYear
    }
    if (maxMileage) where.mileage = { lte: maxMileage }

    const orderByMap: Record<string, unknown> = {
      newest:      { createdAt: 'desc' },
      price_asc:   { price: 'asc' },
      price_desc:  { price: 'desc' },
      year_desc:   { year: 'desc' },
      year_asc:    { year: 'asc' },
      mileage_asc: { mileage: 'asc' },
    }

    const [cars, total] = await Promise.all([
      prisma.car.findMany({
        where,
        include: {
          offers: {
            include: { offer: true },
            where: {
              offer: {
                isActive: true,
                startDate: { lte: new Date() },
                endDate:   { gte: new Date() },
              },
            },
          },
        },
        orderBy: orderByMap[sortBy] ?? { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.car.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: cars,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error('[GET /api/cars]', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── POST — Create car (admin only) ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = carSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const car = await prisma.car.create({ data: parsed.data })

    await prisma.auditLog.create({
      data: {
        adminId:  session.user.id,
        action:   'CREATE',
        entity:   'Car',
        entityId: car.id,
        details:  { title: car.title, brand: car.brand },
      },
    })

    return NextResponse.json({ success: true, data: car }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/cars]', err)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
