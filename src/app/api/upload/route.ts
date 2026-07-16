// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { uploadImage, CAR_IMAGES_FOLDER } from '@/lib/cloudinary'
import { requireSession, apiError } from '@/lib/api'

type UploadKind = 'car'

interface UploadKindConfig {
	folder:       string
	maxFileSize:  number
	allowedTypes: string[]
	formatsLabel: string
}

const UPLOAD_KINDS: Record<UploadKind, UploadKindConfig> = {
	car: {
		folder:       CAR_IMAGES_FOLDER,
		maxFileSize:  5 * 1024 * 1024,
		allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
		formatsLabel: 'JPEG, PNG, WebP, AVIF',
	},
}

export async function POST(req: NextRequest) {
	try {
		const session = await requireSession()
		if (!session) return apiError('Non autorisé', 401)

		const formData = await req.formData()
		const file = formData.get('file') as File | null
		const kind = (formData.get('type') as string | null) ?? 'car'

		const config = UPLOAD_KINDS[kind as UploadKind]
		if (!config) return apiError("Type d'upload inconnu", 400)

		if (!file)                                    return apiError('Fichier manquant', 400)
		if (!config.allowedTypes.includes(file.type)) return apiError(`Format non supporté (${config.formatsLabel} uniquement)`, 400)
		if (file.size > config.maxFileSize)           return apiError(`Fichier trop volumineux (max ${Math.round(config.maxFileSize / 1024 / 1024)} Mo)`, 400)

		const bytes  = await file.arrayBuffer()
		const buffer = Buffer.from(bytes)

		const { url, publicId } = await uploadImage(buffer, config.folder)

		return NextResponse.json({ success: true, data: { url, publicId } })
	} catch (err) {
		console.error('[POST /api/upload]', err)
		return apiError("Erreur lors de l'upload")
	}
}
