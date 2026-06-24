// src/components/admin/cars/AdminCarsActions.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Eye, Pencil, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/admin/shared/ConfirmModal'

interface Props {
	carId: string
	carTitle: string
	carStatus: string
}

export default function AdminCarsActions({ carId, carTitle, carStatus }: Props) {
	const router = useRouter()
	const [confirm, setConfirm] = useState(false)
	const [loading, setLoading] = useState(false)

	async function handleDelete() {
		setLoading(true)
		try {
			const res  = await fetch(`/api/cars/${carId}`, { method: 'DELETE' })
			const data = await res.json()
			if (!data.success) { toast.error(data.error); return }
			toast.success('Véhicule supprimé')
			router.refresh()
		} catch {
			toast.error('Erreur réseau')
		} finally {
			setLoading(false)
			setConfirm(false)
		}
	}

	return (
		<div className="flex items-center justify-center gap-1">
			<Link href={`/cars/${carId}`} target="_blank"
				className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700 transition-all">
				<Eye className="w-4 h-4" />
			</Link>
			
			<Link href={`/admin/cars/${carId}/edit`}
				className="p-1.5 text-dark-400 hover:text-brand-400 rounded-lg hover:bg-dark-700 transition-all">
				<Pencil className="w-4 h-4" />
			</Link>

			{carStatus !== 'RESERVED' ? (
				<button
					onClick={() => setConfirm(true)}
					title="Supprimer"
					className="p-1.5 text-dark-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
				>
					<Trash2 className="w-4 h-4" />
				</button>
			) : (
				<button
					disabled
					title="Impossible de supprimer un véhicule réservé"
					className="p-1.5 text-dark-600 cursor-not-allowed rounded-lg"
				>
					<Trash2 className="w-4 h-4" />
				</button>
			)}

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
