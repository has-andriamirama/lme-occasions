// src/components/admin/offers/OfferForm.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

interface CarOption {
	id: string; title: string; brand: string; model: string; year: number
}

interface FormData {
	name: string
	description: string
	type: 'PERCENTAGE' | 'FIXED_AMOUNT'
	value: number
	startDate: string
	endDate: string
	isActive: boolean
	appliedToAll: boolean
	carIds: string[]
}

interface Props {
	initialData?: Partial<FormData> & { id?: string }
	mode: 'create' | 'edit'
	availableCars: CarOption[]
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

function toDatetimeLocal(value: Date | string): string {
	const d = new Date(value)
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const INITIAL: FormData = {
	name: '', description: '', type: 'PERCENTAGE', value: 10,
	startDate: toDatetimeLocal(new Date()),
	endDate:   toDatetimeLocal(new Date(Date.now() + 7 * 86400000)),
	isActive: true, appliedToAll: false, carIds: [],
}

export default function OfferForm({ initialData, mode, availableCars }: Props) {
	const router  = useRouter()
	const [form, setForm]       = useState<FormData>({ ...INITIAL, ...initialData })
	const [errors, setErrors]   = useState<Record<string, string>>({})
	const [loading, setLoading] = useState(false)

	const set = (field: keyof FormData, value: unknown) => {
		setForm((f) => ({ ...f, [field]: value }))
		setErrors((e) => { const n = { ...e }; delete n[field]; return n })
	}

	function toggleCar(id: string) {
		set('carIds', form.carIds.includes(id)
			? form.carIds.filter((c) => c !== id)
			: [...form.carIds, id])
	}

	function validate(): boolean {
		const e: Record<string, string> = {}
		if (!form.name.trim())              e.name = 'Nom requis'
		if (form.value <= 0)                e.value = 'Valeur invalide'
		if (form.type === 'PERCENTAGE' && form.value > 100) e.value = 'Maximum 100%'
		if (!form.startDate)                e.startDate = 'Date de début requise'
		if (!form.endDate)                  e.endDate = 'Date de fin requise'
		if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
			e.endDate = 'Doit être après la date de début'
		}
		setErrors(e)
		return Object.keys(e).length === 0
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!validate()) { toast.error('Corrigez les erreurs avant de soumettre'); return }
		setLoading(true)
		try {
			const payload = {
				name:         form.name,
				description:  form.description || undefined,
				type:         form.type,
				value:        Number(form.value),
				startDate:    new Date(form.startDate).toISOString(),
				endDate:      new Date(form.endDate).toISOString(),
				isActive:     form.isActive,
				appliedToAll: form.appliedToAll,
				carIds:       form.appliedToAll ? [] : form.carIds,
			}
			const url    = mode === 'create' ? '/api/offers' : `/api/offers/${initialData?.id}`
			const method = mode === 'create' ? 'POST' : 'PATCH'
			const res    = await fetch(url, {
				method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
			})
			const data = await res.json()
			if (!data.success) { toast.error(data.error ?? 'Erreur'); return }
			toast.success(mode === 'create' ? 'Offre créée !' : 'Offre mise à jour !')
			router.push('/admin/offers')
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
				<Field label="Nom de l'offre" error={errors.name} required>
					<input value={form.name} onChange={(e) => set('name', e.target.value)}
						placeholder="Ex: Soldes d'été, Black Friday…" className={cn('input-base', errors.name && 'border-red-500/50')} />
				</Field>
				<Field label="Description">
					<textarea rows={3} value={form.description}
						onChange={(e) => set('description', e.target.value)}
						placeholder="Description optionnelle de l'offre…"
						className="input-base resize-none" />
				</Field>
			</section>

			<section className="card p-6 space-y-5">
				<h2 className="font-display font-bold text-white text-sm uppercase tracking-widest border-b border-dark-700 pb-3">
					Réduction
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<Field label="Type de réduction">
						<select value={form.type} onChange={(e) => set('type', e.target.value)} className="input-base">
							<option value="PERCENTAGE">Pourcentage (%)</option>
							<option value="FIXED_AMOUNT">Montant fixe (€)</option>
						</select>
					</Field>
					<Field label={`Valeur ${form.type === 'PERCENTAGE' ? '(%)' : '(€)'}`} error={errors.value} required>
						<input type="number" value={form.value || ''} min={0}
							max={form.type === 'PERCENTAGE' ? 100 : undefined}
							onChange={(e) => set('value', Number(e.target.value))}
							className={cn('input-base', errors.value && 'border-red-500/50')} />
					</Field>
				</div>
			</section>

			<section className="card p-6 space-y-5">
				<h2 className="font-display font-bold text-white text-sm uppercase tracking-widest border-b border-dark-700 pb-3">
					Période de validité
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<Field label="Date de début" error={errors.startDate} required>
						<input type="datetime-local" value={form.startDate}
							onChange={(e) => set('startDate', e.target.value)}
							className={cn('input-base', errors.startDate && 'border-red-500/50')} />
					</Field>
					<Field label="Date de fin" error={errors.endDate} required>
						<input type="datetime-local" value={form.endDate}
							onChange={(e) => set('endDate', e.target.value)}
							className={cn('input-base', errors.endDate && 'border-red-500/50')} />
					</Field>
				</div>
				<p className="text-xs text-dark-500">
					Passée cette date de fin, l'offre passe automatiquement au statut « Expirée » — y compris pour les visiteurs déjà sur le site.
				</p>
			</section>

			<section className="card p-6 space-y-4">
				<h2 className="font-display font-bold text-white text-sm uppercase tracking-widest border-b border-dark-700 pb-3">
					Véhicules concernés
				</h2>
				<label className="flex items-center gap-3 cursor-pointer group">
					<div className={cn('w-10 h-6 rounded-full transition-all relative',
						form.appliedToAll ? 'bg-brand-500' : 'bg-dark-700')}
						onClick={() => set('appliedToAll', !form.appliedToAll)}>
						<span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow',
							form.appliedToAll ? 'left-5' : 'left-1')} />
					</div>
					<span className="text-sm text-dark-300 group-hover:text-white transition-colors">
						Appliquer à tous les véhicules
					</span>
				</label>

