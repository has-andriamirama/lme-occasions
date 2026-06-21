// src/components/admin/reservations/PaymentTracker.tsx
'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import {
	CheckCircle2,
	Clock,
	Loader2,
	Edit2,
	RotateCcw,
	X,
	AlertTriangle,
	Banknote,
	TrendingUp,
	Info,
	Lock,
} from 'lucide-react'
import { formatPrice, formatDate } from '@/lib/utils'

export interface PaymentInstallmentSerialized {
	id:                string
	installmentNumber: number
	expectedAmount:    number
	paidAmount:        number | null
	paidAt:            string | null
	notes:             string | null
}

export interface PaymentTrackerProps {
	reservationId:     string
	depositAmount:     number
	depositDate:       string
	totalPrice:        number
	installmentType:   'FULL' | 'THREE_TIMES' | 'FOUR_TIMES'
	reservationStatus: string
	installments:      PaymentInstallmentSerialized[]
}

const INSTALLMENT_LABEL: Record<string, string> = {
	FULL:        'Paiement intégral du solde',
	THREE_TIMES: 'Paiement en 3 fois',
	FOUR_TIMES:  'Paiement en 4 fois',
}

interface InstallmentRowProps {
	installment: PaymentInstallmentSerialized
	totalInstallments: number
	disabled:    boolean
	onAction:    (inst: PaymentInstallmentSerialized) => void
}

function InstallmentRow({ installment, totalInstallments, disabled, onAction }: InstallmentRowProps) {
	const isPaid = installment.paidAmount !== null

	return (
		<tr className={`border-b border-dark-800 last:border-0 transition-colors ${isPaid ? '' : 'bg-amber-500/3'}`}>
			{/* Numéro */}
			<td className="px-4 py-3.5 w-10">
				<div
					className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
						${isPaid
							? 'bg-emerald-500/20 text-emerald-400'
							: 'bg-amber-500/10 text-amber-400'}`}
				>
					{installment.installmentNumber}
				</div>
			</td>

			{/* Label */}
			<td className="px-4 py-3.5">
				<p className="text-sm font-medium text-white">
					{totalInstallments === 1
						? 'Solde à régler'
						: `Paiement ${installment.installmentNumber} / ${totalInstallments}`}
				</p>
				{installment.notes && (
					<p className="text-xs text-dark-400 mt-0.5 truncate max-w-[180px]">{installment.notes}</p>
				)}
				{!isPaid && (
					<p className="text-xs text-dark-500 mt-0.5">En attente</p>
				)}
			</td>

			{/* Montant attendu */}
			<td className="px-4 py-3.5 text-right hidden sm:table-cell">
				<span className="text-sm text-dark-400">{formatPrice(installment.expectedAmount)}</span>
			</td>

			{/* Montant encaissé */}
			<td className="px-4 py-3.5 text-right">
				{isPaid ? (
					<span className="text-sm font-bold text-emerald-400">
						{formatPrice(installment.paidAmount!)}
					</span>
				) : (
					<span className="text-sm text-dark-600">—</span>
				)}
			</td>

			{/* Date */}
			<td className="px-4 py-3.5 text-center hidden md:table-cell">
				{installment.paidAt ? (
					<span className="text-xs text-dark-400">{formatDate(installment.paidAt)}</span>
				) : (
					<span className="text-xs text-dark-600">—</span>
				)}
			</td>

			{/* Action */}
			<td className="px-4 py-3.5 text-right">
				<button
					onClick={() => onAction(installment)}
					disabled={disabled}
					className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
						transition-all border disabled:opacity-40 disabled:cursor-not-allowed
						${isPaid
							? 'border-dark-700 text-dark-300 hover:border-dark-600 hover:text-white'
							: 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'}`}
				>
					{isPaid ? <Edit2 className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
					{isPaid ? 'Modifier' : 'Saisir'}
				</button>
			</td>
		</tr>
	)
}

