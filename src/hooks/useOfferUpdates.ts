// src/hooks/useOfferUpdates.ts
'use client'
import { useEffect, useRef } from 'react'
import { getPusherClient, CHANNELS, EVENTS, type OfferBroadcastPayload } from '@/lib/pusher'

export type { OfferBroadcastPayload }

interface Handlers {
	/** Une offre vient d'être créée, modifiée, mise en pause ou réactivée par un admin. */
	onChange?: (offer: OfferBroadcastPayload) => void
	/** Une offre vient d'être supprimée. `carIds` = véhicules qui étaient concernés. */
	onDelete?: (offerId: string, carIds: string[]) => void
}

/**
 * Hook temps réel pour les offres — exactement le même principe que
 * useCarStatusUpdates : abonnement au canal Pusher dédié, et les sessions
 * clientes déjà ouvertes reçoivent l'événement sans avoir besoin de recharger
 * la page (création, édition, pause/reprise, suppression côté admin).
 */
export function useOfferUpdates(handlers: Handlers) {
	const handlersRef = useRef(handlers)
	useEffect(() => { handlersRef.current = handlers })

	useEffect(() => {
		let pusher: ReturnType<typeof getPusherClient> | null = null
		try {
			pusher = getPusherClient()
			const channel = pusher.subscribe(CHANNELS.offers)

			channel.bind(EVENTS.offerChanged, (data: { offer: OfferBroadcastPayload }) => {
				handlersRef.current.onChange?.(data.offer)
			})
			channel.bind(EVENTS.offerDeleted, (data: { offerId: string; carIds: string[] }) => {
				handlersRef.current.onDelete?.(data.offerId, data.carIds)
			})

			return () => {
				channel.unbind_all()
				pusher?.unsubscribe(CHANNELS.offers)
			}
		} catch {
			return () => {}
		}
	}, [])
}
