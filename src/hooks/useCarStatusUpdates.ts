// src/hooks/useCarStatusUpdates.ts
'use client'
import { useEffect, useRef } from 'react'
import { getPusherClient, CHANNELS, EVENTS } from '@/lib/pusher'

export function useCarStatusUpdates(
	callback: (carId: string, status: string, title: string) => void
) {
	const callbackRef = useRef(callback)
	useEffect(() => { callbackRef.current = callback })

	useEffect(() => {
		let pusher: ReturnType<typeof getPusherClient> | null = null
		try {
			pusher = getPusherClient()
		} catch (err) {
			console.error('[useCarStatusUpdates] Connexion Pusher impossible :', err)
			return
		}

		const channel = pusher.subscribe(CHANNELS.cars)

		const handler = (data: { carId: string; status: string; title: string }) => {
			callbackRef.current(data.carId, data.status, data.title)
		}

		channel.bind(EVENTS.carStatusChanged, handler)

		return () => {
			channel.unbind(EVENTS.carStatusChanged, handler)
		}
	}, [])
}
