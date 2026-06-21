// src/components/admin/reservations/ReservationActions.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, XCircle, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
	reservationId: string
	status: string
}

export default function ReservationActions({ reservationId, status }: Props) {
	const router               = useRouter()
	const [confirming, setConfirming] = useState(false)
	const [cancelling, setCancelling] = useState(false)

	const canConfirm = status === 'PAID'
	const canCancel  = ['PENDING', 'PAID', 'CONFIRMED'].includes(status)

	const handleConfirm = async () => {
		if (!canConfirm || confirming) return
		if (!window.confirm('Confirmer cette réservation ? Le client s\'est présenté en agence et la réservation passera au statut « Confirmée ». Les paiements de tranche pourront alors être enregistrés.')) return

		setConfirming(true)
		try {
			const res = await fetch(`/api/reservations/${reservationId}`, {
				method:  'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({ action: 'CONFIRM' }),
			})

			const json = await res.json()
			if (!res.ok) throw new Error(json.error ?? 'Erreur serveur')

			toast.success('Réservation confirmée')
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur lors de la confirmation')
		} finally {
			setConfirming(false)
		}
	}

	const handleCancel = async () => {
		if (!canCancel || cancelling) return
		if (!window.confirm('Annuler cette réservation ? Le véhicule redeviendra disponible.')) return

		setCancelling(true)
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
			setCancelling(false)
		}
	}

	return (
		<div className="flex items-center gap-1">
			<button
				onClick={handleConfirm}
				disabled={!canConfirm || confirming}
				title={canConfirm ? 'Confirmer la réservation (présentation en agence)' : 'Confirmation disponible uniquement pour une réservation payée'}
				className="p-1.5 text-dark-400 hover:text-emerald-400 rounded-lg hover:bg-dark-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-dark-400 disabled:hover:bg-transparent"
			>
				{confirming
					? <Loader2 className="w-4 h-4 animate-spin" />
					: <CheckCircle2 className="w-4 h-4" />}
			</button>

			<button
				onClick={handleCancel}
				disabled={!canCancel || cancelling}
				title={canCancel ? 'Annuler la réservation' : 'Annulation indisponible pour ce statut'}
				className="p-1.5 text-dark-400 hover:text-red-400 rounded-lg hover:bg-dark-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-dark-400 disabled:hover:bg-transparent"
			>
				{cancelling
					? <Loader2 className="w-4 h-4 animate-spin" />
					: <XCircle className="w-4 h-4" />}
			</button>
		</div>
	)
}
