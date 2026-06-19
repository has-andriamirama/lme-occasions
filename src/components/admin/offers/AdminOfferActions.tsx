// src/components/admin/offers/AdminOfferActions.tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, Pencil, Trash2, Pause, Play, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { OfferStatusComputed } from '@/lib/utils'

interface Props {
  offerId: string
  offerName: string
  status: OfferStatusComputed
  isActive: boolean
}

export default function AdminOfferActions({ offerId, offerName, status, isActive }: Props) {
  const router = useRouter()
  const [confirm, setConfirm]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [toggling, setToggling] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      const res  = await fetch(`/api/offers/${offerId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      toast.success('Offre supprimée')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
      setConfirm(false)
    }
  }

  async function handleTogglePause() {
    setToggling(true)
    try {
      const res  = await fetch(`/api/offers/${offerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
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

  return (
    <div className="flex items-center justify-center gap-1">
      <Link href={`/cars?offerId=${offerId}`} target="_blank"
        title="Voir sur le site"
        className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700 transition-all">
        <Eye className="w-4 h-4" />
      </Link>

      <Link href={`/admin/offers/${offerId}/edit`}
        title="Modifier"
        className="p-1.5 text-dark-400 hover:text-brand-400 rounded-lg hover:bg-dark-700 transition-all">
        <Pencil className="w-4 h-4" />
      </Link>

      {status === 'EXPIRED' ? (
        <button disabled title="Offre expirée — modifiez les dates pour la relancer"
          className="p-1.5 text-dark-600 cursor-not-allowed rounded-lg">
          <Pause className="w-4 h-4" />
        </button>
      ) : (
        <button onClick={handleTogglePause} disabled={toggling}
          title={isActive ? 'Mettre en pause' : 'Reprendre'}
          className="p-1.5 text-dark-400 hover:text-amber-400 rounded-lg hover:bg-amber-500/10 transition-all disabled:opacity-50">
          {toggling
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
      )}

      {confirm ? (
        <>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm">
            <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-sm shadow-card-lg animate-scale-in">
              <h3 className="font-display font-bold text-white text-lg mb-2">Supprimer cette offre ?</h3>
              <p className="text-sm text-dark-400 mb-6">
                <span className="text-white font-medium">{offerName}</span> sera définitivement supprimée.
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
          <button className="p-1.5 text-red-400 rounded-lg bg-red-500/10">
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      ) : (
        <button onClick={() => setConfirm(true)}
          title="Supprimer"
          className="p-1.5 text-dark-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
