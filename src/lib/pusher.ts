// src/lib/pusher.ts
import Pusher from 'pusher'
import PusherClient from 'pusher-js'

export const pusherServer = new Pusher({
	appId:   process.env.PUSHER_APP_ID!,
	key:     process.env.PUSHER_KEY!,
	secret:  process.env.PUSHER_SECRET!,
	cluster: process.env.PUSHER_CLUSTER!,
	useTLS:  true,
})

let pusherClientInstance: PusherClient | null = null

export function getPusherClient(): PusherClient {
	if (typeof window === 'undefined') {
		throw new Error('getPusherClient() must be called client-side')
	}
	if (!pusherClientInstance) {
		const key     = process.env.NEXT_PUBLIC_PUSHER_KEY
		const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

		if (!key || !cluster) {
			throw new Error(
				'[Pusher] NEXT_PUBLIC_PUSHER_KEY et/ou NEXT_PUBLIC_PUSHER_CLUSTER sont absents. ' +
				'Vérifiez ces variables dans Vercel → Settings → Environment Variables (environnement ' +
				'« Production »). Important : les variables préfixées NEXT_PUBLIC_ sont injectées dans ' +
				'le bundle au moment du BUILD — si vous venez de les ajouter/modifier, il faut redéployer ' +
				'(pas juste sauvegarder la variable) pour qu\'elles soient prises en compte.'
			)
		}

		pusherClientInstance = new PusherClient(key, { cluster })
	}
	return pusherClientInstance
}

// ── Channels ──────────────────────────────────────────────────────────────────

export const CHANNELS = {
	cars:         'lme-cars',
	offers:       'lme-offers',
	reservations: 'lme-reservations',
	admin:        'lme-admin',
} as const

// ── Events ────────────────────────────────────────────────────────────────────

export const EVENTS = {
	carCreated:           'car-created',
	carUpdated:           'car-updated',
	carDeleted:           'car-deleted',

	offerCreated:         'offer-created',
	offerUpdated:         'offer-updated',
	offerDeleted:         'offer-deleted',

	reservationCreated:   'reservation-created',
	reservationUpdated:   'reservation-updated',
	reservationCancelled: 'reservation-cancelled',

	contactCreated:       'contact-created',
} as const

// ── Cars ──────────────────────────────────────────────────────────────────────

export interface CarBroadcastPayload {
	id:                string
	title?:            string
	brand?:            string
	model?:            string
	year?:             number
	mileage?:          number
	price?:            number
	description?:      string
	mainImage?:        string
	images?:           string[]
	equipments?:       string[]
	status?:           string
	isFeatured?:       boolean
	transmission?:     string
	fuelType?:         string
	color?:            string | null
	engineSize?:       string | null
	seats?:            number | null
	doors?:            number | null
	condition?:        string | null
	allowInstallment?: boolean
}

export async function broadcastCarCreated(car: CarBroadcastPayload & { offers?: unknown[] }) {
	await pusherServer.trigger(CHANNELS.cars, EVENTS.carCreated, {
		...car, offers: car.offers ?? [], timestamp: new Date().toISOString(),
	})
}

export async function broadcastCarUpdate(payload: CarBroadcastPayload) {
	await pusherServer.trigger(CHANNELS.cars, EVENTS.carUpdated, {
		...payload, timestamp: new Date().toISOString(),
	})
}

export async function broadcastCarDeleted(carId: string) {
	await pusherServer.trigger(CHANNELS.cars, EVENTS.carDeleted, {
		carId, timestamp: new Date().toISOString(),
	})
}

// ── Offers ────────────────────────────────────────────────────────────────────

export interface OfferBroadcastPayload {
	id:           string
	name:         string
	description:  string | null
	type:         string
	value:        number
	startDate:    string
	endDate:      string
	isActive:     boolean
	appliedToAll: boolean
	carIds:       string[]
}

interface OfferBroadcastInput {
	id: string; name: string; description: string | null; type: string; value: number
	startDate: Date | string; endDate: Date | string; isActive: boolean; appliedToAll: boolean
	carIds: string[]
}

