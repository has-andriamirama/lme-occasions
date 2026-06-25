// src/components/admin/cars/AdminCarsActions.tsx
'use client'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import ConfirmModal     from '@/components/admin/shared/ConfirmModal'
import ActionIconButton from '@/components/admin/shared/ActionIconButton'
import { useDeleteAction } from '@/hooks/useDeleteAction'

interface Props {
	carId:    string
	carTitle: string
	status:   string
}

export default function AdminCarsActions({ carId, carTitle, status }: Props) {
	const { confirm, setConfirm, loading, handleDelete } = useDeleteAction({
		url:            `/api/cars/${carId}`,
		successMessage: 'Véhicule supprimé',
	})

	return (
		<div className="flex items-center justify-center gap-1">
			<ActionIconButton as="link" href={`/cars/${carId}`} target="_blank" title="Voir sur le site">
				<Eye className="w-4 h-4" />
			</ActionIconButton>

			<ActionIconButton as="link" href={`/admin/cars/${carId}/edit`} variant="edit" title="Modifier">
				<Pencil className="w-4 h-4" />
			</ActionIconButton>

			<ActionIconButton
				as="button"
				variant="danger"
				title={status === 'RESERVED' ? 'Impossible de supprimer un véhicule réservé' : 'Supprimer'}
				disabled={status === 'RESERVED'}
				onClick={() => setConfirm(true)}
			>
				<Trash2 className="w-4 h-4" />
			</ActionIconButton>

			<ConfirmModal
				open={confirm}
				title="Supprimer ce véhicule ?"
				description={
					<>
						<span className="text-white font-medium">{carTitle}</span>{' '}
						sera définitivement supprimé. Cette action est irréversible.
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
