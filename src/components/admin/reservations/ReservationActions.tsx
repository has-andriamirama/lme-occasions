// src/components/admin/reservations/ReservationActions.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle, CheckCircle2, Pencil, Eye } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/admin/shared/ConfirmModal'

interface Props {
	reservationId: string
	status: string
}

type ModalType = 'confirm' | 'cancel' | null

export default function ReservationActions({ reservationId, status }: Props) {
	const router  = useRouter()
	const [modal, setModal]     = useState<ModalType>(null)
	const [loading, setLoading] = useState(false)

	const canConfirm = status === 'PAID'
	const canCancel  = ['PENDING', 'PAID', 'CONFIRMED'].includes(status)

	async function handleConfirm() {
		setLoading(true)
		try {
			const res = await fetch(`/api/reservations/${reservationId}`, {
				method:  'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({ action: 'CONFIRM' }),
			})
			const json = await res.json()
			if (!res.ok) throw new Error(json.error ?? 'Erreur serveur')
			toast.success('Réservation confirmée')
			setModal(null)
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur lors de la confirmation')
		} finally {
			setLoading(false)
		}
	}

	async function handleCancel() {
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
			setModal(null)
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'annulation')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="flex items-center justify-center">
			<Link
				href={`/admin/reservations/${reservationId}`}
				title="Voir le détail"
				className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700 transition-all"
			>
				<Eye className="w-4 h-4" />
			</Link>

			{['PENDING', 'PAID', 'CONFIRMED'].includes(status) ? (
				<Link
					href={`/admin/reservations/${reservationId}/edit`}
					title="Modifier"
					className="p-1.5 text-dark-400 hover:text-brand-400 rounded-lg hover:bg-dark-700 transition-all"
				>
					<Pencil className="w-4 h-4" />
				</Link>
			) : (
				<span
					title="Modification indisponible pour ce statut"
					aria-disabled="true"
					className="p-1.5 text-dark-400 opacity-30 cursor-not-allowed rounded-lg"
				>
					<Pencil className="w-4 h-4" />
				</span>
			)}

			<button
				onClick={() => canConfirm && setModal('confirm')}
				disabled={!canConfirm}
				title={canConfirm
					? 'Confirmer la réservation (présentation en agence)'
					: 'Confirmation disponible uniquement pour une réservation payée'}
				className="p-1.5 text-dark-400 hover:text-emerald-400 rounded-lg hover:bg-dark-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-dark-400 disabled:hover:bg-transparent"
			>
				<CheckCircle2 className="w-4 h-4" />
			</button>

			<button
				onClick={() => canCancel && setModal('cancel')}
				disabled={!canCancel}
				title={canCancel ? 'Annuler la réservation' : 'Annulation indisponible pour ce statut'}
				className="p-1.5 text-dark-400 hover:text-red-400 rounded-lg hover:bg-dark-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-dark-400 disabled:hover:bg-transparent"
			>
				<XCircle className="w-4 h-4" />
			</button>

			<ConfirmModal
				open={modal === 'confirm'}
				title="Confirmer cette réservation ?"
				description={
					<>
						Le client s&apos;est présenté en agence. La réservation passera au statut{' '}
						<span className="text-white font-medium">Confirmée</span> et les paiements
						de tranche pourront être enregistrés.
					</>
				}
				confirmLabel="Confirmer la réservation"
				confirmVariant="primary"
				loading={loading}
				onConfirm={handleConfirm}
				onCancel={() => setModal(null)}
			/>

			<ConfirmModal
				open={modal === 'cancel'}
				title="Annuler cette réservation ?"
				description="Le véhicule redeviendra disponible à la vente. Cette action est irréversible."
				confirmLabel="Valider"
				confirmVariant="danger"
				loading={loading}
				onConfirm={handleCancel}
				onCancel={() => setModal(null)}
			/>
		</div>
	)
}