export default function PaymentTracker({
	reservationId,
	depositAmount,
	depositDate,
	totalPrice,
	installmentType,
	reservationStatus,
	installments: initialInstallments,
}: PaymentTrackerProps) {
	const router = useRouter()

	const [installments, setInstallments] = useState<PaymentInstallmentSerialized[]>(initialInstallments)
	const [currentStatus, setCurrentStatus] = useState(reservationStatus)

	// ── Modal ─────────────────────────────────────────────────────────────────
	const [modal, setModal] = useState<{
		installment: PaymentInstallmentSerialized
		formAmount:  string
		formDate:    string
		formNotes:   string
	} | null>(null)

	const [saving,  setSaving]  = useState(false)
	const [resetting, setResetting] = useState(false)

	const totalFromInstallments = installments.reduce((s, i) => s + (i.paidAmount ?? 0), 0)
	const totalPaid             = depositAmount + totalFromInstallments
	const remaining             = Math.max(0, totalPrice - totalPaid)
	const progressPercent       = Math.min(100, Math.round((totalPaid / totalPrice) * 100))
	const isFullyPaid           = totalPaid >= totalPrice
	const paidCount             = installments.filter((i) => i.paidAmount !== null).length
	const isCompleted           = currentStatus === 'COMPLETED'
	const isCancelled           = ['CANCELLED', 'EXPIRED'].includes(currentStatus)
	const isAwaitingConfirmation = ['PENDING', 'PAID'].includes(currentStatus)

	const openModal = useCallback((inst: PaymentInstallmentSerialized) => {
		const today = new Date().toISOString().slice(0, 10)
		setModal({
			installment: inst,
			formAmount:  inst.paidAmount !== null ? String(inst.paidAmount) : String(inst.expectedAmount),
			formDate:    inst.paidAt ? inst.paidAt.slice(0, 10) : today,
			formNotes:   inst.notes ?? '',
		})
	}, [])

	const closeModal = useCallback(() => setModal(null), [])

	const handleSave = useCallback(async () => {
		if (!modal) return

		const amount = parseFloat(modal.formAmount)
		if (isNaN(amount) || amount <= 0) {
			toast.error('Montant invalide')
			return
		}

		setSaving(true)
		try {
			const res = await fetch(
				`/api/reservations/${reservationId}/installments/${modal.installment.id}`,
				{
					method:  'PUT',
					headers: { 'Content-Type': 'application/json' },
					body:    JSON.stringify({
						paidAmount: amount,
						paidAt:     modal.formDate ? new Date(modal.formDate).toISOString() : null,
						notes:      modal.formNotes || null,
					}),
				},
			)

			const json = await res.json()
			if (!res.ok) throw new Error(json.error ?? 'Erreur serveur')

			setInstallments((prev) =>
				prev.map((i) =>
					i.id === modal.installment.id
						? {
								...i,
								paidAmount: amount,
								paidAt: modal.formDate
									? new Date(modal.formDate).toISOString()
									: new Date().toISOString(),
								notes: modal.formNotes || null,
							}
						: i,
				),
			)

			if (json.data?.autoCompleted) {
				setCurrentStatus('COMPLETED')
				toast.success('Solde intégralement réglé — réservation finalisée automatiquement !', { duration: 5000 })
			} else {
				toast.success('Paiement enregistré')
			}

			closeModal()
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement')
		} finally {
			setSaving(false)
		}
	}, [modal, reservationId, closeModal, router])

	const handleReset = useCallback(async () => {
		if (!modal) return
		if (!window.confirm('Remettre cette tranche à « impayée » ?')) return

		setResetting(true)
		try {
			const res = await fetch(
				`/api/reservations/${reservationId}/installments/${modal.installment.id}`,
				{
					method:  'PUT',
					headers: { 'Content-Type': 'application/json' },
					body:    JSON.stringify({ paidAmount: null, notes: modal.formNotes || null }),
				},
			)

			const json = await res.json()
			if (!res.ok) throw new Error(json.error ?? 'Erreur serveur')

			setInstallments((prev) =>
				prev.map((i) =>
					i.id === modal.installment.id
						? { ...i, paidAmount: null, paidAt: null, notes: modal.formNotes || null }
						: i,
				),
			)

			toast.success('Tranche remise à « impayée »')
			closeModal()
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur')
		} finally {
			setResetting(false)
		}
	}, [modal, reservationId, closeModal, router])

	const modalWillComplete = modal
		? (() => {
				const newAmount  = parseFloat(modal.formAmount) || 0
				const currentSum = installments.reduce((s, i) => {
					if (i.id === modal.installment.id) return s
					return s + (i.paidAmount ?? 0)
				}, 0)
				return depositAmount + currentSum + newAmount >= totalPrice
			})()
		: false

	if (installments.length === 0) {
		return (
			<div className="card p-6 flex items-start gap-3">
				<Info className="w-5 h-5 text-dark-500 mt-0.5 shrink-0" />
				<div>
					<p className="text-sm text-white font-medium">Suivi des paiements non disponible</p>
					<p className="text-xs text-dark-400 mt-1">
						Cette réservation a été créée avant la mise en place du suivi des tranches de paiement.
						Aucune ligne de paiement n&apos;est disponible pour elle.
					</p>
				</div>
			</div>
		)
	}

	return (
		<>
			{/* ── Bloc suivi ─────────────────────────────────────────────────────── */}
			<div className="space-y-4">

				{/* En-tête : progression globale */}
				<div className="card p-5">
					<div className="flex items-start justify-between gap-4 mb-4">
						<div>
							<p className="text-xs font-medium text-dark-400 uppercase tracking-wider mb-1">
								Suivi des paiements · {INSTALLMENT_LABEL[installmentType]}
							</p>
							<p className="text-2xl font-display font-bold text-white">
								{formatPrice(totalPaid)}{' '}
								<span className="text-base font-normal text-dark-400">
									encaissés sur {formatPrice(totalPrice)}
								</span>
							</p>
						</div>
						<div className="text-right shrink-0">
							{isCompleted ? (
								<span className="badge bg-brand-500/10 text-brand-400 border-brand-500/20">
									<CheckCircle2 className="w-3.5 h-3.5" />
									Finalisée
								</span>
							) : isFullyPaid ? (
								<span className="badge bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
									<TrendingUp className="w-3.5 h-3.5" />
									Solde réglé
								</span>
							) : (
								<span className="badge bg-amber-500/10 text-amber-400 border-amber-500/20">
									<Clock className="w-3.5 h-3.5" />
									{paidCount}/{installments.length} tranche{installments.length > 1 ? 's' : ''}
								</span>
							)}
							{!isCompleted && !isFullyPaid && (
								<p className="text-xs text-dark-400 mt-1">{formatPrice(remaining)} restants</p>
							)}
						</div>
					</div>

					{/* Barre de progression */}
					<div className="h-2 bg-dark-700 rounded-full overflow-hidden">
						<div
							className={`h-full rounded-full transition-all duration-500
								${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-brand-500'}`}
							style={{ width: `${progressPercent}%` }}
						/>
					</div>
					<p className="text-xs text-dark-500 mt-1.5">{progressPercent} % du total encaissé</p>
				</div>

				{/* Tableau des tranches */}
				<div className="card overflow-hidden">
					<div className="px-4 py-3 border-b border-dark-800">
						<p className="text-sm font-medium text-white">Détail des encaissements</p>
					</div>

					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-dark-800 text-xs text-dark-500 uppercase tracking-wider">
									<th className="text-left px-4 py-2.5 font-medium w-10" />
									<th className="text-left px-4 py-2.5 font-medium">Tranche</th>
									<th className="text-right px-4 py-2.5 font-medium hidden sm:table-cell">Attendu</th>
									<th className="text-right px-4 py-2.5 font-medium">Encaissé</th>
									<th className="text-center px-4 py-2.5 font-medium hidden md:table-cell">Date</th>
									<th className="text-right px-4 py-2.5 font-medium w-28">Action</th>
								</tr>
							</thead>
							<tbody>
								{/* Ligne acompte (lecture seule) */}
								<tr className="border-b border-dark-800">
									<td className="px-4 py-3.5 w-10">
										<div className="w-7 h-7 rounded-full flex items-center justify-center bg-blue-500/10">
											<span className="text-xs font-bold text-blue-400">A</span>
										</div>
									</td>
									<td className="px-4 py-3.5">
										<p className="text-sm font-medium text-white">Acompte initial</p>
										<p className="text-xs text-dark-500">Versé à la réservation</p>
									</td>
									<td className="px-4 py-3.5 text-right hidden sm:table-cell">
										<span className="text-sm text-dark-500">—</span>
									</td>
									<td className="px-4 py-3.5 text-right">
										<span className="text-sm font-bold text-blue-400">{formatPrice(depositAmount)}</span>
									</td>
									<td className="px-4 py-3.5 text-center hidden md:table-cell">
										<span className="text-xs text-dark-400">{formatDate(depositDate)}</span>
									</td>
									<td className="px-4 py-3.5 text-right">
										<span className="text-xs text-dark-600 italic">non modifiable ici</span>
									</td>
								</tr>

								{/* Lignes tranches */}
								{installments.map((inst) => (
									<InstallmentRow
										key={inst.id}
										installment={inst}
										totalInstallments={installments.length}
										disabled={isCancelled || isAwaitingConfirmation}
										onAction={openModal}
									/>
								))}
							</tbody>
						</table>
					</div>

					{isCompleted && (
						<div className="px-4 py-3 border-t border-dark-800 flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />
							<p className="text-xs text-dark-400">
								Réservation finalisée — les montants restent éditables pour correction comptable.
							</p>
						</div>
					)}

					{isAwaitingConfirmation && (
						<div className="px-4 py-3 border-t border-dark-800 flex items-center gap-2">
							<Lock className="w-4 h-4 text-amber-400 shrink-0" />
							<p className="text-xs text-dark-400">
								{currentStatus === 'PENDING'
									? 'En attente du paiement de l\'acompte en ligne — les tranches ne pourront être saisies qu\'une fois la réservation confirmée.'
									: 'Réservation payée, en attente de confirmation par un admin (présentation en agence) — les tranches ne peuvent pas encore être saisies.'}
							</p>
						</div>
					)}

					{isCancelled && (
						<div className="px-4 py-3 border-t border-dark-800 flex items-center gap-2">
							<AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
							<p className="text-xs text-dark-400">
								Cette réservation est {currentStatus === 'CANCELLED' ? 'annulée' : 'expirée'} — modification des paiements désactivée.
							</p>
						</div>
					)}
				</div>

				{/* Alerte clôture imminente */}
				{!isCompleted && isFullyPaid && (
					<div className="card p-4 border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3">
						<TrendingUp className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
						<p className="text-sm text-emerald-300">
							Le solde total est intégralement couvert. La réservation sera clôturée automatiquement au prochain rechargement.
						</p>
					</div>
				)}
			</div>

			{/* ── Modale de saisie / modification ─────────────────────────────────── */}
			{modal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm"
					onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
				>
					<div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl">
						{/* En-tête modale */}
						<div className="flex items-start justify-between p-6 pb-4">
							<div>
								<h3 className="text-base font-semibold text-white">
									{modal.installment.paidAmount !== null
										? `Modifier le paiement ${modal.installment.installmentNumber}`
										: `Saisir le paiement ${modal.installment.installmentNumber}${installments.length > 1 ? ` / ${installments.length}` : ''}`}
								</h3>
								<p className="text-xs text-dark-400 mt-0.5">
									Montant suggéré : {formatPrice(modal.installment.expectedAmount)}
								</p>
							</div>
							<button
								onClick={closeModal}
								className="p-1.5 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-all"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						<div className="px-6 pb-6 space-y-4">
							{/* Montant */}
							<div>
								<label className="block text-xs font-medium text-dark-300 mb-1.5">
									Montant réellement encaissé (€) <span className="text-red-400">*</span>
								</label>
								<div className="relative">
									<input
										type="number"
										min="0"
										step="0.01"
										value={modal.formAmount}
										onChange={(e) => setModal((m) => m ? { ...m, formAmount: e.target.value } : m)}
										className="input-base w-full pr-8"
										placeholder={String(modal.installment.expectedAmount)}
										autoFocus
									/>
									<span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 text-sm">€</span>
								</div>
								<p className="text-xs text-dark-500 mt-1">
									Peut différer du montant suggéré selon ce que le client a versé.
								</p>
							</div>

							{/* Date */}
							<div>
								<label className="block text-xs font-medium text-dark-300 mb-1.5">
									Date du paiement <span className="text-red-400">*</span>
								</label>
								<input
									type="date"
									value={modal.formDate}
									onChange={(e) => setModal((m) => m ? { ...m, formDate: e.target.value } : m)}
									className="input-base w-full"
								/>
							</div>

							{/* Notes */}
							<div>
								<label className="block text-xs font-medium text-dark-300 mb-1.5">
									Notes (optionnel)
								</label>
								<textarea
									rows={2}
									value={modal.formNotes}
									onChange={(e) => setModal((m) => m ? { ...m, formNotes: e.target.value } : m)}
									className="input-base w-full resize-none"
									placeholder="Ex : virement reçu, solde partiel en espèces…"
								/>
							</div>

							{/* Alerte clôture automatique imminente */}
							{modalWillComplete && !isCompleted && (
								<div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
									<p className="text-xs text-emerald-300 flex items-start gap-2">
										<TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
										<span>
											Avec ce montant, le solde total sera couvert.
											La réservation sera <strong>clôturée automatiquement</strong> et le véhicule marqué <strong>Vendu</strong>.
										</span>
									</p>
								</div>
							)}

							{/* Boutons */}
							<div className="flex gap-3 pt-1">
								<button
									onClick={handleSave}
									disabled={saving || resetting}
									className="btn-primary flex-1 justify-center"
								>
									{saving
										? <Loader2 className="w-4 h-4 animate-spin" />
										: <CheckCircle2 className="w-4 h-4" />}
									Enregistrer
								</button>
								<button
									onClick={closeModal}
									disabled={saving || resetting}
									className="btn-secondary flex-1 justify-center"
								>
									Annuler
								</button>
							</div>

							{modal.installment.paidAmount !== null && (
								<div className="pt-1 border-t border-dark-800 text-center">
									<button
										onClick={handleReset}
										disabled={saving || resetting}
										className="inline-flex items-center gap-1.5 text-xs text-dark-500
											hover:text-red-400 transition-colors disabled:opacity-40"
									>
										{resetting
											? <Loader2 className="w-3.5 h-3.5 animate-spin" />
											: <RotateCcw className="w-3.5 h-3.5" />}
										Remettre cette tranche à « impayée »
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	)
}
