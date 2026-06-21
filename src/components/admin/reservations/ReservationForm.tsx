// src/components/admin/reservations/ReservationForm.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Loader2, Info, Car as CarIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn, formatPrice } from '@/lib/utils'

interface CarOption {
	id: string; title: string; brand: string; model: string; year: number; price: number
}

interface FormData {
	carId: string
	clientName: string
	clientEmail: string
	clientPhone: string
	totalPrice: number
	depositAmount: number
	installmentType: 'FULL' | 'THREE_TIMES' | 'FOUR_TIMES'
	expiresAt: string // yyyy-mm-dd
	notes: string
}

interface Props {
	mode: 'create' | 'edit'
	availableCars: CarOption[]
	defaultExpiresAt?: string
	initialData?: Partial<FormData> & { id?: string; carLabel?: string; status?: string }
}

const INITIAL: FormData = {
	carId: '', clientName: '', clientEmail: '', clientPhone: '',
	totalPrice: 0, depositAmount: 0, installmentType: 'FULL',
	expiresAt: '', notes: '',
}

const INSTALLMENT_OPTIONS = [
	{ value: 'FULL',        label: 'Paiement comptant (1 fois)' },
	{ value: 'THREE_TIMES', label: 'En 3 fois' },
	{ value: 'FOUR_TIMES',  label: 'En 4 fois' },
]

