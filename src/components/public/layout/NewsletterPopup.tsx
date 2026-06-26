// src/components/public/layout/NewsletterPopup.tsx
'use client'
import { useState, useEffect } from 'react'
import { X, Mail, Sparkles, Gift, Bell, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function NewsletterPopup() {
	const [visible, setVisible] = useState(false)
	const [email, setEmail]     = useState('')
	const [loading, setLoading] = useState(false)
	const [done, setDone]       = useState(false)

	useEffect(() => {
		const timer = setTimeout(() => setVisible(true), 2500)
		return () => clearTimeout(timer)
	}, [])

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!email) return
		setLoading(true)
		try {
			const res = await fetch('/api/newsletter', {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }),
			})
			const data = await res.json()
			if (data.success) {
				setDone(true)
				toast.success('Bienvenue dans la famille LME Occasions ! 🎉')
				setTimeout(() => setVisible(false), 2500)
			} else {
				toast.error(data.error ?? 'Erreur')
			}
		} catch {
			toast.error('Erreur réseau')
		} finally {
			setLoading(false)
		}
	}

	if (!visible) return null

	return (
		<div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
			<div
				className="absolute inset-0 bg-dark-950/70 backdrop-blur-sm"
				onClick={() => setVisible(false)}
			/>

			<div className="relative w-full max-w-md bg-dark-800 border border-dark-700 rounded-2xl shadow-card-lg overflow-hidden animate-slide-up">
				<div className="h-1 w-full bg-gradient-brand" />

				<button onClick={() => setVisible(false)}
					className="absolute top-4 right-4 p-1.5 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700 transition-all z-10">
					<X className="w-4 h-4" />
				</button>

				<div className="p-8">
					<div className="w-14 h-14 rounded-2xl bg-gradient-brand flex items-center justify-center mb-5 shadow-brand">
						<Sparkles className="w-7 h-7 text-dark-950" />
					</div>

					{done ? (
						<div className="text-center py-4">
							<div className="text-4xl mb-3">🎉</div>
							<h3 className="font-display font-bold text-white text-xl mb-2">Vous êtes inscrit !</h3>
							<p className="text-dark-400 text-sm">Merci de rejoindre la communauté LME Occasions.</p>
						</div>
					) : (
						<>
							<h2 className="font-display font-bold text-white text-2xl leading-tight mb-2">
								Les meilleures offres,<br />
								<span className="text-brand-gradient">en avant-première</span>
							</h2>
							<p className="text-dark-400 text-sm mb-5 leading-relaxed">
								Rejoignez notre communauté et recevez en exclusivité :
							</p>

							<ul className="space-y-2.5 mb-6">
								{[
									{ icon: Gift,  text: 'Offres exclusives et promotions réservées aux abonnés' },
									{ icon: Bell,  text: 'Alertes dès qu\'un véhicule de votre choix arrive' },
									{ icon: Mail,  text: 'Conseils d\'achat de nos experts automobile' },
								].map(({ icon: Icon, text }) => (
									<li key={text} className="flex items-center gap-3 text-sm text-dark-300">
										<div className="w-7 h-7 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
											<Icon className="w-3.5 h-3.5 text-brand-400" />
										</div>
										{text}
									</li>
								))}
							</ul>

							<form onSubmit={handleSubmit} className="space-y-3">
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="votre@email.com"
									className="input-base"
									required
								/>
								<button type="submit" disabled={loading} className="btn-primary w-full">
									{loading
										? <><Loader2 className="w-4 h-4 animate-spin" /> Inscription…</>
										: <><Sparkles className="w-4 h-4" /> S'inscrire gratuitement</>}
								</button>
							</form>
							<p className="text-[11px] text-dark-600 text-center mt-3">
								Sans engagement · Désinscription en un clic
							</p>
						</>
					)}
				</div>
			</div>
		</div>
	)
}
