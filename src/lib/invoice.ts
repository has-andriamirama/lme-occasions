// src/lib/invoice.ts
import PDFDocument from 'pdfkit'
import { v2 as cloudinary } from 'cloudinary'
import prisma from '@/lib/db'
import { formatPrice, formatDate } from '@/lib/utils'

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key:    process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface InvoiceData {
	reservationId:   string
	invoiceNumber:   string
	invoiceDate:     Date
	type:            'DEPOSIT' | 'FULL'
	clientName:      string
	clientEmail:     string
	clientPhone:     string
	carTitle:        string
	carBrand:        string
	carModel:        string
	carYear:         number
	totalPrice:      number
	depositAmount:   number
}

export function generateInvoicePdfBuffer(data: InvoiceData): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		try {
			const doc = new PDFDocument({ size: 'A4', margin: 50 })
			const chunks: Buffer[] = []

			doc.on('data', (chunk: Buffer) => chunks.push(chunk))
			doc.on('end', () => resolve(Buffer.concat(chunks)))
			doc.on('error', (err: any) => reject(err))

			const GOLD = '#D4AF37'
			const DARK = '#141418'
			const GRAY_LIGHT = '#F4F4F6'
			const TEXT_DARK = '#2A2A2A'
			const TEXT_MUTED = '#666666'

			// --- HEADER ---
			doc.fillColor(DARK).font('Helvetica-Bold').fontSize(24).text('LME OCCASIONS', 50, 50)
			doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(10).text('PREMIUM AUTOMOBILE', 50, 75)

			const titleText = data.type === 'DEPOSIT' ? "FACTURE D'ACOMPTE" : "FACTURE DE TOTALITÉ"
			doc.fillColor(DARK).font('Helvetica-Bold').fontSize(16).text(titleText, 350, 50, { align: 'right' })
			doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9).text(`N° ${data.invoiceNumber}`, 350, 70, { align: 'right' })
			doc.text(`Date : ${formatDate(data.invoiceDate)}`, 350, 83, { align: 'right' })

			doc.strokeColor(GOLD).lineWidth(2).moveTo(50, 110).lineTo(545, 110).stroke()

			// --- SENDER & RECIPIENT INFORMATION ---
			let y = 135
			
			doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text('LME Occasions Premium', 50, y)
			doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9.5)
				.text('123 Rue de l\'Automobile', 50, y + 18)
				.text('75017 Paris, France', 50, y + 32)
				.text('Email : contact@lme-occasions.fr', 50, y + 46)
				.text('Tél : +33 1 23 45 67 89', 50, y + 60)

			doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text('Destinataire / Client', 350, y)
			doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9.5)
				.text(data.clientName, 350, y + 18)
				.text(`Email : ${data.clientEmail}`, 350, y + 32)
				.text(`Tél : ${data.clientPhone}`, 350, y + 46)
				.text(`Réf Réservation : #${data.reservationId.slice(-8).toUpperCase()}`, 350, y + 60)

			// --- VEHICLE SECTION HEADER ---
			y = 230
			doc.fillColor(DARK).font('Helvetica-Bold').fontSize(12).text('DÉTAILS DU VÉHICULE & PRESTATION', 50, y)
			doc.strokeColor(GRAY_LIGHT).lineWidth(1).moveTo(50, y + 15).lineTo(545, y + 15).stroke()

			// --- TABLE ---
			y = 260
			
			doc.rect(50, y, 495, 22).fill(DARK)

			doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9)
				.text('Description du véhicule', 60, y + 7)
				.text('Année', 320, y + 7)
				.text('Prix Unitaire', 440, y + 7, { align: 'right', width: 95 })

			y = 282
			doc.rect(50, y, 495, 30).fill(GRAY_LIGHT)
			
			const vehicleDesc = `${data.carBrand} ${data.carModel} — ${data.carTitle}`
			doc.fillColor(TEXT_DARK).font('Helvetica-Bold').fontSize(9.5)
				.text(vehicleDesc, 60, y + 10, { width: 250 })
				.font('Helvetica')
				.text(data.carYear.toString(), 320, y + 10)
				.font('Helvetica-Bold')
				.text(formatPrice(data.totalPrice), 440, y + 10, { align: 'right', width: 95 })

			// --- PAYMENT BREAKDOWN / TOTALS ---
			y = 330
			const rightColX = 350
			const valueColX = 460
			const textW = 100
			const valW = 75

			doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9.5)
				.text('Prix Total Véhicule :', rightColX, y)
				.fillColor(TEXT_DARK).font('Helvetica-Bold')
				.text(formatPrice(data.totalPrice), valueColX, y, { align: 'right', width: valW })

			y += 18
			const paidLabel = data.type === 'DEPOSIT' ? 'Acompte Payé :' : 'Montant Déjà Réglé :'
			const paidValue = data.type === 'DEPOSIT' ? data.depositAmount : data.totalPrice
			doc.fillColor(TEXT_MUTED).font('Helvetica')
				.text(paidLabel, rightColX, y)
				.fillColor(TEXT_DARK).font('Helvetica-Bold')
				.text(formatPrice(paidValue), valueColX, y, { align: 'right', width: valW })

			y += 18
			const remainingLabel = data.type === 'DEPOSIT' ? 'Solde Restant :' : 'Reste à Régler :'
			const remainingValue = data.type === 'DEPOSIT' ? Math.max(0, data.totalPrice - data.depositAmount) : 0
			doc.fillColor(TEXT_MUTED).font('Helvetica')
				.text(remainingLabel, rightColX, y)
				.fillColor(TEXT_DARK).font('Helvetica-Bold')
				.text(formatPrice(remainingValue), valueColX, y, { align: 'right', width: valW })

			y += 24
			doc.rect(rightColX, y - 4, 195, 25).fill(GOLD)
			doc.fillColor(DARK).font('Helvetica-Bold').fontSize(10.5)
				.text('TOTAL PAYÉ :', rightColX + 10, y + 3)
				.text(formatPrice(paidValue), valueColX + 10, y + 3, { align: 'right', width: valW - 10 })

			// --- TERMS / FOOTER ---
			y = 440
			doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text('Conditions de règlement', 50, y)
			doc.strokeColor(GRAY_LIGHT).lineWidth(1).moveTo(50, y + 15).lineTo(545, y + 15).stroke()

			y += 25
			doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8.5).text(
				data.type === 'DEPOSIT'
					? "Cet acompte de 30% confirme votre intention d'achat. Conformément à nos conditions générales de vente, vous disposez d'un délai de 5 jours à compter de la date de réservation pour vous présenter en agence, signer le contrat définitif et acquitter le solde restant. Passé ce délai, la réservation sera annulée et l'acompte sera conservé."
					: "Ce document atteste du règlement intégral du véhicule désigné ci-dessus. Le transfert de propriété et la remise des clés s'effectueront après signature du contrat de vente définitif et réalisation des démarches administratives associées.",
				50, y, { width: 495, align: 'justify', lineGap: 3 }
			)

			y += 65
			doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(11).text('Merci pour votre confiance !', 50, y, { align: 'center', width: 495 })
			doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8).text('LME Occasions Premium Automobile — SAS au capital de 100 000€ — RCS Paris 123 456 789', 50, y + 20, { align: 'center', width: 495 })

			doc.end()
		} catch (err) {
			reject(err)
		}
	})
}

