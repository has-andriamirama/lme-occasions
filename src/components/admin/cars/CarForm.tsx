// src/components/admin/cars/CarForm.tsx
'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, X, Upload, Star, ImagePlus, Loader2, AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const TRANSMISSIONS = [
  { value: 'MANUAL',         label: 'Manuelle' },
  { value: 'AUTOMATIC',      label: 'Automatique' },
  { value: 'SEMI_AUTOMATIC', label: 'Semi-Automatique' },
]
const FUEL_TYPES = [
  { value: 'GASOLINE', label: 'Essence' },
  { value: 'DIESEL',   label: 'Diesel' },
  { value: 'ELECTRIC', label: 'Électrique' },
  { value: 'HYBRID',   label: 'Hybride' },
  { value: 'GPL',      label: 'GPL' },
]

interface FormData {
  title: string; brand: string; model: string; year: number; mileage: number;
  price: number; description: string; mainImage: string; images: string[];
  equipments: string[]; status: string; isFeatured: boolean;
  transmission: string; fuelType: string; color: string; engineSize: string;
  seats: number; doors: number; condition: string; allowInstallment: boolean;
}

interface Props {
  initialData?: Partial<FormData> & { id?: string }
  mode: 'create' | 'edit'
}

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">
        {label}{required && <span className="text-brand-400 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  )
}

const INITIAL: FormData = {
  title: '', brand: '', model: '', year: new Date().getFullYear(),
  mileage: 0, price: 0, description: '', mainImage: '', images: [],
  equipments: [], status: 'AVAILABLE', isFeatured: false,
  transmission: 'MANUAL', fuelType: 'GASOLINE', color: '', engineSize: '',
  seats: 5, doors: 4, condition: '', allowInstallment: false,
}

