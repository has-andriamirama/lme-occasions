// src/lib/invoices/types.ts
export type InvoiceType = 'DEPOSIT' | 'TOTAL'

export interface InvoiceVehicle {
	title: string
	brand: string
	model: string
	year:  number
}

export interface InvoiceClient {
	name:  string
	email: string
	phone: string
}

export interface InvoiceContext {
	reservationId:         string
	reservationRef:        string
	type:                  InvoiceType
	vehicle:               InvoiceVehicle
	client:                InvoiceClient
	totalPrice:            number
	depositAmount:         number
	paymentMethodDeposit:  string
	paymentMethodBalance?: string | null
	balancePaidAt?:        Date | null
}

export interface InvoiceResult {
	id:     string
	number: string
	type:   InvoiceType
	url:    string
	amount: number
}

export function depositPaymentMethodLabel(paidOnline: boolean): string {
	return paidOnline
		? 'Carte bancaire (paiement en ligne sécurisé)'
		: 'Réglé en agence'
}

function resolveVatRate(): number {
	const raw    = process.env.INVOICE_VAT_RATE
	const parsed = raw !== undefined ? parseFloat(raw) : NaN
	return Number.isFinite(parsed) && parsed > 0 ? parsed / 100 : 0.085
}

export const VAT_RATE = resolveVatRate()

export interface VatBreakdown {
	ht:  number
	vat: number
	ttc: number
}

export function splitTtc(amountTtc: number, rate: number = VAT_RATE): VatBreakdown {
	const ht  = Math.round((amountTtc / (1 + rate)) * 100) / 100
	const vat = Math.round((amountTtc - ht) * 100) / 100
	return { ht, vat, ttc: amountTtc }
}
