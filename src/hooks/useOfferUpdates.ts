// src/hooks/useOfferUpdates.ts
'use client'
import { useEffect, useRef } from 'react'
import { getPusherClient, CHANNELS, EVENTS, type OfferBroadcastPayload } from '@/lib/pusher'

export type { OfferBroadcastPayload }

interface Handlers {
	onChange?: (offer: OfferBroadcastPayload) => void
	onDelete?: (offerId: string, carIds: string[]) => void
}

export function useOfferUpdates(handlers: Handlers) {
	const handlersRef = useRef(handlers)
	useEffect(() => { handlersRef.current = handlers })

	useEffect(() => {
		let pusher: ReturnType<typeof getPusherClient> | null = null
		try {
			pusher = getPusherClient()
		} catch (err) {
			console.error('[useOfferUpdates] Connexion Pusher impossible :', err)
			return
		}

		const channel = pusher.subscribe(CHANNELS.offers)

		const onChange = (data: { offer: OfferBroadcastPayload }) => {
			handlersRef.current.onChange?.(data.offer)
		}
		const onDelete = (data: { offerId: string; carIds: string[] }) => {
			handlersRef.current.onDelete?.(data.offerId, data.carIds)
		}

		channel.bind(EVENTS.offerChanged, onChange)
		channel.bind(EVENTS.offerDeleted, onDelete)

		return () => {
			channel.unbind(EVENTS.offerChanged, onChange)
			channel.unbind(EVENTS.offerDeleted, onDelete)
		}
	}, [])
}