export default function CarForm({ initialData, mode }: Props) {
  const router  = useRouter()
  const [form, setForm]       = useState<FormData>({ ...INITIAL, ...initialData })
  const [errors, setErrors]   = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newEquipment, setNewEquipment] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (field: keyof FormData, value: unknown) => {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => { const n = { ...e }; delete n[field]; return n })
  }

  async function uploadImage(file: File): Promise<string | null> {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'lme-occasions/cars')
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!data.success) { toast.error(data.error); return null }
    return data.data.url
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      const urls = await Promise.all(files.map(uploadImage))
      const valid = urls.filter(Boolean) as string[]
      if (valid.length > 0) {
        if (!form.mainImage) set('mainImage', valid[0])
        set('images', [...form.images, ...valid])
        toast.success(`${valid.length} image(s) uploadée(s)`)
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function addEquipment() {
    const v = newEquipment.trim()
    if (!v || form.equipments.includes(v)) return
    set('equipments', [...form.equipments, v])
    setNewEquipment('')
  }

  function removeEquipment(idx: number) {
    set('equipments', form.equipments.filter((_, i) => i !== idx))
  }

  function removeImage(idx: number) {
    const updated = form.images.filter((_, i) => i !== idx)
    set('images', updated)
    if (form.mainImage === form.images[idx]) set('mainImage', updated[0] ?? '')
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.title.trim())       e.title = 'Titre requis'
    if (!form.brand.trim())       e.brand = 'Marque requise'
    if (!form.model.trim())       e.model = 'Modèle requis'
    if (form.price <= 0)          e.price = 'Prix invalide'
    if (form.mileage < 0)         e.mileage = 'Kilométrage invalide'
    if (!form.description.trim()) e.description = 'Description requise'
    if (!form.mainImage)          e.mainImage = 'Image principale requise'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) { toast.error('Corrigez les erreurs avant de soumettre'); return }
    setLoading(true)
    try {
      const url    = mode === 'create' ? '/api/cars' : `/api/cars/${initialData?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const res    = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) { toast.error(data.error ?? 'Erreur'); return }
      toast.success(mode === 'create' ? 'Véhicule créé !' : 'Véhicule mis à jour !')
      router.push('/admin/cars')
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">

      <section className="card p-6 space-y-5">
        <h2 className="font-display font-bold text-white text-sm uppercase tracking-widest border-b border-dark-700 pb-3">
          Informations principales
        </h2>
        <Field label="Titre de l'annonce" error={errors.title} required>
          <input value={form.title} onChange={(e) => set('title', e.target.value)}
            placeholder="Ex: Mercedes-Benz Classe C 220d AMG Line" className={cn('input-base', errors.title && 'border-red-500/50')} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Marque" error={errors.brand} required>
            <input value={form.brand} onChange={(e) => set('brand', e.target.value)}
              placeholder="Mercedes-Benz" className={cn('input-base', errors.brand && 'border-red-500/50')} />
          </Field>
          <Field label="Modèle" error={errors.model} required>
            <input value={form.model} onChange={(e) => set('model', e.target.value)}
              placeholder="Classe C" className={cn('input-base', errors.model && 'border-red-500/50')} />
          </Field>
          <Field label="Année" required>
            <input type="number" value={form.year} min={1900} max={new Date().getFullYear() + 1}
              onChange={(e) => set('year', Number(e.target.value))} className="input-base" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Prix (€)" error={errors.price} required>
            <input type="number" value={form.price || ''} min={0} step={100}
              onChange={(e) => set('price', Number(e.target.value))}
              placeholder="25000" className={cn('input-base', errors.price && 'border-red-500/50')} />
          </Field>
          <Field label="Kilométrage (km)" error={errors.mileage} required>
            <input type="number" value={form.mileage || ''} min={0}
              onChange={(e) => set('mileage', Number(e.target.value))}
              placeholder="45000" className={cn('input-base', errors.mileage && 'border-red-500/50')} />
          </Field>
        </div>
        <Field label="Description complète" error={errors.description} required>
          <textarea rows={5} value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Décrivez le véhicule en détail…"
            className={cn('input-base resize-none', errors.description && 'border-red-500/50')} />
        </Field>
      </section>

      <section className="card p-6 space-y-5">
        <h2 className="font-display font-bold text-white text-sm uppercase tracking-widest border-b border-dark-700 pb-3">
          Caractéristiques techniques
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Transmission">
            <select value={form.transmission} onChange={(e) => set('transmission', e.target.value)} className="input-base">
              {TRANSMISSIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Carburant">
            <select value={form.fuelType} onChange={(e) => set('fuelType', e.target.value)} className="input-base">
              {FUEL_TYPES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Field>
          <Field label="Couleur">
            <input value={form.color} onChange={(e) => set('color', e.target.value)}
              placeholder="Noir métal" className="input-base" />
          </Field>
          <Field label="Motorisation">
            <input value={form.engineSize} onChange={(e) => set('engineSize', e.target.value)}
              placeholder="2.0 TDI 150ch" className="input-base" />
          </Field>
          <Field label="Places">
            <input type="number" value={form.seats} min={1} max={20}
              onChange={(e) => set('seats', Number(e.target.value))} className="input-base" />
          </Field>
          <Field label="Portes">
            <input type="number" value={form.doors} min={2} max={7}
              onChange={(e) => set('doors', Number(e.target.value))} className="input-base" />
          </Field>
        </div>
        <Field label="État / infos complémentaires">
          <textarea rows={2} value={form.condition}
            onChange={(e) => set('condition', e.target.value)}
            placeholder="Carnet d'entretien, révision récente…"
            className="input-base resize-none" />
        </Field>
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="font-display font-bold text-white text-sm uppercase tracking-widest border-b border-dark-700 pb-3">
          Équipements
        </h2>
        <div className="flex gap-2">
          <input value={newEquipment} onChange={(e) => setNewEquipment(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEquipment() } }}
            placeholder="Ajouter un équipement…" className="input-base flex-1" />
          <button type="button" onClick={addEquipment} className="btn-secondary px-4 shrink-0">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {form.equipments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.equipments.map((eq, i) => (
              <span key={i} className="flex items-center gap-1.5 bg-dark-700 border border-dark-600
                                       text-sm text-white rounded-lg px-3 py-1.5">
                {eq}
                <button type="button" onClick={() => removeEquipment(i)}
                  className="text-dark-400 hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="card p-6 space-y-4">
        <h2 className="font-display font-bold text-white text-sm uppercase tracking-widest border-b border-dark-700 pb-3">
          Galerie photos
        </h2>
        {errors.mainImage && (
          <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.mainImage}</p>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="btn-secondary w-full border-dashed">
          {uploading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Upload en cours…</>
            : <><ImagePlus className="w-4 h-4" /> Ajouter des photos (JPEG, PNG, WebP — max 5 Mo)</>}
        </button>
        {form.images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-3">
            {form.images.map((url, i) => (
              <div key={i} className="relative group aspect-video rounded-lg overflow-hidden bg-dark-700">
                <Image src={url} alt="" fill className="object-cover" />
                <div className="absolute inset-0 bg-dark-950/70 opacity-0 group-hover:opacity-100
                                transition-opacity flex items-center justify-center gap-1.5">
                  <button type="button" onClick={() => set('mainImage', url)}
                    title="Définir comme principale"
                    className={cn('p-1 rounded transition-colors',
                      form.mainImage === url ? 'text-brand-400' : 'text-white hover:text-brand-400')}>
                    <Star className="w-4 h-4" fill={form.mainImage === url ? 'currentColor' : 'none'} />
                  </button>
                  <button type="button" onClick={() => removeImage(i)}
                    className="p-1 rounded text-white hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {form.mainImage === url && (
                  <span className="absolute top-1 left-1 text-[10px] bg-brand-500 text-dark-950 font-bold px-1.5 py-0.5 rounded">
                    Principale
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        <Field label="URL image principale (ou saisie directe)" error={errors.mainImage}>
          <input value={form.mainImage} onChange={(e) => set('mainImage', e.target.value)}
            placeholder="https://…" className={cn('input-base', errors.mainImage && 'border-red-500/50')} />
        </Field>
      </section>

      <section className="card p-6 space-y-5">
        <h2 className="font-display font-bold text-white text-sm uppercase tracking-widest border-b border-dark-700 pb-3">
          Statut & options
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Statut">
            <select value={form.status} onChange={(e) => set('status', e.target.value)} className="input-base">
              <option value="AVAILABLE">Disponible</option>
              <option value="RESERVED">Réservé</option>
              <option value="SOLD">Vendu</option>
            </select>
          </Field>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={cn('w-10 h-6 rounded-full transition-all relative',
              form.isFeatured ? 'bg-brand-500' : 'bg-dark-700')}
              onClick={() => set('isFeatured', !form.isFeatured)}>
              <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow',
                form.isFeatured ? 'left-5' : 'left-1')} />
            </div>
            <span className="text-sm text-dark-300 group-hover:text-white transition-colors">
              Véhicule vedette (mis en avant)
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={cn('w-10 h-6 rounded-full transition-all relative',
              form.allowInstallment ? 'bg-brand-500' : 'bg-dark-700')}
              onClick={() => set('allowInstallment', !form.allowInstallment)}>
              <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow',
                form.allowInstallment ? 'left-5' : 'left-1')} />
            </div>
            <span className="text-sm text-dark-300 group-hover:text-white transition-colors">
              Autoriser paiement 3x/4x
            </span>
          </label>
        </div>
      </section>

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="btn-primary px-8">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</> :
            mode === 'create' ? 'Créer le véhicule' : 'Mettre à jour'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Annuler
        </button>
      </div>
    </form>
  )
}
