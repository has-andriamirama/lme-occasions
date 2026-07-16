// src/lib/cloudinary.ts
import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from 'cloudinary'

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key:    process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
	secure:     true,
})

export default cloudinary

export const CAR_IMAGES_FOLDER = 'lme-occasions/cars'
export const INVOICE_FOLDER    = 'lme-occasions/invoices'

export type CloudinaryResourceType = 'image' | 'raw'

export function uploadBuffer(buffer: Buffer, options: UploadApiOptions): Promise<UploadApiResponse> {
	return new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
			if (error || !result) {
				reject(error ?? new Error("Échec de l'upload Cloudinary"))
				return
			}
			resolve(result)
		})
		stream.end(buffer)
	})
}

export async function deleteAsset(publicId: string, resourceType: CloudinaryResourceType): Promise<void> {
	await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true })
}

export interface UploadedAsset {
	url:      string
	publicId: string
}

export async function uploadImage(buffer: Buffer, folder: string = CAR_IMAGES_FOLDER): Promise<UploadedAsset> {
	const result = await uploadBuffer(buffer, {
		folder,
		resource_type: 'image',
		transformation: [{ quality: 'auto', fetch_format: 'auto' }],
	})
	return { url: result.secure_url, publicId: result.public_id }
}

export async function deleteImage(publicId: string): Promise<void> {
	await deleteAsset(publicId, 'image')
}

export async function uploadRawFile(
	buffer: Buffer,
	publicId: string,
	folder: string = INVOICE_FOLDER,
): Promise<{ url: string; cloudinaryId: string }> {
	const fullPublicId = `${folder}/${publicId}`

	const result = await uploadBuffer(buffer, {
		resource_type: 'raw',
		public_id:     fullPublicId,
		asset_folder:  folder,
		overwrite:     true,
		invalidate:    true,
	})

	return { url: result.secure_url, cloudinaryId: result.public_id }
}

export async function deleteRawFile(cloudinaryId: string): Promise<void> {
	await deleteAsset(cloudinaryId, 'raw')
}
