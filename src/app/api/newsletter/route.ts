// src/app/api/newsletter/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { apiError, validationError } from '@/lib/api'
import { z } from 'zod'

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
	try {
		const body   = await req.json()
		const parsed = schema.safeParse(body)
		if (!parsed.success) return validationError(parsed.error.flatten())

		await prisma.newsletter.upsert({
			where:  { email: parsed.data.email },
			update: { isActive: true },
			create: { email: parsed.data.email },
		})
		return NextResponse.json({ success: true, message: 'Inscription réussie ! Bienvenue chez LME Occasions.' })
	} catch {
		return apiError('Erreur serveur')
	}
}
