// src/components/admin/admins/AdminActions.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/admin/shared/ConfirmModal'
import AdminForm from '@/components/admin/admins/AdminForm'

interface AdminLite {
	id: string
	username: string
	email: string
	role: string
}

interface Props {
	admin: AdminLite
	isSelf: boolean
}

export default function AdminActions({ admin, isSelf }: Props) {
	const router = useRouter()
	const [confirm, setConfirm] = useState(false)
	const [loading, setLoading] = useState(false)

	async function handleDelete() {
		setLoading(true)
		try {
			const res  = await fetch(`/api/admins/${admin.id}`, { method: 'DELETE' })
			const data = await res.json()
			if (!data.success) { toast.error(data.error); return }
			toast.success('Administrateur supprimé')
			setConfirm(false)
			router.refresh()
		} catch {
			toast.error('Erreur réseau')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="flex items-center justify-center gap-1">
			<AdminForm mode="edit" admin={admin} isSelf={isSelf} />

			{!isSelf && (
				<button
					onClick={() => setConfirm(true)}
					title="Supprimer"
					className="p-1.5 text-dark-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
				>
					<Trash2 className="w-4 h-4" />
				</button>
			)}

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
