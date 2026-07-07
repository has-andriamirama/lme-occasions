// src/lib/invoice.ts
import PDFDocument from 'pdfkit'
import { v2 as cloudinary } from 'cloudinary'
import prisma from '@/lib/db'
import { formatDate } from '@/lib/utils'

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key:    process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
})

function formatAmountForPdf(amount: number): string {
	const rounded = Math.round(amount * 100) / 100
	const [intPart, decPart] = rounded.toFixed(2).split('.')
	const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
	return `${grouped},${decPart} €`
}

const COMPANY_NAME    = 'LME OCCASIONS'
const COMPANY_TAGLINE = 'Premium Automobile'
const COMPANY_ADDRESS = '' // ex. "62 Bd du Chaudron, 97490 Sainte-Clotilde, La Réunion"
const COMPANY_LEGAL   = '' // ex. "SIRET 123 456 789 00012"

const GOLD  = '#B8962B'
const DARK  = '#141418'
const GRAY  = '#6B6B72'
const LGRAY = '#9C9CA3'
const LINE  = '#E5E5E5'
const BG    = '#F7F7F8'

export interface InvoicePdfInput {
	number:           string
	issueDate:        Date
	label:            string
	amount:           number
	paidAt:           Date
	isModification:   boolean
	reservationRef:   string
	clientName:       string
	clientEmail:      string
	clientPhone:      string
	carTitle:         string
	carBrand:         string
	carModel:         string
	carYear:          number
	totalPrice:       number
	totalPaidToDate:  number
}

