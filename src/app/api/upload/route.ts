// src/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { requireSession, apiError } from '@/lib/api'

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key:    process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
})

const MAX_FILE_SIZE  = 5 * 1024 * 1024
const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

export async function POST(req: NextRequest) {
	try {
		const session = await requireSession()
		if (!session) return apiError('Non autorisé', 401)

		const formData = await req.formData()
		const file     = formData.get('file') as File | null
		const folder   = (formData.get('folder') as string) ?? 'lme-occasions/cars'

		if (!file)                              return apiError('Fichier manquant', 400)
		if (!ALLOWED_TYPES.includes(file.type)) return apiError('Format non supporté (JPEG, PNG, WebP uniquement)', 400)
		if (file.size > MAX_FILE_SIZE)          return apiError('Fichier trop volumineux (max 5 Mo)', 400)

		const bytes  = await file.arrayBuffer()
		const buffer = Buffer.from(bytes)

		const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{ folder, resource_type: 'image', transformation: [{ quality: 'auto', fetch_format: 'auto' }] },
					(err, res) => (err ? reject(err) : resolve(res as any))
				)
				.end(buffer)
		})

		return NextResponse.json({ success: true, data: { url: result.secure_url, publicId: result.public_id } })
	} catch (err) {
		console.error('[POST /api/upload]', err)
		return apiError("Erreur lors de l'upload")
	}
}
