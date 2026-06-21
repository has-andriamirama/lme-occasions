// src/hooks/useCarUpdates.ts
'use client'
import { useEffect, useRef } from 'react'
import { getPusherClient, CHANNELS, EVENTS, type CarBroadcastPayload } from '@/lib/pusher'

export type { CarBroadcastPayload }

export function useCarUpdates(
	callback: (car: CarBroadcastPayload) => void
) {
	const callbackRef = useRef(callback)
	useEffect(() => { callbackRef.current = callback })

	useEffect(() => {
		let pusher: ReturnType<typeof getPusherClient> | null = null
		try {
			pusher = getPusherClient()
		} catch (err) {
			console.error('[useCarUpdates] Connexion Pusher impossible :', err)
			return
		}

		const channel = pusher.subscribe(CHANNELS.cars)

		const handler = (data: CarBroadcastPayload) => {
			callbackRef.current(data)
		}

		channel.bind(EVENTS.carUpdated, handler)

		return () => {
			channel.unbind(EVENTS.carUpdated, handler)
		}
	}, [])
}
