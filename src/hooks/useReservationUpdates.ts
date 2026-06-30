// src/hooks/useReservationUpdates.ts
'use client'
import { useEffect, useRef } from 'react'
import { getPusherClient, CHANNELS, EVENTS, type ReservationBroadcastPayload } from '@/lib/pusher'

export type { ReservationBroadcastPayload }

interface Handlers {
	onCreate?: (reservation: ReservationBroadcastPayload) => void
	onChange?: (reservation: ReservationBroadcastPayload) => void
	onDelete?: (reservationId: string, carId: string) => void
}

export function useReservationUpdates(handlers: Handlers) {
	const handlersRef = useRef(handlers)
	useEffect(() => { handlersRef.current = handlers })

	useEffect(() => {
		let pusher: ReturnType<typeof getPusherClient> | null = null
		try {
			pusher = getPusherClient()
		} catch (err) {
			console.error('[useReservationUpdates] Connexion Pusher impossible :', err)
			return
		}

		const channel = pusher.subscribe(CHANNELS.reservations)

		const onCreate = (data: { reservation: ReservationBroadcastPayload }) => {
			handlersRef.current.onCreate?.(data.reservation)
		}
		const onChange = (data: { reservation: ReservationBroadcastPayload }) => {
			handlersRef.current.onChange?.(data.reservation)
		}
		const onDelete = (data: { reservationId: string; carId: string }) => {
			handlersRef.current.onDelete?.(data.reservationId, data.carId)
		}

		channel.bind(EVENTS.reservationCreated, onCreate)
		channel.bind(EVENTS.reservationUpdated, onChange)
		channel.bind(EVENTS.reservationCancelled, onDelete)

		return () => {
			channel.unbind(EVENTS.reservationCreated, onCreate)
			channel.unbind(EVENTS.reservationUpdated, onChange)
			channel.unbind(EVENTS.reservationCancelled, onDelete)
		}
	}, [])
}
