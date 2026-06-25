// src/components/admin/offers/AdminOfferActions.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Pencil, Trash2, Pause, Play, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { OfferStatusComputed } from '@/lib/utils'
import ConfirmModal     from '@/components/admin/shared/ConfirmModal'
import ActionIconButton from '@/components/admin/shared/ActionIconButton'
import { useDeleteAction } from '@/hooks/useDeleteAction'

interface Props {
	offerId:        string
	offerName:      string
	computedStatus: OfferStatusComputed
	isActive:       boolean
}

export default function AdminOfferActions({ offerId, offerName, computedStatus, isActive }: Props) {
	const router                        = useRouter()
	const [toggling, setToggling]       = useState(false)

	const { confirm, setConfirm, loading, handleDelete } = useDeleteAction({
		url:            `/api/offers/${offerId}`,
		successMessage: 'Offre supprimée',
	})

	async function handleTogglePause() {
		setToggling(true)
		try {
			const res  = await fetch(`/api/offers/${offerId}`, {
				method:  'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({ isActive: !isActive }),
			})
			const data = await res.json()
			if (!data.success) { toast.error(data.error ?? 'Erreur'); return }
			toast.success(isActive ? 'Offre mise en pause' : 'Offre relancée')
			router.refresh()
		} catch {
			toast.error('Erreur réseau')
		} finally {
			setToggling(false)
		}
	}

	const isExpired = computedStatus === 'EXPIRED'

	return (
		<div className="flex items-center justify-center gap-1">
			<ActionIconButton as="link" href={`/cars?offerId=${offerId}`} target="_blank" title="Voir sur le site">
				<Eye className="w-4 h-4" />
			</ActionIconButton>

			<ActionIconButton as="link" href={`/admin/offers/${offerId}/edit`} variant="edit" title="Modifier">
				<Pencil className="w-4 h-4" />
			</ActionIconButton>

			<ActionIconButton
				as="button"
				variant="warning"
				title={
					isExpired     ? 'Offre expirée — modifiez les dates pour la relancer' :
					isActive      ? 'Mettre en pause' : 'Reprendre'
				}
				disabled={isExpired || toggling}
				onClick={handleTogglePause}
				extraCls="disabled:opacity-50"
			>
				{toggling
					? <Loader2 className="w-4 h-4 animate-spin" />
					: isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
			</ActionIconButton>

			<ActionIconButton as="button" variant="danger" title="Supprimer" onClick={() => setConfirm(true)}>
				<Trash2 className="w-4 h-4" />
			</ActionIconButton>

			<ConfirmModal
				open={confirm}
				title="Supprimer cette offre ?"
				description={
					<>
						<span className="text-white font-medium">{offerName}</span>{' '}
						sera définitivement supprimée. Cette action est irréversible.
					</>
				}
				confirmLabel="Supprimer"
				confirmVariant="danger"
				loading={loading}
				onConfirm={handleDelete}
				onCancel={() => setConfirm(false)}
			/>
		</div>
	)
}
