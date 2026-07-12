// src/lib/cloudinary.ts
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary'

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key:    process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
	secure:     true,
})

export default cloudinary

export const INVOICE_FOLDER = 'lme-occasions/invoices'

export async function uploadRawFile(
	buffer: Buffer,
	publicId: string,
	folder: string = INVOICE_FOLDER,
): Promise<{ url: string; cloudinaryId: string }> {
	const fullPublicId = `${folder}/${publicId}`

	const result = await new Promise<UploadApiResponse>((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(
			{
				resource_type: 'raw',
				public_id: fullPublicId,
				asset_folder: folder,
				overwrite: true,
				invalidate: true,
			},
			(error, uploadResult) => {
				if (error || !uploadResult) {
					reject(error ?? new Error("Échec de l'upload Cloudinary"))
					return
				}
				resolve(uploadResult)
			},
		)
		stream.end(buffer)
	})

	return { url: result.secure_url, cloudinaryId: result.public_id }
}

export async function deleteRawFile(cloudinaryId: string): Promise<void> {
	await cloudinary.uploader.destroy(cloudinaryId, { resource_type: 'raw', invalidate: true })
}
