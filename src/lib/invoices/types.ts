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