function serializeOffer(offer: OfferBroadcastInput): OfferBroadcastPayload {
	return {
		...offer,
		startDate: new Date(offer.startDate).toISOString(),
		endDate:   new Date(offer.endDate).toISOString(),
	}
}

export async function broadcastOfferCreated(offer: OfferBroadcastInput) {
	await pusherServer.trigger(CHANNELS.offers, EVENTS.offerCreated, {
		offer: serializeOffer(offer), timestamp: new Date().toISOString(),
	})
}

export async function broadcastOfferUpdated(offer: OfferBroadcastInput) {
	await pusherServer.trigger(CHANNELS.offers, EVENTS.offerUpdated, {
		offer: serializeOffer(offer), timestamp: new Date().toISOString(),
	})
}

export async function broadcastOfferDeleted(offerId: string, carIds: string[]) {
	await pusherServer.trigger(CHANNELS.offers, EVENTS.offerDeleted, {
		offerId, carIds, timestamp: new Date().toISOString(),
	})
}

// ── Reservations ──────────────────────────────────────────────────────────────

export interface ReservationCarSummary {
	id:        string
	title:     string
	brand:     string
	model:     string
	mainImage: string
}

export interface ReservationBroadcastPayload {
	id:               string
	carId:            string
	car:              ReservationCarSummary | null
	clientName:       string
	clientEmail:      string
	clientPhone:      string
	depositAmount:    number
	totalPrice:       number
	installmentType:  string | null
	status:           string
	reservedAt:       string
	expiresAt:        string
	paidAt:           string | null
	confirmedAt:      string | null
	completedAt:      string | null
	expiredAt:        string | null
	notes:            string | null
}

interface ReservationBroadcastInput {
	id:               string
	carId:            string
	car?:             ReservationCarSummary | null
	clientName:       string
	clientEmail:      string
	clientPhone:      string
	depositAmount:    number
	totalPrice:       number
	installmentType:  string | null
	status:           string
	reservedAt:       Date | string
	expiresAt:        Date | string
	paidAt?:          Date | string | null
	confirmedAt?:     Date | string | null
	completedAt?:     Date | string | null
	expiredAt?:       Date | string | null
	notes?:           string | null
}

function serializeReservation(r: ReservationBroadcastInput): ReservationBroadcastPayload {
	return {
		id:              r.id,
		carId:           r.carId,
		car:             r.car ?? null,
		clientName:      r.clientName,
		clientEmail:     r.clientEmail,
		clientPhone:     r.clientPhone,
		depositAmount:   r.depositAmount,
		totalPrice:      r.totalPrice,
		installmentType: r.installmentType,
		status:          r.status,
		reservedAt:      new Date(r.reservedAt).toISOString(),
		expiresAt:       new Date(r.expiresAt).toISOString(),
		paidAt:          r.paidAt      ? new Date(r.paidAt).toISOString()      : null,
		confirmedAt:     r.confirmedAt ? new Date(r.confirmedAt).toISOString() : null,
		completedAt:     r.completedAt ? new Date(r.completedAt).toISOString() : null,
		expiredAt:       r.expiredAt   ? new Date(r.expiredAt).toISOString()   : null,
		notes:           r.notes ?? null,
	}
}

export async function broadcastReservationCreated(input: ReservationBroadcastInput) {
	await pusherServer.trigger(CHANNELS.reservations, EVENTS.reservationCreated, {
		reservation: serializeReservation(input), timestamp: new Date().toISOString(),
	})
}

export async function broadcastReservationUpdated(input: ReservationBroadcastInput) {
	await pusherServer.trigger(CHANNELS.reservations, EVENTS.reservationUpdated, {
		reservation: serializeReservation(input), timestamp: new Date().toISOString(),
	})
}

export async function broadcastReservationCancelled(reservationId: string, carId: string) {
	await pusherServer.trigger(CHANNELS.reservations, EVENTS.reservationCancelled, {
		reservationId, carId, timestamp: new Date().toISOString(),
	})
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export interface ContactBroadcastPayload {
	contactId: string
	name:      string
}

export async function broadcastContactCreated(data: ContactBroadcastPayload) {
	await pusherServer.trigger(CHANNELS.admin, EVENTS.contactCreated, {
		...data, timestamp: new Date().toISOString(),
	})
}