export default function ReservationForm({ mode, availableCars, defaultExpiresAt, initialData }: Props) {
	const router  = useRouter()
	const [form, setForm] = useState<FormData>({
		...INITIAL,
		expiresAt: defaultExpiresAt ?? '',
		...initialData,
	})
	const [errors, setErrors] = useState<Record<string, string>>({})
	const [loading, setLoading] = useState(false)

	const set = (field: keyof FormData, value: unknown) => {
		setForm((f) => ({ ...f, [field]: value }))
		setErrors((e) => { const n = { ...e }; delete n[field]; return n })
	}

	function handleCarChange(carId: string) {
		const car = availableCars.find((c) => c.id === carId)
		setForm((f) => ({ ...f, carId, totalPrice: car ? car.price : f.totalPrice }))
		setErrors((e) => { const n = { ...e }; delete n.carId; delete n.totalPrice; return n })
	}

	function validate(): boolean {
		const e: Record<string, string> = {}
		if (mode === 'create' && !form.carId) e.carId = 'Véhicule requis'
		if (!form.clientName.trim() || form.clientName.trim().length < 2) e.clientName = 'Nom requis (min 2 caractères)'
		if (!form.clientEmail || !/\S+@\S+\.\S+/.test(form.clientEmail)) e.clientEmail = 'Email invalide'
		if (!form.clientPhone || form.clientPhone.trim().length < 8) e.clientPhone = 'Téléphone requis (min 8 caractères)'
		if (!form.totalPrice || form.totalPrice <= 0) e.totalPrice = 'Prix total invalide'
		if (!form.depositAmount || form.depositAmount <= 0) e.depositAmount = 'Acompte invalide'
		if (form.totalPrice && form.depositAmount > form.totalPrice) e.depositAmount = 'Ne peut pas dépasser le prix total'
		if (!form.expiresAt) e.expiresAt = 'Date limite requise'
		setErrors(e)
		return Object.keys(e).length === 0
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!validate()) { toast.error('Corrigez les erreurs avant de soumettre'); return }
		setLoading(true)
		try {
			const payload: Record<string, unknown> = {
				clientName:      form.clientName.trim(),
				clientEmail:     form.clientEmail.trim(),
				clientPhone:     form.clientPhone.trim(),
				totalPrice:      Number(form.totalPrice),
				depositAmount:   Number(form.depositAmount),
				installmentType: form.installmentType,
				expiresAt:       new Date(`${form.expiresAt}T00:00:00`).toISOString(),
				notes:           form.notes || undefined,
			}
			if (mode === 'create') payload.carId = form.carId

			const url    = mode === 'create' ? '/api/reservations' : `/api/reservations/${initialData?.id}`
			const method = mode === 'create' ? 'POST' : 'PUT'
			const res    = await fetch(url, {
				method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
			})
			const data = await res.json()
			if (!data.success) { toast.error(data.error ?? 'Erreur'); return }
			toast.success(
				mode === 'create'
					? 'Réservation créée ! Les emails de confirmation ont été envoyés.'
					: 'Réservation mise à jour !',
			)
			router.push('/admin/reservations')
			router.refresh()
		} catch {
			toast.error('Erreur réseau')
		} finally {
			setLoading(false)
		}
	}

	const Field = ({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) => (
		<div>
			<label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">
				{label}{required && <span className="text-brand-400 ml-1">*</span>}
			</label>
			{children}
			{error && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
		</div>
	)

	const remaining = Math.max(0, (form.totalPrice || 0) - (form.depositAmount || 0))

	return (
		<form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">

			{/* ── Info banner ──────────────────────────────────────────── */}
			{mode === 'create' && (
				<div className="flex items-start gap-3 rounded-xl border border-brand-500/20 bg-brand-500/10 p-4">
					<Info className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
					<p className="text-sm text-brand-200/90">
						À utiliser quand un client réserve <strong>directement en agence</strong> (acompte déjà réglé sur place,
						client physiquement présent). La réservation sera créée directement au statut <strong>Confirmée</strong>
						(contrairement à une réservation en ligne, qui passe d'abord par <strong>Payée</strong> en attendant la
						présentation du client) — le véhicule passera en <strong>Réservé</strong> et les paiements de tranche
						(comptant, 3x ou 4x) pourront être saisis immédiatement.
					</p>
				</div>
			)}

			{/* ── Section: véhicule ───────────────────────────────────── */}
			<section className="card p-6 space-y-5">
				<h2 className="font-display font-bold text-white text-sm uppercase tracking-widest border-b border-dark-700 pb-3">
					Véhicule
				</h2>

				{mode === 'create' ? (
					<Field label="Véhicule à réserver" error={errors.carId} required>
						{availableCars.length === 0 ? (
							<p className="text-sm text-dark-500">Aucun véhicule disponible à la réservation actuellement.</p>
						) : (
							<select value={form.carId} onChange={(e) => handleCarChange(e.target.value)}
								className={cn('input-base', errors.carId && 'border-red-500/50')}>
								<option value="">— Choisir un véhicule —</option>
								{availableCars.map((c) => (
									<option key={c.id} value={c.id}>
										{c.brand} {c.model} {c.year} — {formatPrice(c.price)}
									</option>
								))}
							</select>
						)}
					</Field>
				) : (
					<div>
						<label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">
							Véhicule
						</label>
						<div className="input-base flex items-center gap-2 bg-dark-800/60 text-dark-300 cursor-not-allowed">
							<CarIcon className="w-4 h-4 text-dark-500" />
							{initialData?.carLabel ?? '—'}
						</div>
						<p className="text-xs text-dark-500 mt-1.5">
							Le véhicule ne peut pas être changé après création. Pour réserver un autre véhicule,
							annulez cette réservation puis créez-en une nouvelle.
						</p>
					</div>
				)}
			</section>

			{/* ── Section: client ─────────────────────────────────────── */}
			<section className="card p-6 space-y-5">
				<h2 className="font-display font-bold text-white text-sm uppercase tracking-widest border-b border-dark-700 pb-3">
					Informations client
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<Field label="Nom complet" error={errors.clientName} required>
						<input value={form.clientName} onChange={(e) => set('clientName', e.target.value)}
							placeholder="Prénom Nom" className={cn('input-base', errors.clientName && 'border-red-500/50')} />
					</Field>
					<Field label="Téléphone" error={errors.clientPhone} required>
						<input value={form.clientPhone} onChange={(e) => set('clientPhone', e.target.value)}
							placeholder="06 XX XX XX XX" className={cn('input-base', errors.clientPhone && 'border-red-500/50')} />
					</Field>
				</div>
				<Field label="Email" error={errors.clientEmail} required>
					<input type="email" value={form.clientEmail} onChange={(e) => set('clientEmail', e.target.value)}
						placeholder="client@email.com" className={cn('input-base', errors.clientEmail && 'border-red-500/50')} />
				</Field>
				<p className="text-xs text-dark-500">
					L'email de confirmation de réservation sera envoyé à cette adresse — vérifiez-la avec le client.
				</p>
			</section>

			{/* ── Section: paiement ───────────────────────────────────── */}
			<section className="card p-6 space-y-5">
				<h2 className="font-display font-bold text-white text-sm uppercase tracking-widest border-b border-dark-700 pb-3">
					Paiement
				</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<Field label="Prix total du véhicule (€)" error={errors.totalPrice} required>
						<input type="number" min={0} step="1" value={form.totalPrice || ''}
							onChange={(e) => set('totalPrice', Number(e.target.value))}
							className={cn('input-base', errors.totalPrice && 'border-red-500/50')} />
					</Field>
					<Field label="Acompte versé par le client (€)" error={errors.depositAmount} required>
						<input type="number" min={0} step="1" value={form.depositAmount || ''}
							onChange={(e) => set('depositAmount', Number(e.target.value))}
							placeholder="Montant réglé en agence"
							className={cn('input-base font-semibold', errors.depositAmount && 'border-red-500/50')} />
					</Field>
				</div>

				<Field label="Mode de règlement du solde">
					<select value={form.installmentType} onChange={(e) => set('installmentType', e.target.value)} className="input-base">
						{INSTALLMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
					</select>
				</Field>

				<div className="flex items-center justify-between rounded-xl border border-dark-700 bg-dark-900/50 px-4 py-3">
					<span className="text-sm text-dark-400">Solde restant à régler</span>
					<span className="text-lg font-display font-bold text-white">{formatPrice(remaining)}</span>
				</div>
			</section>

			{/* ── Section: échéance ───────────────────────────────────── */}
			<section className="card p-6 space-y-5">
				<h2 className="font-display font-bold text-white text-sm uppercase tracking-widest border-b border-dark-700 pb-3">
					Échéance
				</h2>
				<Field label="Date limite pour régler le solde et récupérer le véhicule" error={errors.expiresAt} required>
					<input type="date" value={form.expiresAt}
						onChange={(e) => set('expiresAt', e.target.value)}
						className={cn('input-base', errors.expiresAt && 'border-red-500/50')} />
				</Field>
				<p className="text-xs text-dark-500">
					Cette date est indicative — contrairement à une réservation en ligne (statut « Payée »), une réservation
					créée ici passe directement au statut « Confirmée » et n&apos;expire plus automatiquement. Passé ce délai,
					pensez à relancer le client ou à annuler manuellement la réservation si la vente ne se concrétise pas.
				</p>
			</section>

			{/* ── Section: notes ──────────────────────────────────────── */}
			<section className="card p-6 space-y-4">
				<h2 className="font-display font-bold text-white text-sm uppercase tracking-widest border-b border-dark-700 pb-3">
					Notes internes
				</h2>
				<textarea rows={3} value={form.notes}
					onChange={(e) => set('notes', e.target.value)}
					placeholder="Ex: Acompte réglé en espèces, pièce d'identité vérifiée…"
					className="input-base resize-none" />
			</section>

			{/* Submit */}
			<div className="flex gap-3">
				<button type="submit" disabled={loading} className="btn-primary px-8">
					{loading
						? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</>
						: mode === 'create' ? 'Créer la réservation' : 'Mettre à jour'}
				</button>
				<button type="button" onClick={() => router.back()} className="btn-secondary">
					Annuler
				</button>
			</div>
		</form>
	)
}
