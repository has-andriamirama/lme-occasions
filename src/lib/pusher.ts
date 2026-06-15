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
  admin:   'lme-admin',
} as const

export const EVENTS = {
  carStatusChanged: 'car-status-changed',
  carCreated:       'car-created',
  carUpdated:       'car-updated',
  newReservation:   'new-reservation',
  newContact:       'new-contact',
} as const

// ── Trigger helpers ──────────────────────────────────────────────────────────
export async function broadcastCarStatus(carId: string, status: string, title: string) {
  await pusherServer.trigger(CHANNELS.cars, EVENTS.carStatusChanged, {
    carId, status, title, timestamp: new Date().toISOString(),
  })
}

export async function broadcastAdminNotification(type: string, data: Record<string, unknown>) {
  await pusherServer.trigger(CHANNELS.admin, type, {
    ...data, timestamp: new Date().toISOString(),
  })
}
