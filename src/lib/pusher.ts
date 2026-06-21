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
	offerChanged:     'offer-changed',
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
