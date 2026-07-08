// src/components/admin/reservations/ReservationActions.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle, CheckCircle2, Pencil, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmModal     from '@/components/admin/shared/ConfirmModal'
import ActionIconButton from '@/components/admin/shared/ActionIconButton'
import { isEditableReservationStatus } from '@/lib/balance'

interface Props {
	reservationId:     string
	status:            string
	hasBalancePayment: boolean
}

type ModalType = 'confirm' | 'cancel' | null

export default function ReservationActions({ reservationId, status, hasBalancePayment }: Props) {
	const router                        = useRouter()
	const [modal,   setModal]           = useState<ModalType>(null)
	const [loading, setLoading]         = useState(false)

	const canConfirm = status === 'PAID'
	const canEdit    = isEditableReservationStatus(status, hasBalancePayment)
	const canCancel  = ['PENDING', 'PAID', 'CONFIRMED'].includes(status)

	async function handleAction(action: 'CONFIRM' | 'CANCEL') {
		setLoading(true)
		try {
			const res  = await fetch(`/api/reservations/${reservationId}`, {
				method:  'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({ action }),
			})
			const json = await res.json()
			if (!res.ok) throw new Error(json.error ?? 'Erreur serveur')
			toast.success(action === 'CONFIRM' ? 'Réservation confirmée' : 'Réservation annulée')
			setModal(null)
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="flex items-center justify-center">
			<ActionIconButton as="link" href={`/admin/reservations/${reservationId}`} title="Voir le détail">
				<Eye className="w-4 h-4" />
			</ActionIconButton>

			{canEdit ? (
				<ActionIconButton as="link" href={`/admin/reservations/${reservationId}/edit`} variant="edit" title="Modifier">
					<Pencil className="w-4 h-4" />
				</ActionIconButton>
			) : (
				<ActionIconButton
					as="button"
					variant="edit"
					disabled
					title="Modification indisponible pour ce statut"
					extraCls="opacity-30"
				>
					<Pencil className="w-4 h-4" />
				</ActionIconButton>
			)}

			<ActionIconButton
				as="button"
				variant="success"
				disabled={!canConfirm}
				title={canConfirm
					? 'Confirmer la réservation (présentation en agence)'
					: 'Confirmation disponible uniquement pour une réservation payée'}
				onClick={() => setModal('confirm')}
				extraCls="disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-dark-400 disabled:hover:bg-transparent"
			>
				<CheckCircle2 className="w-4 h-4" />
			</ActionIconButton>

			<ActionIconButton
				as="button"
				variant="danger"
				disabled={!canCancel}
				title={canCancel ? 'Annuler la réservation' : 'Annulation indisponible pour ce statut'}
				onClick={() => setModal('cancel')}
				extraCls="disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-dark-400 disabled:hover:bg-transparent"
			>
				<XCircle className="w-4 h-4" />
			</ActionIconButton>

			<ConfirmModal
				open={modal === 'confirm'}
				title="Confirmer cette réservation ?"
				description={
					<>
						Le client s&apos;est présenté en agence. La réservation passera au statut{' '}
						<span className="text-white font-medium">Confirmée</span> et le paiement
						du reste pourra être enregistré.
					</>
				}
				confirmLabel="Confirmer la réservation"
				confirmVariant="primary"
				loading={loading}
				onConfirm={() => handleAction('CONFIRM')}
				onCancel={() => setModal(null)}
			/>

			<ConfirmModal
				open={modal === 'cancel'}
				title="Annuler cette réservation ?"
				description="Le véhicule redeviendra disponible à la vente. Cette action est irréversible."
				confirmLabel="Valider"
				confirmVariant="danger"
				loading={loading}
				onConfirm={() => handleAction('CANCEL')}
				onCancel={() => setModal(null)}
			/>
		</div>
	)
}
