// src/components/admin/settings/ChangePasswordModal.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Eye, EyeOff, Lock, CheckCircle2, XCircle, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const RULES = [
	{ label: 'Au moins 8 caractères',         test: (p: string) => p.length >= 8 },
	{ label: 'Au moins une majuscule',        test: (p: string) => /[A-Z]/.test(p) },
	{ label: 'Au moins une minuscule',        test: (p: string) => /[a-z]/.test(p) },
	{ label: 'Au moins un chiffre',           test: (p: string) => /[0-9]/.test(p) },
	{ label: 'Au moins un caractère spécial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

interface Props {
	open: boolean
	onClose?: () => void
}

export default function ChangePasswordModal({ open, onClose }: Props) {
	const { data: session, update } = useSession()
	const router = useRouter()

	const [password, setPassword] = useState('')
	const [confirm, setConfirm]   = useState('')
	const [showPwd, setShowPwd]   = useState(false)
	const [loading, setLoading]   = useState(false)

	const dismissible = Boolean(onClose)
	const rules  = RULES.map((r) => ({ ...r, ok: r.test(password) }))
	const allOk  = rules.every((r) => r.ok) && password.length > 0 && password === confirm

	function reset() {
		setPassword('')
		setConfirm('')
		setShowPwd(false)
	}

	function handleClose() {
		if (loading || !dismissible) return
		reset()
		onClose?.()
	}

	useEffect(() => {
		if (!open || !dismissible || loading) return
		const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
		document.addEventListener('keydown', handler)
		return () => document.removeEventListener('keydown', handler)
	}, [open, dismissible, loading])

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!allOk || !session?.user?.id) return
		setLoading(true)
		try {
			const res  = await fetch(`/api/admins/${session.user.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password }),
			})
			const data = await res.json()
			if (!data.success) { toast.error(data.error ?? 'Erreur'); return }

			await update({ mustChangePassword: false })

			toast.success('Mot de passe mis à jour !')
			reset()
			onClose?.()
			router.push('/admin/dashboard')
			router.refresh()
		} catch {
			toast.error('Erreur réseau')
		} finally {
			setLoading(false)
		}
	}

	if (!open) return null

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm"
			onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
		>
			<div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-md shadow-card-lg animate-scale-in">
				<div className="flex items-center justify-between mb-2">
					<h3 className="font-display font-bold text-white text-lg flex items-center gap-2">
						<Lock className="w-4 h-4 text-brand-400" />
						Changer le mot de passe
					</h3>
					{dismissible && (
						<button
							onClick={handleClose}
							className="p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700 transition-all"
						>
							<X className="w-4 h-4" />
						</button>
					)}
				</div>

				{!dismissible && (
					<div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-3 mb-2 text-sm text-amber-400">
						Vous devez changer votre mot de passe avant de continuer.
					</div>
				)}

				<form onSubmit={handleSubmit} className="space-y-4 mt-4">
					<div>
						<label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">
							Nouveau mot de passe <span className="text-brand-400">*</span>
						</label>
						<div className="relative">
							<input
								type={showPwd ? 'text' : 'password'}
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								className="input-base pr-10"
								autoComplete="new-password"
								required
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
					</div>

					{password && (
						<div className="space-y-1.5">
							{rules.map((r) => (
								<div key={r.label} className={cn(
									'flex items-center gap-2 text-xs transition-colors',
									r.ok ? 'text-emerald-400' : 'text-dark-500'
								)}>
									{r.ok
										? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
										: <XCircle className="w-3.5 h-3.5 shrink-0" />}
									{r.label}
								</div>
							))}
						</div>
					)}

					<div>
						<label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">
							Confirmer le mot de passe <span className="text-brand-400">*</span>
						</label>
						<input
							type="password"
							value={confirm}
							onChange={(e) => setConfirm(e.target.value)}
							placeholder="••••••••"
							className={cn('input-base', confirm && password !== confirm && 'border-red-500/50')}
							autoComplete="new-password"
							required
						/>
						{confirm && password !== confirm && (
							<p className="text-xs text-red-400 mt-1">Les mots de passe ne correspondent pas</p>
						)}
					</div>

					<div className="flex gap-3 pt-2">
						<button type="submit" disabled={!allOk || loading} className="btn-primary flex-1">
							{loading
								? <><Loader2 className="w-4 h-4 animate-spin" /> Mise à jour...</>
								: 'Mettre à jour le mot de passe'}
						</button>
						{dismissible && (
							<button
								type="button"
								onClick={handleClose}
								disabled={loading}
								className="btn-secondary flex-1"
							>
								Annuler
							</button>
						)}
					</div>
				</form>
			</div>
		</div>
	)
}
