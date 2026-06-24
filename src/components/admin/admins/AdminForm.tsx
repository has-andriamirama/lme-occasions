// src/components/admin/admins/AdminForm.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Plus, Pencil, Eye, EyeOff, Loader2, X, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmModal from '@/components/admin/shared/ConfirmModal'
import { cn } from '@/lib/utils'

interface AdminLite {
	id: string
	username: string
	email: string
	role: string
}

interface Props {
	mode?: 'create' | 'edit'
	admin?: AdminLite
	isSelf?: boolean
}

const RULES = [
	{ label: 'Au moins 8 caractères',         test: (p: string) => p.length >= 8 },
	{ label: 'Au moins une majuscule',        test: (p: string) => /[A-Z]/.test(p) },
	{ label: 'Au moins une minuscule',        test: (p: string) => /[a-z]/.test(p) },
	{ label: 'Au moins un chiffre',           test: (p: string) => /[0-9]/.test(p) },
	{ label: 'Au moins un caractère spécial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function emptyForm(admin?: AdminLite) {
	return {
		username:        admin?.username ?? '',
		email:           admin?.email ?? '',
		password:        '',
		confirmPassword: '',
		role:            admin?.role ?? 'ADMIN',
	}
}

export default function AdminForm({ mode = 'create', admin, isSelf = false }: Props) {
	const router = useRouter()
	const { update } = useSession()

	const [open, setOpen]                       = useState(false)
	const [form, setForm]                       = useState(emptyForm(admin))
	const [showPwd, setShowPwd]                 = useState(false)
	const [loading, setLoading]                 = useState(false)
	const [error, setError]                     = useState('')
	const [confirmTransfer, setConfirmTransfer] = useState(false)

	const isEdit        = mode === 'edit'
	const canChangeRole = isEdit && !isSelf
	const willTransfer  = canChangeRole && form.role === 'SUPER_ADMIN' && admin?.role !== 'SUPER_ADMIN'

	const rules          = RULES.map((r) => ({ ...r, ok: r.test(form.password) }))
	const allRulesOk     = rules.every((r) => r.ok)
	const hasPassword    = form.password.length > 0
	const passwordsMatch = form.password === form.confirmPassword
	const showConfirmField = !isEdit || hasPassword

	const pwdValid = isEdit
		? (hasPassword ? allRulesOk && passwordsMatch : true)
		: hasPassword && allRulesOk && passwordsMatch

	function handleOpen() {
		setForm(emptyForm(admin))
		setError('')
		setShowPwd(false)
		setOpen(true)
	}

	function handleClose() {
		if (loading) return
		setOpen(false)
		setError('')
		setConfirmTransfer(false)
	}

	function handlePasswordChange(pwd: string) {
		setForm((prev) => ({
			...prev,
			password: pwd,
			confirmPassword: !pwd && isEdit ? '' : prev.confirmPassword,
		}))
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError('')

		if (hasPassword) {
			if (!allRulesOk) {
				setError('Le mot de passe ne respecte pas les critères requis.')
				return
			}
			if (!passwordsMatch) {
				setError('Les mots de passe ne correspondent pas.')
				return
			}
		}

		if (willTransfer) {
			setConfirmTransfer(true)
			return
		}
		submit()
	}

	async function submit() {
		setError('')
		setLoading(true)
		try {
			const url    = isEdit ? `/api/admins/${admin!.id}` : '/api/admins'
			const method = isEdit ? 'PATCH' : 'POST'

			const payload: Record<string, unknown> = {
				username: form.username,
				email:    form.email,
			}
			if (form.password) payload.password = form.password
			if (canChangeRole && form.role !== admin?.role) payload.role = form.role

			const res  = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			})
			const data = await res.json()
			if (!data.success) { setError(data.error ?? 'Erreur'); return }

			if (data.superAdminTransferred) {
				await update({ role: 'ADMIN' })
				toast.success(`${form.username} est désormais Super Admin`)
				setOpen(false)
				setConfirmTransfer(false)
				router.push('/admin/dashboard')
				router.refresh()
				return
			}

			toast.success(isEdit ? 'Administrateur mis à jour' : 'Administrateur créé !')
			setOpen(false)
			setConfirmTransfer(false)
			router.refresh()
		} catch {
			setError('Erreur réseau')
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			{isEdit ? (
				<button
					onClick={handleOpen}
					title="Modifier"
					className="p-1.5 text-dark-400 hover:text-brand-400 rounded-lg hover:bg-dark-700 transition-all"
				>
					<Pencil className="w-4 h-4" />
				</button>
			) : (
				<button onClick={handleOpen} className="btn-primary">
					<Plus className="w-4 h-4" />
					Ajouter un administrateur
				</button>
			)}

			{open && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm"
					onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
				>
					<div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-md shadow-card-lg animate-scale-in">
						<div className="flex items-center justify-between mb-5">
							<h3 className="font-display font-bold text-white text-lg">
								{isEdit ? "Modifier l'administrateur" : 'Nouvel administrateur'}
							</h3>
							<button
								onClick={handleClose}
								className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700 transition-all"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{error && (
							<div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm text-red-400">
								{error}
							</div>
						)}

						<form onSubmit={handleSubmit} className="space-y-4">

							<div>
								<label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">
									Identifiant
								</label>
								<input
									value={form.username}
									onChange={(e) => setForm({ ...form, username: e.target.value })}
									placeholder="john_doe"
									className="input-base"
									required
									minLength={3}
								/>
							</div>

							<div>
								<label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">
									Email
								</label>
								<input
									type="email"
									value={form.email}
									onChange={(e) => setForm({ ...form, email: e.target.value })}
									placeholder="john@example.com"
									className="input-base"
									required
								/>
							</div>

							<div>
								<label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">
									Mot de passe{' '}
									{isEdit && <span className="text-dark-500 font-normal">(optionnel)</span>}
								</label>
								<div className="relative">
									<input
										type={showPwd ? 'text' : 'password'}
										value={form.password}
										onChange={(e) => handlePasswordChange(e.target.value)}
										placeholder="••••••••"
										className="input-base pr-10"
										required={!isEdit}
										autoComplete="new-password"
									/>
									<button
										type="button"
										onClick={() => setShowPwd((v) => !v)}
										className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
										tabIndex={-1}
										aria-label={showPwd ? 'Masquer' : 'Afficher'}
									>
										{showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
									</button>
								</div>

								{hasPassword && (
									<div className="mt-2 space-y-1.5">
										{rules.map((r) => (
											<div
												key={r.label}
												className={cn(
													'flex items-center gap-2 text-xs transition-colors',
													r.ok ? 'text-emerald-400' : 'text-dark-500',
												)}
											>
												{r.ok
													? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
													: <XCircle     className="w-3.5 h-3.5 shrink-0" />}
												{r.label}
											</div>
										))}
									</div>
								)}

								{isEdit && !hasPassword && (
									<p className="text-[11px] text-dark-500 mt-1">
										Laisser vide pour conserver le mot de passe actuel.
									</p>
								)}
							</div>

							{showConfirmField && (
								<div>
									<label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">
										Confirmer le mot de passe{' '}
										{isEdit && <span className="text-dark-500 font-normal">(optionnel)</span>}
									</label>
									<div className="relative">
										<input
											type='password'
											value={form.confirmPassword}
											onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
											placeholder="••••••••"
											className={cn(
												'input-base pr-10',
												form.confirmPassword && !passwordsMatch && 'border-red-500/50',
											)}
											required={!isEdit || hasPassword}
											autoComplete="new-password"
										/>
									</div>
									{form.confirmPassword && !passwordsMatch && (
										<p className="text-xs text-red-400 mt-1">
											Les mots de passe ne correspondent pas
										</p>
									)}
								</div>
							)}

							{canChangeRole ? (
								<div>
									<label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">
										Rôle
									</label>
									<select
										value={form.role}
										onChange={(e) => setForm({ ...form, role: e.target.value })}
										className="input-base"
									>
										<option value="ADMIN">Admin</option>
										<option value="SUPER_ADMIN">Super Admin</option>
									</select>
									{willTransfer && (
										<p className="text-[11px] text-amber-400 mt-1">
											Vous transférerez votre statut de Super Admin à cet administrateur ;
											vous deviendrez vous-même un Admin simple.
										</p>
									)}
								</div>
							) : !isEdit && (
								<p className="text-[11px] text-dark-500">
									Les nouveaux comptes sont créés avec le rôle Admin. Le statut de Super Admin
									ne se transmet que depuis la fiche d&apos;un administrateur existant.
								</p>
							)}

							<div className="flex gap-3 pt-2">
								<button
									type="submit"
									disabled={loading || !pwdValid}
									className="btn-primary flex-1"
								>
									{loading
										? <Loader2 className="w-4 h-4 animate-spin" />
										: isEdit ? 'Enregistrer' : 'Créer'}
								</button>
								<button
									type="button"
									onClick={handleClose}
									disabled={loading}
									className="btn-secondary flex-1"
								>
									Annuler
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			<ConfirmModal
				open={confirmTransfer}
				title="Transférer le rôle Super Admin ?"
				description={
					<>
						<span className="text-white font-medium">{form.username}</span>{' '}
						deviendra Super Admin et vous deviendrez un Admin simple. Cette action
						est immédiate et nécessitera une reconnexion pour {form.username} afin
						que son nouveau rôle soit pris en compte.
					</>
				}
				confirmLabel="Confirmer le transfert"
				confirmVariant="danger"
				loading={loading}
				onConfirm={submit}
				onCancel={() => setConfirmTransfer(false)}
			/>
		</>
	)
}
