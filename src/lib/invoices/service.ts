// src/lib/invoices/service.ts
import prisma from '@/lib/db'
import { uploadRawFile, deleteRawFile } from '@/lib/cloudinary'
import { renderInvoicePdf } from './pdf'
import type { InvoiceContext, InvoiceResult, InvoiceType } from './types'

const NUMBER_PREFIX: Record<InvoiceType, string> = {
	DEPOSIT: 'AC',
	TOTAL:   'FT',
}

async function nextInvoiceNumber(type: InvoiceType): Promise<string> {
	const year = new Date().getFullYear()
	const counter = await prisma.invoiceCounter.upsert({
		where:  { year_type: { year, type } },
		create: { year, type, lastSeq: 1 },
		update: { lastSeq: { increment: 1 } },
	})
	return `${NUMBER_PREFIX[type]}-${year}-${String(counter.lastSeq).padStart(4, '0')}`
}

export async function upsertInvoice(ctx: InvoiceContext): Promise<InvoiceResult | null> {
	try {
		const existing = await prisma.invoice.findUnique({
			where: { reservationId_type: { reservationId: ctx.reservationId, type: ctx.type } },
		})

		const amount   = ctx.type === 'DEPOSIT' ? ctx.depositAmount : ctx.totalPrice
		const number   = existing?.number ?? (await nextInvoiceNumber(ctx.type))
		const issuedAt = existing?.issuedAt ?? new Date()

		const pdfBuffer = await renderInvoicePdf(ctx, number, issuedAt)
		const { url, cloudinaryId } = await uploadRawFile(pdfBuffer, `${number}.pdf`)

		const saved = await prisma.invoice.upsert({
			where:  { reservationId_type: { reservationId: ctx.reservationId, type: ctx.type } },
			create: { reservationId: ctx.reservationId, type: ctx.type, number, amount, url, cloudinaryId },
			update: { amount, url, cloudinaryId },
		})

		return { id: saved.id, number: saved.number, type: saved.type as InvoiceType, url: saved.url, amount: saved.amount }
	} catch (err) {
		console.error(`[invoices] Échec de génération de la facture ${ctx.type} (réservation ${ctx.reservationId})`, err)
		return null
	}
}

export async function deleteInvoice(reservationId: string, type: InvoiceType): Promise<void> {
	try {
		const existing = await prisma.invoice.findUnique({
			where: { reservationId_type: { reservationId, type } },
		})
		if (!existing) return

		await deleteRawFile(existing.cloudinaryId)
		await prisma.invoice.delete({ where: { id: existing.id } })
	} catch (err) {
		console.error(`[invoices] Échec de suppression de la facture ${type} (réservation ${reservationId})`, err)
	}
}
