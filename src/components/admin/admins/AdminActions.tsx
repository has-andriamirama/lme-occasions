// src/components/admin/admins/AdminActions.tsx
'use client'
import { Trash2 } from 'lucide-react'
import ConfirmModal     from '@/components/admin/shared/ConfirmModal'
import ActionIconButton from '@/components/admin/shared/ActionIconButton'
import AdminForm        from '@/components/admin/admins/AdminForm'
import { useDeleteAction } from '@/hooks/useDeleteAction'

interface AdminLite {
	id:       string
	username: string
	email:    string
	role:     string
}

interface Props {
	admin:  AdminLite
	isSelf: boolean
}

export default function AdminActions({ admin, isSelf }: Props) {
	const { confirm, setConfirm, loading, handleDelete } = useDeleteAction({
		url:            `/api/admins/${admin.id}`,
		successMessage: 'Administrateur supprimé',
	})

	return (
		<div className="flex items-center justify-center gap-1">
			<AdminForm mode="edit" admin={admin} isSelf={isSelf} />

			<ActionIconButton
				as="button"
				variant="danger"
				title={isSelf ? 'Impossible de supprimer votre propre compte' : 'Supprimer'}
				disabled={isSelf}
				onClick={() => setConfirm(true)}
			>
				<Trash2 className="w-4 h-4" />
			</ActionIconButton>

			<ConfirmModal
				open={confirm}
				title="Supprimer cet administrateur ?"
				description={
					<>
						Le compte de{' '}
						<span className="text-white font-medium">{admin.username}</span>{' '}
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
