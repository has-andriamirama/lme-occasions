// src/app/api/newsletter/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { z } from 'zod'

const schema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
	try {
		const body   = await req.json()
		const parsed = schema.safeParse(body)
		if (!parsed.success) {
			return NextResponse.json({ success: false, error: 'Email invalide' }, { status: 400 })
		}
		await prisma.newsletter.upsert({
			where:  { email: parsed.data.email },
			update: { isActive: true },
			create: { email: parsed.data.email },
		})
		return NextResponse.json({ success: true, message: 'Inscription réussie ! Bienvenue chez LME Occasions.' })
	} catch (err) {
		return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
	}
}
