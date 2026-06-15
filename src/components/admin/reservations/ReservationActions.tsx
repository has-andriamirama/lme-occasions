// src/components/admin/reservations/ReservationActions.tsx
'use client'
import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

interface Props { reservationId: string }

export default function ReservationActions({ reservationId }: Props) {
  const router = useRouter()
  const [modal, setModal]     = useState<'complete' | 'cancel' | null>(null)
  const [notes, setNotes]     = useState('')
  const [loading, setLoading] = useState(false)

  async function execute(action: 'COMPLETE' | 'CANCEL') {
    setLoading(true)
    try {
      const res  = await fetch(`/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, notes }),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      toast.success(data.message)
      setModal(null)
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-center gap-1">
        <button onClick={() => setModal('complete')} title="Finaliser la vente"
          className="p-1.5 text-dark-400 hover:text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition-all">
          <CheckCircle2 className="w-4 h-4" />
        </button>
        <button onClick={() => setModal('cancel')} title="Annuler la réservation"
          className="p-1.5 text-dark-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all">
          <XCircle className="w-4 h-4" />
        </button>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-md shadow-card-lg animate-scale-in">
            <h3 className="font-display font-bold text-white text-lg mb-2">
              {modal === 'complete' ? '✅ Finaliser la vente' : '❌ Annuler la réservation'}
            </h3>
            <p className="text-sm text-dark-400 mb-4">
              {modal === 'complete'
                ? 'Confirmer que le client a réglé le solde et récupéré le véhicule.'
                : 'La voiture repassera en statut "Disponible". L\'acompte n\'est pas remboursé.'}
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes optionnelles…"
              rows={3}
              className="input-base resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => execute(modal === 'complete' ? 'COMPLETE' : 'CANCEL')}
                disabled={loading}
                className={modal === 'complete' ? 'btn-primary flex-1' : 'btn-danger flex-1'}
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : modal === 'complete' ? 'Confirmer la vente' : 'Annuler la réservation'}
              </button>
              <button onClick={() => setModal(null)} className="btn-secondary flex-1">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