function renderInvoicePdf(data: InvoicePdfInput): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		try {
			const doc    = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true })
			const chunks: Buffer[] = []
			doc.on('data', (chunk) => chunks.push(chunk))
			doc.on('end', () => resolve(Buffer.concat(chunks)))
			doc.on('error', reject)

			const PAGE_WIDTH  = doc.page.width
			const MARGIN      = 50
			const CW          = PAGE_WIDTH - MARGIN * 2
			const RIGHT       = MARGIN + CW
			const BOTTOM_SAFE = doc.page.height - doc.page.margins.bottom

			doc.font('Helvetica-Bold').fontSize(19).fillColor(DARK)
				.text(COMPANY_NAME, MARGIN, 50)
			doc.font('Helvetica').fontSize(9).fillColor(LGRAY)
				.text(COMPANY_TAGLINE, MARGIN, 72)
			if (COMPANY_ADDRESS) doc.text(COMPANY_ADDRESS, MARGIN, 85, { width: CW * 0.5 })
			if (COMPANY_LEGAL)   doc.text(COMPANY_LEGAL,   MARGIN, 98, { width: CW * 0.5 })

			const docTitle = data.isModification ? 'FACTURE RECTIFICATIVE' : 'FACTURE'
			doc.font('Helvetica-Bold').fontSize(15).fillColor(DARK)
				.text(docTitle, MARGIN, 50, { width: CW, align: 'right' })
			doc.font('Helvetica').fontSize(9).fillColor(LGRAY)
				.text(`N° ${data.number}`, MARGIN, 71, { width: CW, align: 'right' })
				.text(`Émise le ${formatDate(data.issueDate)}`, MARGIN, 83, { width: CW, align: 'right' })
				.text(`Réf. réservation #${data.reservationRef}`, MARGIN, 95, { width: CW, align: 'right' })

			doc.moveTo(MARGIN, 118).lineTo(RIGHT, 118).strokeColor(GOLD).lineWidth(1.5).stroke()

			let y = 134

			if (data.isModification) {
				doc.rect(MARGIN, y, CW, 32).fill('#FDF3E4')
				doc.font('Helvetica-Bold').fontSize(9).fillColor('#8A6116')
					.text(
						'Ce document annule et remplace une facture précédemment émise pour ce paiement.',
						MARGIN + 12, y + 11, { width: CW - 24 }
					)
				y += 32 + 18
			}

			// ── Header ──────────────────────────────────────────────────────────
			const colW = CW / 2 - 10
			doc.font('Helvetica-Bold').fontSize(9).fillColor(GRAY)
				.text('CLIENT', MARGIN, y)
				.text('VÉHICULE CONCERNÉ', MARGIN + CW / 2, y)
			y += 16

			doc.font('Helvetica').fontSize(10)
			const carLine1 = `${data.carBrand} ${data.carModel} ${data.carYear}`
			const line1H = Math.max(
				doc.heightOfString(data.clientName, { width: colW }),
				doc.heightOfString(carLine1, { width: colW }),
				12,
			)
			doc.fillColor(DARK).text(data.clientName, MARGIN, y, { width: colW })
			doc.text(carLine1, MARGIN + CW / 2, y, { width: colW })
			y += line1H + 3

			doc.fontSize(9)
			const line2H = Math.max(doc.heightOfString(data.carTitle, { width: colW }), 11)
			doc.fillColor(GRAY).text(data.clientEmail, MARGIN, y, { width: colW })
			doc.text(data.carTitle, MARGIN + CW / 2, y, { width: colW })
			y += line2H + 3

			if (data.clientPhone) doc.text(data.clientPhone, MARGIN, y, { width: colW })
			y += 24

			// ── Paiement table ─────────────────────────────────────────────────
			const rowH  = 26
			const headH = 24
			const c1 = MARGIN
			const c2 = MARGIN + CW * 0.55
			const c3 = MARGIN + CW * 0.75

			doc.rect(MARGIN, y, CW, headH).fill(DARK)
			doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#FFFFFF')
				.text('DESCRIPTION', c1 + 10, y + 8)
				.text('DATE DE PAIEMENT', c2 + 4, y + 8)
				.text('MONTANT', c3, y + 8, { width: RIGHT - c3 - 10, align: 'right' })

			y += headH
			doc.rect(MARGIN, y, CW, rowH).fillAndStroke(BG, LINE)
			doc.font('Helvetica').fontSize(9.5).fillColor(DARK)
				.text(data.label, c1 + 10, y + 8, { width: c2 - c1 - 14 })
				.text(formatDate(data.paidAt), c2 + 4, y + 8)
			doc.font('Helvetica-Bold')
				.text(formatAmountForPdf(data.amount), c3, y + 8, { width: RIGHT - c3 - 10, align: 'right' })

			y += rowH + 24

			// ── Recap ──────────────────────────────────────────────────────────
			const remaining  = Math.max(0, data.totalPrice - data.totalPaidToDate)
			const summaryX   = MARGIN + CW * 0.45
			const summaryW   = RIGHT - summaryX

			function summaryLine(label: string, value: string, bold = false, color = DARK) {
				const size = bold ? 11 : 9.5
				doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(GRAY)
					.text(label, summaryX, y, { width: summaryW * 0.55 })
				doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(color)
					.text(value, summaryX + summaryW * 0.55, y, { width: summaryW * 0.45, align: 'right' })
				y += bold ? 20 : 16
			}

			summaryLine('Prix total du véhicule', formatAmountForPdf(data.totalPrice))
			summaryLine('Total réglé à ce jour',  formatAmountForPdf(data.totalPaidToDate))
			doc.moveTo(summaryX, y + 2).lineTo(RIGHT, y + 2).strokeColor(LINE).lineWidth(1).stroke()
			y += 10
			summaryLine(
				remaining > 0 ? 'Reste à payer' : 'Solde',
				remaining > 0 ? formatAmountForPdf(remaining) : 'Intégralement réglé',
				true,
				remaining > 0 ? DARK : '#1E8E5A',
			)

			// ── Footter ───────────────────────────────────────────────────────────
			doc.font('Helvetica').fontSize(8)
			const disclaimer = 'Ce document constitue un reçu attestant du paiement décrit ci-dessus, dans le cadre de la ' +
				'vente du véhicule mentionné. Il ne se substitue pas à la facture finale de vente établie lors de la remise du véhicule.'
			const disclaimerH = doc.heightOfString(disclaimer, { width: CW, align: 'center' })
			const footerY     = BOTTOM_SAFE - (disclaimerH + 10 + 14)

			doc.moveTo(MARGIN, footerY - 12).lineTo(RIGHT, footerY - 12).strokeColor(LINE).lineWidth(1).stroke()
			doc.fillColor(LGRAY).text(disclaimer, MARGIN, footerY, { width: CW, align: 'center' })
			doc.text(`${COMPANY_NAME} — ${COMPANY_TAGLINE}`, MARGIN, footerY + disclaimerH + 10, { width: CW, align: 'center' })

			doc.end()
		} catch (err) {
			reject(err)
		}
	})
}

async function uploadInvoicePdf(buffer: Buffer, number: string): Promise<{ url: string; publicId: string }> {
	const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
		cloudinary.uploader
			.upload_stream(
				{
					folder:        'lme-occasions/invoices',
					public_id:     number,
					format:        'pdf',
					resource_type: 'raw',
					overwrite:     true,
				},
				(err, res) => (err ? reject(err) : resolve(res as any))
			)
			.end(buffer)
	})
	return { url: result.secure_url, publicId: result.public_id }
}

