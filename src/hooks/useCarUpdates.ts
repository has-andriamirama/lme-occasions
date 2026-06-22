// src/hooks/useCarUpdates.ts
'use client'
import { useEffect, useRef } from 'react'
import { getPusherClient, CHANNELS, EVENTS, type CarBroadcastPayload } from '@/lib/pusher'

export type { CarBroadcastPayload }

interface Handlers {
	onChange?: (car: CarBroadcastPayload) => void
	onDelete?: (carId: string) => void
}

export function useCarUpdates(handlers: Handlers) {
	const handlersRef = useRef(handlers)
	useEffect(() => { handlersRef.current = handlers })

	useEffect(() => {
		let pusher: ReturnType<typeof getPusherClient> | null = null
		try {
			pusher = getPusherClient()
		} catch (err) {
			console.error('[useCarUpdates] Connexion Pusher impossible :', err)
			return
		}

		const channel = pusher.subscribe(CHANNELS.cars)

		const onChange = (data: CarBroadcastPayload) => {
			handlersRef.current.onChange?.(data)
		}
		const onDelete = (data: { carId: string }) => {
			handlersRef.current.onDelete?.(data.carId)
		}

		channel.bind(EVENTS.carUpdated, onChange)
		channel.bind(EVENTS.carDeleted, onDelete)

		return () => {
			channel.unbind(EVENTS.carUpdated, onChange)
			channel.unbind(EVENTS.carDeleted, onDelete)
		}
	}, [])
}
