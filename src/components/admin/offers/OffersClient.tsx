// src/components/admin/offers/OffersClient.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Tag, Trash2, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { formatDate, formatPrice, isOfferActive } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Car { id: string; title: string; brand: string; model: string; year: number }
interface Offer {
  id: string; name: string; description?: string | null; type: string; value: number;
  startDate: Date; endDate: Date; isActive: boolean; appliedToAll: boolean;
  cars: Array<{ car: Car }>
}

const EMPTY = {
  name: '', description: '', type: 'PERCENTAGE', value: 10,
  startDate: new Date().toISOString().slice(0, 16),
  endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16),
  isActive: true, appliedToAll: false, carIds: [] as string[],
}

export default function OffersClient({
  offers,
  availableCars,
}: {
  offers: Offer[]
  availableCars: Car[]
}) {
  const router  = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY)
  const [loading, setLoading]   = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  function toggleCar(id: string) {
    set('carIds', form.carIds.includes(id)
      ? form.carIds.filter((c) => c !== id)
      : [...form.carIds, id])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        value:     Number(form.value),
        startDate: new Date(form.startDate).toISOString(),
        endDate:   new Date(form.endDate).toISOString(),
      }
      const res  = await fetch('/api/offers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error ?? 'Erreur'); return }
      toast.success('Offre créée !')
      setShowForm(false)
      setForm(EMPTY)
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setLoading(true)
    try {
      const res  = await fetch(`/api/offers/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      toast.success('Offre supprimée')
      setDeleteId(null)
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={() => setShowForm(true)} className="btn-primary">
        <Plus className="w-4 h-4" /> Créer une offre
      </button>

      {/* Offers list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.length === 0 ? (
          <div className="col-span-2 card py-16 text-center text-dark-400">
            Aucune offre. Créez votre première promotion !
          </div>
        ) : offers.map((offer) => {
          const active = isOfferActive(offer as any)
          return (
            <div key={offer.id} className={`card p-5 ${active ? 'border-brand-500/20' : 'opacity-70'}`}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                    <Tag className="w-4 h-4 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{offer.name}</h3>
                    <span className={`badge text-[10px] mt-0.5 ${active
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-dark-700 text-dark-400 border-dark-600'}`}>
                      {active ? <><CheckCircle2 className="w-3 h-3" /> Active</> : <><XCircle className="w-3 h-3" /> Inactive</>}
                    </span>
                  </div>
                </div>
                <button onClick={() => setDeleteId(offer.id)}
                  className="p-1.5 text-dark-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Discount value */}
              <div className="inline-flex items-center gap-1.5 bg-brand-500 text-dark-950 font-black text-lg
                              px-4 py-1.5 rounded-xl mb-3">
                {offer.type === 'PERCENTAGE' ? `-${offer.value}%` : `-${offer.value} €`}
              </div>

              {offer.description && (
                <p className="text-xs text-dark-400 mb-3 line-clamp-2">{offer.description}</p>
              )}

              <div className="flex items-center gap-2 text-xs text-dark-500 mb-2">
                <Clock className="w-3.5 h-3.5" />
                {formatDate(offer.startDate)} → {formatDate(offer.endDate)}
              </div>

              <p className="text-xs text-dark-400">
                {offer.appliedToAll
                  ? 'Applicable sur tous les véhicules'
                  : `Applicable sur ${offer.cars.length} véhicule(s)`}
              </p>
            </div>
          )
        })}
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-lg shadow-card-lg animate-scale-in max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-bold text-white text-lg mb-5">Nouvelle offre</h3>
            <form onSubmit={handleCreate} className="space-y-4">

              <div>
                <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">Nom de l'offre *</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)}
                  placeholder="Soldes d'été, Black Friday…" className="input-base" required />
              </div>

              <div>
                <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">Description</label>
                <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)}
                  placeholder="Description optionnelle…" className="input-base resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">Type</label>
                  <select value={form.type} onChange={(e) => set('type', e.target.value)} className="input-base">
                    <option value="PERCENTAGE">Pourcentage (%)</option>
                    <option value="FIXED_AMOUNT">Montant fixe (€)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">
                    Valeur {form.type === 'PERCENTAGE' ? '(%)' : '(€)'}
                  </label>
                  <input type="number" value={form.value} min={0}
                    max={form.type === 'PERCENTAGE' ? 100 : undefined}
                    onChange={(e) => set('value', e.target.value)}
                    className="input-base" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">Début</label>
                  <input type="datetime-local" value={form.startDate}
                    onChange={(e) => set('startDate', e.target.value)} className="input-base" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">Fin</label>
                  <input type="datetime-local" value={form.endDate}
                    onChange={(e) => set('endDate', e.target.value)} className="input-base" required />
                </div>
              </div>

              {/* Apply to all toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-10 h-6 rounded-full transition-all relative cursor-pointer
                  ${form.appliedToAll ? 'bg-brand-500' : 'bg-dark-700'}`}
                  onClick={() => set('appliedToAll', !form.appliedToAll)}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all
                    ${form.appliedToAll ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-dark-300">Appliquer à tous les véhicules</span>
              </label>

              {/* Car selector */}
              {!form.appliedToAll && availableCars.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-2">
                    Véhicules concernés ({form.carIds.length} sélectionné{form.carIds.length !== 1 ? 's' : ''})
                  </label>
                  <div className="max-h-40 overflow-y-auto space-y-1 border border-dark-700 rounded-xl p-2 bg-dark-900/50">
                    {availableCars.map((c) => (
                      <label key={c.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors
                          ${form.carIds.includes(c.id) ? 'bg-brand-500/10' : 'hover:bg-dark-800'}`}>
                        <input type="checkbox" checked={form.carIds.includes(c.id)}
                          onChange={() => toggleCar(c.id)}
                          className="accent-brand-500 w-4 h-4" />
                        <span className="text-sm text-white">
                          {c.brand} {c.model} {c.year}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer l\'offre'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-sm shadow-card-lg animate-scale-in">
            <h3 className="font-display font-bold text-white text-lg mb-2">Supprimer cette offre ?</h3>
            <p className="text-sm text-dark-400 mb-5">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)} disabled={loading} className="btn-danger flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
              </button>
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
