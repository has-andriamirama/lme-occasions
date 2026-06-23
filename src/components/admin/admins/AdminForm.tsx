// src/components/admin/admins/AdminForm.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Eye, EyeOff, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY_FORM = { username: '', email: '', password: '', role: 'ADMIN' }

export default function AdminForm() {
	const router = useRouter()
	const [open, setOpen]       = useState(false)
	const [form, setForm]       = useState(EMPTY_FORM)
	const [showPwd, setShowPwd] = useState(false)
	const [loading, setLoading] = useState(false)
	const [error, setError]     = useState('')

	function handleOpen() {
		setForm(EMPTY_FORM)
		setError('')
		setShowPwd(false)
		setOpen(true)
	}

	function handleClose() {
		if (loading) return
		setOpen(false)
		setError('')
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError('')
		setLoading(true)
		try {
			const res  = await fetch('/api/admins', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form),
			})
			const data = await res.json()
			if (!data.success) { setError(data.error ?? 'Erreur'); return }
			toast.success('Administrateur créé !')
			setOpen(false)
			router.refresh()
		} catch {
			setError('Erreur réseau')
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<button onClick={handleOpen} className="btn-primary">
				<Plus className="w-4 h-4" />
				Ajouter un administrateur
			</button>

			{open && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm"
					onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
				>
					<div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-md shadow-card-lg animate-scale-in">
						<div className="flex items-center justify-between mb-5">
							<h3 className="font-display font-bold text-white text-lg">
								Nouvel administrateur
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
									Mot de passe
								</label>
								<div className="relative">
									<input
										type={showPwd ? 'text' : 'password'}
										value={form.password}
										onChange={(e) => setForm({ ...form, password: e.target.value })}
										placeholder="••••••••"
										className="input-base pr-10"
										required
										minLength={8}
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
								<p className="text-[11px] text-dark-500 mt-1">
									Min. 8 caractères, 1 majuscule, 1 chiffre, 1 caractère spécial
								</p>
							</div>

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
							</div>

							<div className="flex gap-3 pt-2">
								<button type="submit" disabled={loading} className="btn-primary flex-1">
									{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
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
		</>
	)
}
