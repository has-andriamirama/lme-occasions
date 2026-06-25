// src/hooks/useDeleteAction.ts
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Options {
	url:            string
	successMessage: string
	onSuccess?:     () => void
}

export function useDeleteAction({ url, successMessage, onSuccess }: Options) {
	const router                = useRouter()
	const [confirm, setConfirm] = useState(false)
	const [loading, setLoading] = useState(false)

	async function handleDelete() {
		setLoading(true)
		try {
			const res  = await fetch(url, { method: 'DELETE' })
			const data = await res.json()
			if (!data.success) { toast.error(data.error ?? 'Erreur'); return }
			toast.success(successMessage)
			setConfirm(false)
			onSuccess?.()
			router.refresh()
		} catch {
			toast.error('Erreur réseau')
		} finally {
			setLoading(false)
		}
	}

	return { confirm, setConfirm, loading, handleDelete }
}
