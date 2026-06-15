// src/components/admin/cars/AdminCarsActions.tsx
'use client'
import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props {
  carId: string
  carTitle: string
  carStatus: string
}

export default function AdminCarsActions({ carId, carTitle, carStatus }: Props) {
  const router = useRouter()
  const [confirm, setConfirm]  = useState(false)
  const [loading, setLoading]  = useState(false)

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

  if (carStatus === 'RESERVED') {
    return (
      <button disabled title="Impossible de supprimer un véhicule réservé"
        className="p-1.5 text-dark-600 cursor-not-allowed rounded-lg">
        <Trash2 className="w-4 h-4" />
      </button>
    )
  }

  if (confirm) {
    return (
      <>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-sm shadow-card-lg animate-scale-in">
            <h3 className="font-display font-bold text-white text-lg mb-2">Supprimer ce véhicule ?</h3>
            <p className="text-sm text-dark-400 mb-6">
              <span className="text-white font-medium">{carTitle}</span> sera définitivement supprimé.
              Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={loading} className="btn-danger flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
              </button>
              <button onClick={() => setConfirm(false)} className="btn-secondary flex-1">Annuler</button>
            </div>
          </div>
        </div>
        {/* Keep the trash icon rendered behind modal */}
        <button className="p-1.5 text-red-400 rounded-lg bg-red-500/10">
          <Trash2 className="w-4 h-4" />
        </button>
      </>
    )
  }

  return (
    <button onClick={() => setConfirm(true)}
      className="p-1.5 text-dark-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all">
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
