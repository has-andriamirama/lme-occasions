// src/components/admin/reservations/ReservationActions.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
	reservationId: string
}

export default function ReservationActions({ reservationId }: Props) {
	const router            = useRouter()
	const [loading, setLoading] = useState(false)

	const handleCancel = async () => {
		if (!window.confirm('Annuler cette réservation ? Le véhicule redeviendra disponible.')) return

		setLoading(true)
		try {
			const res = await fetch(`/api/reservations/${reservationId}`, {
				method:  'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({ action: 'CANCEL' }),
			})

			const json = await res.json()
			if (!res.ok) throw new Error(json.error ?? 'Erreur serveur')

			toast.success('Réservation annulée')
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'annulation')
		} finally {
			setLoading(false)
		}
	}

	return (
		<button
			onClick={handleCancel}
			disabled={loading}
			title="Annuler la réservation"
			className="p-1.5 text-dark-400 hover:text-red-400 rounded-lg hover:bg-dark-700 transition-all disabled:opacity-40"
		>
			{loading
				? <Loader2 className="w-4 h-4 animate-spin" />
				: <XCircle className="w-4 h-4" />}
		</button>
	)
}