async function deleteInvoicePdfSafe(publicId: string): Promise<void> {
	try {
		await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
	} catch (err) {
		console.error('[invoice] Suppression du fichier Cloudinary échouée (non-critique) :', err)
	}
}

function buildInvoiceNumber(invoiceId: string, issueDate: Date): string {
	return `FAC-${issueDate.getFullYear()}-${invoiceId.slice(-8).toUpperCase()}`
}

export interface InvoiceContext {
	clientName:      string
	clientEmail:     string
	clientPhone:     string
	carTitle:        string
	carBrand:        string
	carModel:        string
	carYear:         number
	totalPrice:      number
	totalPaidToDate: number
}

export interface IssuedInvoice {
	id:     string
	number: string
	pdfUrl: string
}

async function issueInvoice(opts: {
	reservationId:  string
	depositForId:   string | null
	installmentId:  string | null
	kind:           'DEPOSIT' | 'INSTALLMENT'
	label:          string
	amount:         number
	paidAt:         Date
	isModification: boolean
	context:        InvoiceContext
}): Promise<IssuedInvoice | null> {
	try {
		const existing = opts.kind === 'DEPOSIT'
			? await prisma.invoice.findUnique({ where: { depositForId: opts.reservationId } })
			: await prisma.invoice.findUnique({ where: { installmentId: opts.installmentId! } })

		if (existing) {
			await deleteInvoicePdfSafe(existing.pdfPublicId)
			await prisma.invoice.delete({ where: { id: existing.id } })
		}

		const created = await prisma.invoice.create({
			data: {
				number:        `PENDING-${Date.now()}`,
				reservationId: opts.reservationId,
				depositForId:  opts.depositForId,
				installmentId: opts.installmentId,
				kind:          opts.kind,
				label:         opts.label,
				amount:        opts.amount,
				paidAt:        opts.paidAt,
				pdfUrl:        '',
				pdfPublicId:   '',
			},
		})

		const number = buildInvoiceNumber(created.id, created.createdAt)

		const pdfBuffer = await renderInvoicePdf({
			number,
			issueDate:       created.createdAt,
			label:           opts.label,
			amount:          opts.amount,
			paidAt:          opts.paidAt,
			isModification:  opts.isModification,
			reservationRef:  opts.reservationId.slice(-8).toUpperCase(),
			...opts.context,
		})

		const { url, publicId } = await uploadInvoicePdf(pdfBuffer, number)

		return await prisma.invoice.update({
			where: { id: created.id },
			data:  { number, pdfUrl: url, pdfPublicId: publicId },
		})
	} catch (err) {
		console.error('[invoice] Émission de facture échouée (non-critique) :', err)
		return null
	}
}

export async function issueDepositInvoice(params: {
	reservationId:  string
	amount:         number
	paidAt:         Date
	isModification: boolean
	context:        InvoiceContext
}): Promise<IssuedInvoice | null> {
	return issueInvoice({
		reservationId:  params.reservationId,
		depositForId:   params.reservationId,
		installmentId:  null,
		kind:           'DEPOSIT',
		label:          'Acompte à la réservation',
		amount:         params.amount,
		paidAt:         params.paidAt,
		isModification: params.isModification,
		context:        params.context,
	})
}

export async function issueInstallmentInvoice(params: {
	reservationId:      string
	installmentId:      string
	installmentNumber:  number
	totalInstallments:  number
	amount:             number
	paidAt:             Date
	isModification:     boolean
	context:            InvoiceContext
}): Promise<IssuedInvoice | null> {
	const label = params.totalInstallments > 1
		? `Tranche ${params.installmentNumber} / ${params.totalInstallments}`
		: 'Solde'

	return issueInvoice({
		reservationId:  params.reservationId,
		depositForId:   null,
		installmentId:  params.installmentId,
		kind:           'INSTALLMENT',
		label,
		amount:         params.amount,
		paidAt:         params.paidAt,
		isModification: params.isModification,
		context:        params.context,
	})
}

export async function voidInstallmentInvoice(installmentId: string): Promise<void> {
	try {
		const existing = await prisma.invoice.findUnique({ where: { installmentId } })
		if (!existing) return
		await deleteInvoicePdfSafe(existing.pdfPublicId)
		await prisma.invoice.delete({ where: { id: existing.id } })
	} catch (err) {
		console.error('[invoice] Suppression de facture échouée (non-critique) :', err)
	}
}