export async function uploadInvoiceToCloudinary(buffer: Buffer, publicId: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(
			{
				folder: 'invoices',
				public_id: publicId,
				resource_type: 'raw',
				format: 'pdf',
				overwrite: true,
			},
			(error, result) => {
				if (error) {
					console.error('[Cloudinary PDF Upload Error]', error)
					reject(error)
				} else {
					resolve(result!.secure_url)
				}
			}
		)
		stream.end(buffer)
	})
}

export async function deleteInvoiceFromCloudinary(url: string | null | undefined): Promise<void> {
	if (!url) return
	try {
		const match = url.match(/\/invoices\/(facture_[a-zA-Z0-9_-]+\.pdf)/)
		if (match) {
			const publicId = `invoices/${match[1]}`
			console.log(`[Cloudinary PDF Delete] Deleting public_id: ${publicId}`)
			await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
		} else {
			const parts = url.split('/upload/')
			if (parts.length > 1) {
				const pathParts = parts[1].split('/')
				if (pathParts[0].startsWith('v') && /^\d+$/.test(pathParts[0].slice(1))) {
					pathParts.shift()
				}
				const publicId = pathParts.join('/')
				console.log(`[Cloudinary PDF Delete Fallback] Deleting public_id: ${publicId}`)
				await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
			}
		}
	} catch (err) {
		console.error('[Cloudinary PDF Delete] Error deleting file:', err)
	}
}

export async function generateAndUploadInvoice(
	reservationId: string,
	type: 'DEPOSIT' | 'FULL'
): Promise<string> {
	const r = await prisma.reservation.findUnique({
		where:   { id: reservationId },
		include: { car: true },
	})
	if (!r) throw new Error(`Reservation ${reservationId} not found`)

	const suffix = type === 'DEPOSIT' ? 'AC' : 'TOT'
	const invoiceNumber = `FAC-${r.id.slice(-8).toUpperCase()}-${suffix}`
	const invoiceDate = r.paidAt ?? r.confirmedAt ?? r.reservedAt ?? new Date()

	const buffer = await generateInvoicePdfBuffer({
		reservationId,
		invoiceNumber,
		invoiceDate,
		type,
		clientName:    r.clientName,
		clientEmail:   r.clientEmail,
		clientPhone:   r.clientPhone,
		carTitle:      r.car.title,
		carBrand:      r.car.brand,
		carModel:      r.car.model,
		carYear:       r.car.year,
		totalPrice:    r.totalPrice,
		depositAmount: r.depositAmount,
	})

	const fileName = `facture_${type.toLowerCase()}_${r.id}.pdf`
	const url = await uploadInvoiceToCloudinary(buffer, fileName)

	if (type === 'DEPOSIT') {
		await prisma.reservation.update({
			where: { id: r.id },
			data:  { depositInvoiceUrl: url },
		})
	} else {
		await prisma.reservation.update({
			where: { id: r.id },
			data:  { fullInvoiceUrl: url },
		})
	}

	return url
}
