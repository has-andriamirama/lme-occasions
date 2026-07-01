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
import {
	getInstallmentPermissions,
	isFinalInstallment,
	computeMaxAllowedForInstallment,
	type InstallmentPermissions,
} from '@/lib/installments'
import ActionIconButton from '@/components/admin/shared/ActionIconButton'
import ConfirmModal     from '@/components/admin/shared/ConfirmModal'

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
	installment:       PaymentInstallmentSerialized
	totalInstallments: number
	permissions:       InstallmentPermissions
	globalDisabled:    boolean
	disabledReason:    string | null
	onAction:          (inst: PaymentInstallmentSerialized) => void
	onReset:           (inst: PaymentInstallmentSerialized) => void
}

function InstallmentRow({
	installment,
	totalInstallments,
	permissions,
	globalDisabled,
	disabledReason,
	onAction,
	onReset,
}: InstallmentRowProps) {
	const isPaid    = permissions.isPaid
	const isLocked  = isPaid && !permissions.isLastPaid
	const isBlocked = !isPaid && !permissions.isNextPayable

	const canEdit  = !globalDisabled && permissions.canEnterOrEdit
	const canReset = !globalDisabled && permissions.canReset

	const editTitle = globalDisabled
		? (disabledReason ?? 'Action indisponible')
		: isPaid
			? (permissions.isLastPaid
				? 'Modifier cette tranche'
				: 'Verrouillée — seule la dernière tranche réglée est modifiable')
			: (permissions.isNextPayable
				? 'Saisir le paiement'
				: 'La tranche précédente doit d\'abord être réglée')

	const resetTitle = globalDisabled
		? (disabledReason ?? 'Action indisponible')
		: !isPaid
			? 'Tranche non réglée'
			: (permissions.isLastPaid
				? 'Remettre cette tranche à impayée'
				: 'Verrouillée — seule la dernière tranche réglée peut être remise à impayée')

	return (
		<tr
			className={`border-b border-dark-800 last:border-0 transition-colors
				${isPaid ? '' : 'bg-amber-500/3'} ${isBlocked ? 'opacity-60' : ''}`}
		>
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

			<td className="px-4 py-3.5">
				<p className="text-sm font-medium text-white">
					{totalInstallments === 1
						? 'Solde à régler'
						: `Paiement ${installment.installmentNumber} / ${totalInstallments}`}
				</p>
				{installment.notes && (
					<p className="text-xs text-dark-400 mt-0.5 truncate max-w-[180px]">{installment.notes}</p>
				)}
				{isLocked && (
					<p className="text-xs text-dark-500 mt-0.5 inline-flex items-center gap-1">
						<Lock className="w-3 h-3 shrink-0" /> Verrouillée
					</p>
				)}
				{!isPaid && !isBlocked && (
					<p className="text-xs text-amber-400/90 mt-0.5">En attente de saisie</p>
				)}
				{!isPaid && isBlocked && (
					<p className="text-xs text-dark-500 mt-0.5">Tranche précédente à régler d&apos;abord</p>
				)}
			</td>

			<td className="px-4 py-3.5 text-right hidden sm:table-cell">
				<span className="text-sm text-dark-400">{formatPrice(installment.expectedAmount)}</span>
			</td>

			<td className="px-4 py-3.5 text-right">
				{isPaid ? (
					<span className="text-sm font-bold text-emerald-400">
						{formatPrice(installment.paidAmount!)}
					</span>
				) : (
					<span className="text-sm text-dark-600">—</span>
				)}
			</td>

			<td className="px-4 py-3.5 text-center hidden md:table-cell">
				{installment.paidAt ? (
					<span className="text-xs text-dark-400">{formatDate(installment.paidAt)}</span>
				) : (
					<span className="text-xs text-dark-600">—</span>
				)}
			</td>

			<td className="px-4 py-3.5">
				<div className="flex items-center justify-center gap-1">
					<ActionIconButton
						as="button"
						variant="edit"
						title={editTitle}
						disabled={!canEdit}
						onClick={() => onAction(installment)}
					>
						{isPaid ? <Edit2 className="w-4 h-4" /> : <Banknote className="w-4 h-4" />}
					</ActionIconButton>

					<ActionIconButton
						as="button"
						variant="danger"
						title={resetTitle}
						disabled={!canReset}
						onClick={() => onReset(installment)}
					>
						<RotateCcw className="w-4 h-4" />
					</ActionIconButton>
				</div>
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

	const [modal, setModal] = useState<{
		installment: PaymentInstallmentSerialized
		formAmount:  string
		formDate:    string
		formNotes:   string
	} | null>(null)

	const [resetTarget, setResetTarget] = useState<PaymentInstallmentSerialized | null>(null)

	const [saving,    setSaving]    = useState(false)
	const [resetting, setResetting] = useState(false)

	const totalFromInstallments  = installments.reduce((s, i) => s + (i.paidAmount ?? 0), 0)
	const totalPaid              = depositAmount + totalFromInstallments
	const remaining              = Math.max(0, totalPrice - totalPaid)
	const progressPercent        = Math.min(100, Math.round((totalPaid / totalPrice) * 100))
	const isFullyPaid            = totalPaid >= totalPrice
	const paidCount              = installments.filter((i) => i.paidAmount !== null).length
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

	const openModal = useCallback((inst: PaymentInstallmentSerialized) => {
		const today   = new Date().toISOString().slice(0, 10)
		const isFinal = isFinalInstallment(inst, installments.length)

		const forcedAmount = computeMaxAllowedForInstallment(inst.id, installments, totalPrice, depositAmount)

		setModal({
			installment: inst,
			formAmount:  isFinal
				? String(forcedAmount)
				: (inst.paidAmount !== null ? String(inst.paidAmount) : String(inst.expectedAmount)),
			formDate:    inst.paidAt ? inst.paidAt.slice(0, 10) : today,
			formNotes:   inst.notes ?? '',
		})
	}, [installments, totalPrice, depositAmount])

	const closeModal = useCallback(() => setModal(null), [])

	const isModalFinal = modal ? isFinalInstallment(modal.installment, installments.length) : false

	const modalMaxAllowed = modal
		? computeMaxAllowedForInstallment(modal.installment.id, installments, totalPrice, depositAmount)
		: 0

	const handleSave = useCallback(async () => {
		if (!modal) return

		const isFinal    = isFinalInstallment(modal.installment, installments.length)
		const maxAllowed = computeMaxAllowedForInstallment(modal.installment.id, installments, totalPrice, depositAmount)

		const amount = isFinal ? maxAllowed : parseFloat(modal.formAmount)

		if (isNaN(amount) || amount <= 0) {
			toast.error('Montant invalide')
			return
		}

		if (!isFinal && Math.round(amount * 100) > Math.round(maxAllowed * 100)) {
			toast.error(
				`Montant trop élevé. Maximum autorisé : ${formatPrice(maxAllowed)} ` +
				`pour ne pas dépasser le prix total.`
			)
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

			setInstallments(json.data.installments)

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
	}, [modal, reservationId, installments, depositAmount, totalPrice, closeModal, router])

	const closeResetConfirm = useCallback(() => setResetTarget(null), [])

	const handleConfirmReset = useCallback(async () => {
		if (!resetTarget) return

		setResetting(true)
		try {
			const res = await fetch(
				`/api/reservations/${reservationId}/installments/${resetTarget.id}`,
				{
					method:  'PUT',
					headers: { 'Content-Type': 'application/json' },
					body:    JSON.stringify({ paidAmount: null, notes: resetTarget.notes ?? null }),
				},
			)

			const json = await res.json()
			if (!res.ok) throw new Error(json.error ?? 'Erreur serveur')

			setInstallments(json.data.installments)

			if (json.data?.autoReverted) {
				setCurrentStatus('CONFIRMED')
				toast.success(
					'Tranche remise à « impayée » — réservation revenue à Confirmée, ' +
					'véhicule à Réservé.',
					{ duration: 6000 }
				)
			} else {
				toast.success('Tranche remise à « impayée »')
			}

			setResetTarget(null)
			router.refresh()
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur')
		} finally {
			setResetting(false)
		}
	}, [resetTarget, reservationId, router])

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
									{paidCount}/{installments.length} tranche{installments.length > 1 ? 's' : ''}
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
									<th className="text-left px-4 py-2.5 font-medium">Tranche</th>
									<th className="text-right px-4 py-2.5 font-medium hidden sm:table-cell">Attendu</th>
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
										<span className="text-xs text-dark-600">—</span>
									</td>
								</tr>

								{installments.map((inst) => (
									<InstallmentRow
										key={inst.id}
										installment={inst}
										totalInstallments={installments.length}
										permissions={getInstallmentPermissions(inst, installments)}
										globalDisabled={globalDisabled}
										disabledReason={disabledReason}
										onAction={openModal}
										onReset={(i) => setResetTarget(i)}
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
								Si le total n&apos;est plus atteint après modification, la réservation reviendra automatiquement à Confirmée.
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
					onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
				>
					<div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md shadow-2xl">
						<div className="flex items-start justify-between p-6 pb-4">
							<div>
								<h3 className="text-base font-semibold text-white">
									{modal.installment.paidAmount !== null
										? `Modifier le paiement ${modal.installment.installmentNumber}`
										: `Saisir le paiement ${modal.installment.installmentNumber}${installments.length > 1 ? ` / ${installments.length}` : ''}`}
								</h3>
								<p className="text-xs text-dark-400 mt-0.5">
									{isModalFinal
										? `Montant à régler : ${formatPrice(modalMaxAllowed)}`
										: `Montant suggéré : ${formatPrice(modal.installment.expectedAmount)}`}
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
							<div>
								<label className="block text-xs font-medium text-dark-300 mb-1.5">
									Montant réellement encaissé (€) <span className="text-red-400">*</span>
								</label>
								<div className="relative">
									<input
										type="number"
										min="0.01"
										max={modalMaxAllowed}
										step="0.01"
										value={modal.formAmount}
										onChange={(e) => setModal((m) => m ? { ...m, formAmount: e.target.value } : m)}
										disabled={isModalFinal}
										className={`input-base w-full pr-8 ${isModalFinal ? 'opacity-60 cursor-not-allowed' : ''}`}
										placeholder={String(modal.installment.expectedAmount)}
										autoFocus={!isModalFinal}
									/>
									<span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 text-sm">€</span>
								</div>

								{isModalFinal ? (
									<div className="mt-1.5 flex items-start gap-1.5">
										<Lock className="w-3.5 h-3.5 text-dark-500 mt-0.5 shrink-0" />
										<p className="text-xs text-dark-400">
											Dernière tranche : le montant solde automatiquement le reste dû, il n&apos;est pas modifiable.
										</p>
									</div>
								) : (
									<div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
										<p className="text-xs text-dark-500">
											Peut différer du montant suggéré.
										</p>
										<p className="text-xs text-dark-400">
											Solde restant :{' '}
											<span className="text-white font-medium">{formatPrice(modalMaxAllowed)}</span>
										</p>
										{modalMaxAllowed > 0 && (
											<button
												type="button"
												onClick={() =>
													setModal((m) =>
														m ? { ...m, formAmount: String(modalMaxAllowed) } : m
													)
												}
												className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
											>
												Tout régler
											</button>
										)}
									</div>
								)}
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
									placeholder="Ex : virement reçu, solde partiel en espèces…"
								/>
							</div>

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
				open={resetTarget !== null}
				title="Remettre cette tranche à « impayée » ?"
				description={
					resetTarget ? (
						<>
							Le paiement de la tranche{' '}
							<span className="text-white font-medium">{resetTarget.installmentNumber}</span>{' '}
							sera annulé et redeviendra à saisir. Si la réservation avait été finalisée
							automatiquement grâce à ce paiement, elle repassera au statut{' '}
							<span className="text-white font-medium">Confirmée</span> et le véhicule à{' '}
							<span className="text-white font-medium">Réservé</span>.
						</>
					) : ''
				}
				confirmLabel="Remettre"
				confirmVariant="danger"
				loading={resetting}
				onConfirm={handleConfirmReset}
				onCancel={closeResetConfirm}
			/>
		</>
	)
}
