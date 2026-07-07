// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function formatPrice(price: number, currency = 'EUR'): string {
	return new Intl.NumberFormat('fr-FR', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(price)
}

export function formatPriceExact(price: number, currency = 'EUR'): string {
	return new Intl.NumberFormat('fr-FR', {
		style: 'currency',
		currency,
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(price)
}

export function formatMileage(mileage: number): string {
	return new Intl.NumberFormat('fr-FR').format(mileage) + ' km'
}

export function formatDate(date: Date | string): string {
	return new Intl.DateTimeFormat('fr-FR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	}).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
	return new Intl.DateTimeFormat('fr-FR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(date))
}

export function calculateDeposit(price: number, percentage = 30): number {
	return Math.round(price * (percentage / 100))
}

export function calculateDiscountedPrice(
	price: number,
	offerType: 'PERCENTAGE' | 'FIXED_AMOUNT',
	offerValue: number
): number {
	if (offerType === 'PERCENTAGE') {
		return price * (1 - offerValue / 100)
	}
	return Math.max(0, price - offerValue)
}

export function getDaysRemaining(expiresAt: Date | string): number {
	const now = new Date()
	const expiry = new Date(expiresAt)
	const diff = expiry.getTime() - now.getTime()
	return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export type OfferStatusComputed = 'ACTIVE' | 'PAUSED' | 'SCHEDULED' | 'EXPIRED'

export function getOfferStatus(
	offer: { startDate: Date | string; endDate: Date | string; isActive: boolean },
	now: Date | string = new Date()
): OfferStatusComputed {
	const start = new Date(offer.startDate)
	const end   = new Date(offer.endDate)
	const at    = new Date(now)

	if (end < at) return 'EXPIRED'
	if (!offer.isActive) return 'PAUSED'
	if (start > at) return 'SCHEDULED'
	return 'ACTIVE'
}

export function getOfferStatusLabel(status: OfferStatusComputed): string {
	const labels: Record<OfferStatusComputed, string> = {
		ACTIVE:    'Active',
		PAUSED:    'En pause',
		SCHEDULED: 'Programmée',
		EXPIRED:   'Expirée',
	}
	return labels[status]
}

export function getOfferStatusColor(status: OfferStatusComputed): string {
	const colors: Record<OfferStatusComputed, string> = {
		ACTIVE:    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
		PAUSED:    'bg-amber-500/20 text-amber-400 border-amber-500/30',
		SCHEDULED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
		EXPIRED:   'bg-red-500/20 text-red-400 border-red-500/30',
	}
	return colors[status]
}

export function getOfferStatusDot(status: OfferStatusComputed): string {
	const dots: Record<OfferStatusComputed, string> = {
		ACTIVE:    'bg-emerald-400',
		PAUSED:    'bg-amber-400',
		SCHEDULED: 'bg-blue-400',
		EXPIRED:   'bg-red-400',
	}
	return dots[status]
}

export function isOfferActive(offer: { startDate: Date | string; endDate: Date | string; isActive: boolean }): boolean {
	return getOfferStatus(offer) === 'ACTIVE'
}

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[àáâãäå]/g, 'a')
		.replace(/[èéêë]/g, 'e')
		.replace(/[ìíîï]/g, 'i')
		.replace(/[òóôõö]/g, 'o')
		.replace(/[ùúûü]/g, 'u')
		.replace(/[ñ]/g, 'n')
		.replace(/[ç]/g, 'c')
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.trim()
}

export function getStatusLabel(status: string): string {
	const labels: Record<string, string> = {
		AVAILABLE: 'Disponible',
		RESERVED: 'Réservé',
		SOLD: 'Vendu',
	}
	return labels[status] ?? status
}

export function getStatusColor(status: string): string {
	const colors: Record<string, string> = {
		AVAILABLE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
		RESERVED:  'bg-amber-500/20 text-amber-400 border-amber-500/30',
		SOLD:      'bg-red-500/20 text-red-400 border-red-500/30',
	}
	return colors[status] ?? 'bg-dark-700 text-dark-300 border-dark-600'
}

export function getTransmissionLabel(t: string): string {
	const labels: Record<string, string> = {
		MANUAL: 'Manuelle',
		AUTOMATIC: 'Automatique',
		SEMI_AUTOMATIC: 'Semi-Automatique',
	}
	return labels[t] ?? t
}

export function getFuelLabel(f: string): string {
	const labels: Record<string, string> = {
		GASOLINE: 'Essence',
		DIESEL: 'Diesel',
		ELECTRIC: 'Électrique',
		HYBRID: 'Hybride',
		GPL: 'GPL',
	}
	return labels[f] ?? f
}

export function truncate(str: string, maxLen: number): string {
	if (str.length <= maxLen) return str
	return str.slice(0, maxLen).trimEnd() + '...'
}
