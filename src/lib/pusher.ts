// src/lib/pusher.ts
import Pusher from 'pusher'
import PusherClient from 'pusher-js'

// ── Server-side Pusher ───────────────────────────────────────────────────────
export const pusherServer = new Pusher({
	appId:   process.env.PUSHER_APP_ID!,
	key:     process.env.PUSHER_KEY!,
	secret:  process.env.PUSHER_SECRET!,
	cluster: process.env.PUSHER_CLUSTER!,
	useTLS:  true,
})

// ── Client-side Pusher (singleton) ──────────────────────────────────────────
let pusherClientInstance: PusherClient | null = null

export function getPusherClient(): PusherClient {
	if (typeof window === 'undefined') {
		throw new Error('getPusherClient() must be called client-side')
	}
	if (!pusherClientInstance) {
		pusherClientInstance = new PusherClient(
			process.env.NEXT_PUBLIC_PUSHER_KEY!,
			{ cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! }
		)
	}
	return pusherClientInstance
}

// ── Channel / event constants ────────────────────────────────────────────────
export const CHANNELS = {
	cars:    'lme-cars',
	offers:  'lme-offers',
	admin:   'lme-admin',
} as const

export const EVENTS = {
	carStatusChanged: 'car-status-changed',
	carCreated:       'car-created',
	carUpdated:       'car-updated',
	offerChanged:     'offer-changed', // création, édition, pause/reprise
	offerDeleted:     'offer-deleted',
	newReservation:   'new-reservation',
	newContact:       'new-contact',
} as const

// ── Trigger helpers ──────────────────────────────────────────────────────────
export async function broadcastCarStatus(carId: string, status: string, title: string) {
	await pusherServer.trigger(CHANNELS.cars, EVENTS.carStatusChanged, {
		carId, status, title, timestamp: new Date().toISOString(),
	})
}

// Payload envoyé à chaque création / édition / pause / reprise d'offre.
// `carIds` = liste à jour des véhicules concernés (calculée côté serveur après écriture en DB),
// ce qui permet aux pages publiques de savoir précisément quelles voitures sont impactées.
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

export async function broadcastOfferChange(offer: {
	id: string; name: string; description: string | null; type: string; value: number
	startDate: Date | string; endDate: Date | string; isActive: boolean; appliedToAll: boolean
	carIds: string[]
}) {
	const payload: OfferBroadcastPayload = {
		...offer,
		startDate: new Date(offer.startDate).toISOString(),
		endDate:   new Date(offer.endDate).toISOString(),
	}
	await pusherServer.trigger(CHANNELS.offers, EVENTS.offerChanged, {
		offer: payload, timestamp: new Date().toISOString(),
	})
}

export async function broadcastOfferDeleted(offerId: string, carIds: string[]) {
	await pusherServer.trigger(CHANNELS.offers, EVENTS.offerDeleted, {
		offerId, carIds, timestamp: new Date().toISOString(),
	})
}

export async function broadcastAdminNotification(type: string, data: Record<string, unknown>) {
	await pusherServer.trigger(CHANNELS.admin, type, {
		...data, timestamp: new Date().toISOString(),
	})
}
