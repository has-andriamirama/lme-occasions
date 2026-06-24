// src/app/(admin)/admin/settings/change-password/page.tsx
'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const RULES = [
	{ label: 'Au moins 8 caractères',         test: (p: string) => p.length >= 8 },
	{ label: 'Au moins une majuscule',        test: (p: string) => /[A-Z]/.test(p) },
	{ label: 'Au moins une minuscule',        test: (p: string) => /[a-z]/.test(p) },
	{ label: 'Au moins un chiffre',           test: (p: string) => /[0-9]/.test(p) },
	{ label: 'Au moins un caractère spécial', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

export default function ChangePasswordPage() {
	const { data: session, update } = useSession()
	const router = useRouter()
	const [password, setPassword]   = useState('')
	const [confirm, setConfirm]     = useState('')
	const [showPwd, setShowPwd]     = useState(false)
	const [loading, setLoading]     = useState(false)

	const rules = RULES.map((r) => ({ ...r, ok: r.test(password) }))
	const allOk = rules.every((r) => r.ok) && password === confirm

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!allOk) return
		setLoading(true)
		try {
			const res = await fetch(`/api/admins/${session?.user.id}`, {
				method: 'PATCH', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password }),
			})
			const data = await res.json()
			if (!data.success) { toast.error(data.error); return }
			await update({ mustChangePassword: false })
			toast.success('Mot de passe mis à jour !')
			router.push('/admin/dashboard')
		} catch {
			toast.error('Erreur réseau')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="max-w-md mx-auto space-y-6">
			<div>
				<h1 className="text-2xl font-display font-bold text-white">Changer le mot de passe</h1>
				{session?.user.mustChangePassword && (
					<div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-400">
						Vous devez changer votre mot de passe avant de continuer.
					</div>
				)}
			</div>

			<div className="card p-6">
				<form onSubmit={handleSubmit} className="space-y-5">
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
								className="input-base pl-10 pr-10"
								autoComplete="new-password"
								required
							/>
							<button type="button" onClick={() => setShowPwd((v) => !v)}
								className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors">
								{showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
							</button>
						</div>
					</div>

					{password && (
						<div className="space-y-1.5">
							{rules.map((r) => (
								<div key={r.label} className={`flex items-center gap-2 text-xs transition-colors
									${r.ok ? 'text-emerald-400' : 'text-dark-500'}`}>
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

					<button type="submit" disabled={!allOk || loading} className="btn-primary w-full">
						{loading
							? <><Loader2 className="w-4 h-4 animate-spin" /> Mise à jour...</>
							: 'Mettre à jour le mot de passe'}
					</button>
				</form>
			</div>
		</div>
	)
}