				{!form.appliedToAll && (
					<div>
						<label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-2">
							Sélection ({form.carIds.length} véhicule{form.carIds.length !== 1 ? 's' : ''})
						</label>
						{availableCars.length === 0 ? (
							<p className="text-sm text-dark-500">Aucun véhicule disponible.</p>
						) : (
							<div className="max-h-64 overflow-y-auto space-y-1 border border-dark-700 rounded-xl p-2 bg-dark-900/50">
								{availableCars.map((c) => (
									<label key={c.id}
										className={cn('flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
											form.carIds.includes(c.id) ? 'bg-brand-500/10' : 'hover:bg-dark-800')}>
										<input type="checkbox" checked={form.carIds.includes(c.id)}
											onChange={() => toggleCar(c.id)}
											className="accent-brand-500 w-4 h-4" />
										<span className="text-sm text-white">
											{c.brand} {c.model} <span className="text-dark-400">· {c.year}</span>
										</span>
									</label>
								))}
							</div>
						)}
					</div>
				)}
			</section>

			<section className="card p-6 space-y-5">
				<h2 className="font-display font-bold text-white text-sm uppercase tracking-widest border-b border-dark-700 pb-3">
					Statut
				</h2>
				<label className="flex items-center gap-3 cursor-pointer group">
					<div className={cn('w-10 h-6 rounded-full transition-all relative',
						form.isActive ? 'bg-brand-500' : 'bg-dark-700')}
						onClick={() => set('isActive', !form.isActive)}>
						<span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow',
							form.isActive ? 'left-5' : 'left-1')} />
					</div>
					<span className="text-sm text-dark-300 group-hover:text-white transition-colors">
						{form.isActive ? 'Offre active' : 'Offre en pause (non visible sur le site)'}
					</span>
				</label>
			</section>

			<div className="flex gap-3">
				<button type="submit" disabled={loading} className="btn-primary px-8">
					{loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</> :
						mode === 'create' ? 'Créer l\'offre' : 'Mettre à jour'}
				</button>
				<button type="button" onClick={() => router.back()} className="btn-secondary">
					Annuler
				</button>
			</div>
		</form>
	)
}
