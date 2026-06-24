// src/components/admin/shared/ConfirmModal.tsx
'use client'
import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'

type ConfirmVariant = 'danger' | 'primary'

interface Props {
  open: boolean
  title: string
  description: React.ReactNode
  confirmLabel?: string
  confirmVariant?: ConfirmVariant
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  confirmVariant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const onCancelRef = useRef(onCancel)
  useEffect(() => { onCancelRef.current = onCancel }, [onCancel])

  useEffect(() => {
    if (!open || loading) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancelRef.current()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, loading])

  if (!open) return null

  const confirmBtnClass = confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onCancel() }}
    >
      <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-sm shadow-card-lg animate-scale-in text-left">
        <h3 className="font-display font-bold text-white text-lg mb-2">{title}</h3>
        <div className="text-sm text-dark-400 mb-6">{description}</div>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`${confirmBtnClass} flex-1`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
