// src/app/api/contacts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { sendContactEmail } from '@/lib/mail'
import { broadcastAdminNotification, EVENTS } from '@/lib/pusher'
import { requireSession, apiError, validationError, parsePagination } from '@/lib/api'
import { z } from 'zod'

const contactSchema = z.object({
	name:    z.string().min(2).max(100),
	email:   z.string().email(),
	phone:   z.string().max(20).optional(),
	subject: z.string().max(200).optional(),
	message: z.string().min(10).max(2000),
})

const recentSubmits = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
	const now       = Date.now()
	const windowMs  = 60 * 60 * 1000
	const maxSubmits = 5
	const submissions = (recentSubmits.get(ip) ?? []).filter((t) => now - t < windowMs)
	if (submissions.length >= maxSubmits) return true
	recentSubmits.set(ip, [...submissions, now])
	return false
}

export async function POST(req: NextRequest) {
	try {
		const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
		if (isRateLimited(ip)) {
			return NextResponse.json(
				{ success: false, error: 'Trop de messages. Réessayez dans 1h.' },
				{ status: 429 }
			)
		}

		const body = await req.json()
		if (body.website) return NextResponse.json({ success: true }) // honeypot

		const parsed = contactSchema.safeParse(body)
		if (!parsed.success) return validationError(parsed.error.flatten())

		const contact = await prisma.contact.create({ data: parsed.data })

		Promise.all([
			sendContactEmail(parsed.data),
			broadcastAdminNotification(EVENTS.newContact, { contactId: contact.id, name: parsed.data.name }),
		]).catch(console.error)

		return NextResponse.json({ success: true, message: 'Message envoyé avec succès !' }, { status: 201 })
	} catch (err) {
		console.error('[POST /api/contacts]', err)
		return apiError('Erreur serveur')
	}
}

export async function GET(req: NextRequest) {
	try {
		const session = await requireSession()
		if (!session) return apiError('Non autorisé', 401)

		const { searchParams } = req.nextUrl
		const { page, limit, skip } = parsePagination(searchParams, { defaultLimit: 20, maxLimit: 50 })
		const isRead = searchParams.get('isRead')

		const where: Record<string, unknown> = {}
		if (isRead === 'true')  where.isRead = true
		if (isRead === 'false') where.isRead = false

		const [contacts, total] = await Promise.all([
			prisma.contact.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip,
				take:    limit,
			}),
			prisma.contact.count({ where }),
		])

		return NextResponse.json({
			success: true,
			data:    contacts,
			meta:    { total, page, limit, totalPages: Math.ceil(total / limit) },
		})
	} catch (err) {
		console.error('[GET /api/contacts]', err)
		return apiError('Erreur serveur')
	}
}
