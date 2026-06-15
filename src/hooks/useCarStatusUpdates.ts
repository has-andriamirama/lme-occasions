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
      const channel = pusher.subscribe(CHANNELS.cars)
      channel.bind(
        EVENTS.carStatusChanged,
        (data: { carId: string; status: string; title: string }) => {
          callbackRef.current(data.carId, data.status, data.title)
        }
      )
      return () => {
        channel.unbind_all()
        pusher?.unsubscribe(CHANNELS.cars)
      }
    } catch {
      return () => {}
    }
  }, [callback])
}