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
import { isFullyCoveredByDeposit } from '@/lib/balance'
import ActionIconButton from '@/components/admin/shared/ActionIconButton'
import ConfirmModal     from '@/components/admin/shared/ConfirmModal'

export interface BalancePaymentSerialized {
	id:             string
	expectedAmount: number
	paidAmount:     number | null
	paidAt:         string | null
	notes:          string | null
}

export interface PaymentTrackerProps {
	reservationId:     string
	depositAmount:     number
	depositDate:       string
	totalPrice:        number
	installmentType:   'FULL' | 'THREE_TIMES' | 'FOUR_TIMES'
	reservationStatus: string
	balancePayment:    BalancePaymentSerialized | null
}

const INSTALLMENT_LABEL: Record<string, string> = {
	FULL:        'Paiement intégral du solde',
	THREE_TIMES: 'Paiement en 3 fois',
	FOUR_TIMES:  'Paiement en 4 fois',
}

interface ModalState {
	formDate:  string
	formNotes: string
}

export default function PaymentTracker({
	reservationId,
	depositAmount,
	depositDate,
	totalPrice,
	installmentType,
	reservationStatus,
	balancePayment: initialBalancePayment,
}: PaymentTrackerProps) {
	const router = useRouter()

	const [balance, setBalance]             = useState<BalancePaymentSerialized | null>(initialBalancePayment)
	const [currentStatus, setCurrentStatus] = useState(reservationStatus)

	const [modal, setModal] = useState<ModalState | null>(null)
	const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

	const [saving,    setSaving]    = useState(false)
	const [resetting, setResetting] = useState(false)

	const isPaid                 = balance?.paidAmount != null
	const totalPaid              = depositAmount + (balance?.paidAmount ?? 0)
	const remaining              = Math.max(0, totalPrice - totalPaid)
	const progressPercent        = totalPrice > 0 ? Math.min(100, Math.round((totalPaid / totalPrice) * 100)) : 0
	const isFullyPaid            = totalPaid >= totalPrice
	const isCompleted            = currentStatus === 'COMPLETED'
	const isCancelled            = ['CANCELLED', 'EXPIRED'].includes(currentStatus)
	const isAwaitingConfirmation = ['PENDING', 'PAID'].includes(currentStatus)
	const globalDisabled         = isCancelled || isAwaitingConfirmation

	const disabledReason = isCancelled
		? `Réservation ${currentStatus === 'CANCELLED' ? 'annulée' : 'expirée'}`
		: isAwaitingConfirmation
			? (currentStatus === 'PENDING'
				? 'En attente du paiement de l\'acompte'
				: 'En attente de confirmation par un admin')
			: null

	const openModal = useCallback(() => {
		if (!balance) return
		const today = new Date().toISOString().slice(0, 10)
		setModal({
			formDate:  balance.paidAt ? balance.paidAt.slice(0, 10) : today,
			formNotes: balance.notes ?? '',
		})
	}, [balance])

	const closeModal = useCallback(() => setModal(null), [])

	const handleSave = useCallback(async () => {
		if (!modal || !balance) return

		setSaving(true)
		try {
			const res = await fetch(
				`/api/reservations/${reservationId}/balance`,
				{
					method:  'PUT',
					headers: { 'Content-Type': 'application/json' },
					body:    JSON.stringify({
						paidAmount: balance.expectedAmount,
						paidAt:     modal.formDate ? new Date(modal.formDate).toISOString() : null,
						notes:      modal.formNotes || null,
					}),
				},
			)

			const json = await res.json()
			if (!res.ok) throw new Error(json.error ?? 'Erreur serveur')

			setBalance(json.data.balancePayment)

			if (json.data?.autoCompleted) {
				setCurrentStatus('COMPLETED')
				toast.success(
					'Solde intégralement réglé — réservation finalisée automatiquement !',
					{ duration: 5000 }
				)
			} else if (json.data?.autoReverted) {
				setCurrentStatus('CONFIRMED')
				toast.success(
					'Paiement modifié — le total n\'atteint plus le prix de vente : ' +
					'réservation revenue à Confirmée, véhicule à Réservé.',
					{ duration: 6000 }
				)
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
	}, [modal, balance, reservationId, closeModal, router])

	const handleConfirmReset = useCallback(async () => {
		if (!balance) return

		setResetting(true)
		try {
			const res = await fetch(
				`/api/reservations/${reservationId}/balance`,
				{
					method:  'PUT',
					headers: { 'Content-Type': 'application/json' },
					body:    JSON.stringify({ paidAmount: null, notes: balance.notes ?? null }),
				},
			)

			const json = await res.json()
			if (!res.ok) throw new Error(json.error ?? 'Erreur serveur')

			setBalance(json.data.balancePayment)

			if (json.data?.autoReverted) {
				setCurrentStatus('CONFIRMED')
				toast.success(
					'Solde remis à « impayé » — réservation revenue à Confirmée, ' +
					'véhicule à Réservé.',
					{ duration: 6000 }
				)
			} else {
				toast.success('Solde remis à « impayé »')
			}

			setResetConfirmOpen(false)
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur')
		} finally {
			setResetting(false)
		}
	}, [balance, reservationId, router])

	if (!balance) {
		if (isFullyCoveredByDeposit(depositAmount, totalPrice)) {
			return (
				<div className="card p-6 flex items-start gap-3 border border-brand-500/20 bg-brand-500/5">
					<CheckCircle2 className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" />
					<div>
						<p className="text-sm text-white font-medium">Véhicule réglé intégralement à la réservation</p>
						<p className="text-xs text-dark-400 mt-1">
							L&apos;acompte de {formatPrice(depositAmount)} couvrait déjà la totalité du prix de vente
							({formatPrice(totalPrice)}) — aucun reste n&apos;était à régler.
						</p>
					</div>
				</div>
			)
		}
		return (
			<div className="card p-6 flex items-start gap-3">
				<Info className="w-5 h-5 text-dark-500 mt-0.5 shrink-0" />
				<div>
					<p className="text-sm text-white font-medium">Suivi des paiements non disponible</p>
					<p className="text-xs text-dark-400 mt-1">
						Cette réservation a été créée avant la mise en place du suivi du paiement du reste.
						Aucune ligne de paiement n&apos;est disponible pour elle.
					</p>
				</div>
			</div>
		)
	}

	return (
		<>
			<div className="space-y-4">

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
									Reste à régler
								</span>
							)}
							{!isCompleted && !isFullyPaid && (
								<p className="text-xs text-dark-400 mt-1">{formatPrice(remaining)} restants</p>
							)}
						</div>
					</div>

					<div className="h-2 bg-dark-700 rounded-full overflow-hidden">
						<div
							className={`h-full rounded-full transition-all duration-500
								${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-brand-500'}`}
							style={{ width: `${progressPercent}%` }}
						/>
					</div>
					<p className="text-xs text-dark-500 mt-1.5">{progressPercent} % du total encaissé</p>
				</div>

				<div className="card overflow-hidden">
					<div className="px-4 py-3 border-b border-dark-800">
						<p className="text-sm font-medium text-white">Détail des encaissements</p>
					</div>

					<div className="overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-dark-800 text-xs text-dark-500 uppercase tracking-wider">
									<th className="text-left px-4 py-2.5 font-medium w-10" />
									<th className="text-left px-4 py-2.5 font-medium">Paiement</th>
									<th className="text-right px-4 py-2.5 font-medium">Encaissé</th>
									<th className="text-center px-4 py-2.5 font-medium hidden md:table-cell">Date</th>
									<th className="text-center px-4 py-2.5 font-medium w-28">Actions</th>
								</tr>
							</thead>
							<tbody>
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
									<td className="px-4 py-3.5 text-right">
										<span className="text-sm font-bold text-blue-400">{formatPrice(depositAmount)}</span>
									</td>
									<td className="px-4 py-3.5 text-center hidden md:table-cell">
										<span className="text-xs text-dark-400">{formatDate(depositDate)}</span>
									</td>
									<td className="px-4 py-3.5 text-right">
										<span className="text-xs text-dark-600">—</span>
									</td>
								</tr>

								<tr className={`last:border-0 transition-colors ${isPaid ? '' : 'bg-amber-500/3'}`}>
									<td className="px-4 py-3.5 w-10">
										<div className={`w-7 h-7 rounded-full flex items-center justify-center
											${isPaid ? 'bg-emerald-500/20' : 'bg-amber-500/10'}`}>
											<span className={`text-xs font-bold ${isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>R</span>
										</div>
									</td>

									<td className="px-4 py-3.5">
										<p className="text-sm font-medium text-white">Solde restant</p>
										{balance.notes && (
											<p className="text-xs text-dark-400 mt-0.5 truncate max-w-[180px]">{balance.notes}</p>
										)}
										{!isPaid && (
											<p className="text-xs text-amber-400/90 mt-0.5">En attente de règlement</p>
										)}
									</td>

									<td className="px-4 py-3.5 text-right">
										{isPaid ? (
											<span className="text-sm font-bold text-emerald-400">
												{formatPrice(balance.paidAmount!)}
											</span>
										) : (
											<span className="text-sm text-dark-600">—</span>
										)}
									</td>

									<td className="px-4 py-3.5 text-center hidden md:table-cell">
										{balance.paidAt ? (
											<span className="text-xs text-dark-400">{formatDate(balance.paidAt)}</span>
										) : (
											<span className="text-xs text-dark-600">—</span>
										)}
									</td>

									<td className="px-4 py-3.5">
										<div className="flex items-center justify-center gap-1">
											<ActionIconButton
												as="button"
												variant="edit"
												title={globalDisabled
													? (disabledReason ?? 'Action indisponible')
													: (isPaid ? 'Modifier ce paiement' : 'Saisir le paiement du reste')}
												disabled={globalDisabled}
												onClick={openModal}
											>
												{isPaid ? <Edit2 className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
											</ActionIconButton>

											<ActionIconButton
												as="button"
												variant="danger"
												title={globalDisabled
													? (disabledReason ?? 'Action indisponible')
													: (isPaid ? 'Remettre à impayé' : 'Solde non réglé')}
												disabled={globalDisabled || !isPaid}
												onClick={() => setResetConfirmOpen(true)}
											>
												<RotateCcw className="w-4 h-4" />
											</ActionIconButton>
										</div>
									</td>
								</tr>
							</tbody>
						</table>
					</div>

					{isCompleted && (
						<div className="px-4 py-3 border-t border-dark-800 flex items-center gap-2">
							<CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />
							<p className="text-xs text-dark-400">
								Réservation finalisée — le montant reste éditable pour correction comptable.
								Si le total n&apos;est plus atteint après modification, la réservation reviendra automatiquement à Confirmée.
							</p>
						</div>
					)}

					{isAwaitingConfirmation && (
						<div className="px-4 py-3 border-t border-dark-800 flex items-center gap-2">
							<Lock className="w-4 h-4 text-amber-400 shrink-0" />
							<p className="text-xs text-dark-400">
								{currentStatus === 'PENDING'
									? 'En attente du paiement de l\'acompte en ligne — le reste ne pourra être saisi qu\'une fois la réservation confirmée.'
									: 'Réservation payée, en attente de confirmation par un admin (présentation en agence) — le reste ne peut pas encore être saisi.'}
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

				{!isCompleted && isFullyPaid && (
					<div className="card p-4 border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3">
						<TrendingUp className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
						<p className="text-sm text-emerald-300">
							Le solde total est intégralement couvert. La réservation sera clôturée automatiquement au prochain rechargement.
						</p>
					</div>
				)}
			</div>

			{modal && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm"
					onClick={(e) => { if (e.target === e.currentTarget && !saving) closeModal() }}
				>
					<div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-start justify-between p-6 pb-4">
							<div>
								<h3 className="text-base font-semibold text-white">
									{isPaid ? 'Modifier le paiement du reste' : 'Saisir le paiement du reste'}
								</h3>
								<p className="text-xs text-dark-400 mt-0.5">
									Montant à régler : {formatPrice(balance.expectedAmount)}
								</p>
							</div>
							<button
								onClick={closeModal}
								disabled={saving}
								className="p-1.5 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-all"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						<div className="px-6 pb-6 space-y-4">
							<div>
								<label className="block text-xs font-medium text-dark-300 mb-1.5">
									Montant réellement encaissé (€) <span className="text-red-400">*</span>
								</label>
								<div className="relative">
									<input
										type="number"
										value={balance.expectedAmount}
										onChange={() => {}}
										disabled
										readOnly
										className="input-base w-full pr-8 opacity-60 cursor-not-allowed"
									/>
									<span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 text-sm">€</span>
								</div>
								<div className="mt-1.5 flex items-start gap-1.5">
									<Lock className="w-3.5 h-3.5 text-dark-500 mt-0.5 shrink-0" />
									<p className="text-xs text-dark-400">
										Le montant correspond automatiquement au solde restant ; il n&apos;est pas modifiable.
									</p>
								</div>
							</div>

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

							<div>
								<label className="block text-xs font-medium text-dark-300 mb-1.5">
									Notes (optionnel)
								</label>
								<textarea
									rows={2}
									value={modal.formNotes}
									onChange={(e) => setModal((m) => m ? { ...m, formNotes: e.target.value } : m)}
									className="input-base w-full resize-none"
									placeholder="Ex : virement reçu, solde réglé en espèces…"
								/>
							</div>

							{!isPaid && (
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

							<div className="flex gap-3 pt-1">
								<button
									onClick={handleSave}
									disabled={saving}
									className="btn-primary flex-1 justify-center"
								>
									{saving
										? <Loader2 className="w-4 h-4 animate-spin" />
										: <CheckCircle2 className="w-4 h-4" />}
									Enregistrer
								</button>
								<button
									onClick={closeModal}
									disabled={saving}
									className="btn-secondary flex-1 justify-center"
								>
									Annuler
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			<ConfirmModal
				open={resetConfirmOpen}
				title="Remettre ce solde à « impayé » ?"
				description={
					<>
						Le paiement du reste sera annulé et redeviendra à saisir. Si la réservation avait été finalisée
						automatiquement grâce à ce paiement, elle repassera au statut{' '}
						<span className="text-white font-medium">Confirmée</span> et le véhicule à{' '}
						<span className="text-white font-medium">Réservé</span>.
					</>
				}
				confirmLabel="Remettre"
				confirmVariant="danger"
				loading={resetting}
				onConfirm={handleConfirmReset}
				onCancel={() => setResetConfirmOpen(false)}
			/>
		</>
	)
}
