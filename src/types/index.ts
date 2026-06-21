// src/types/index.ts
import type { Car, Offer, Reservation, Admin, Contact, CarOffer } from '@prisma/client'

export type { Car, Offer, Reservation, Admin, Contact, CarOffer }

export type CarWithOffers = Car & {
	offers: Array<{ offer: Offer }>
	_count?: { reservations: number }
}

export type OfferWithCars = Offer & {
	cars: Array<{ car: Car }>
}

export type ReservationWithCar = Reservation & {
	car: Car
}

export type CarStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD'
export type TransmissionType = 'MANUAL' | 'AUTOMATIC' | 'SEMI_AUTOMATIC'
export type FuelType = 'GASOLINE' | 'DIESEL' | 'ELECTRIC' | 'HYBRID' | 'GPL'
export type OfferType = 'PERCENTAGE' | 'FIXED_AMOUNT'
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN'
export type ReservationStatus = 'PENDING' | 'PAID' | 'CONFIRMED' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'
export type InstallmentType = 'FULL' | 'THREE_TIMES' | 'FOUR_TIMES'

export type ApiResponse<T = unknown> = {
	success: boolean
	data?: T
	error?: string
	message?: string
}

export interface CarFilters {
	brand?: string
	minPrice?: number
	maxPrice?: number
	minYear?: number
	maxYear?: number
	maxMileage?: number
	status?: CarStatus | 'ALL'
	transmission?: TransmissionType
	fuelType?: FuelType
	search?: string
	isFeatured?: boolean
	sortBy?: 'price_asc' | 'price_desc' | 'year_desc' | 'year_asc' | 'mileage_asc' | 'newest'
	page?: number
	limit?: number
}

export interface DashboardStats {
	totalCars: number
	availableCars: number
	reservedCars: number
	soldCars: number
	totalReservations: number
	activeReservations: number
	pendingContacts: number
	totalRevenue: number
	monthlyRevenue: number
	recentReservations: ReservationWithCar[]
	featuredCars: Car[]
}

declare module 'next-auth' {
	interface Session {
		user: {
			id: string
			name?: string | null
			email?: string | null
			username: string
			role: string
			mustChangePassword: boolean
		}
	}
}

declare module 'next-auth/jwt' {
	interface JWT {
		id: string
		role: string
		mustChangePassword: boolean
		username: string
	}
}
