// src/hooks/useNow.ts
'use client'
import { useEffect, useState } from 'react'

export function useNow(intervalMs = 15000): Date {
	const [now, setNow] = useState<Date>(() => new Date())

	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), intervalMs)
		return () => clearInterval(id)
	}, [intervalMs])

	return now
}
