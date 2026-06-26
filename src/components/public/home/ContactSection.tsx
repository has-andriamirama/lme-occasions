// src/components/public/home/ContactSection.tsx
'use client'
import { useState } from 'react'
import { MessageSquare, Send, Loader2, CheckCircle2, MapPin, Phone, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ContactSection() {
	const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
	const [loading, setLoading] = useState(false)
	const [done, setDone] = useState(false)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!form.name || !form.email || !form.message) return
		setLoading(true)
		try {
			const res = await fetch('/api/contacts', {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form),
			})
			const data = await res.json()
			if (data.success) { setDone(true); toast.success(data.message) }
			else toast.error(data.error ?? 'Erreur')
		} catch {
			toast.error('Erreur réseau')
		} finally {
			setLoading(false)
		}
	}

	return (
		<section id="contact" className="py-20">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
					<div>
						<p className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-2">Contact</p>
						<h2 className="font-display font-black text-3xl sm:text-4xl text-white mb-4">
							Parlons de votre prochain véhicule
						</h2>
						<p className="text-dark-400 leading-relaxed mb-8">
							Notre équipe est disponible pour répondre à toutes vos questions et vous accompagner dans votre recherche.
						</p>
						<div className="space-y-5">
							{[
								{ icon: MapPin, title: 'Adresse', text: '62 Bd du Chaudron\nCentre d\'Affaires Cadgee\n97490 Sainte-Clotilde, La Réunion' },
								{ icon: Phone,  title: 'Téléphone', text: '06 93 40 54 07' },
								{ icon: Mail,   title: 'Email', text: 'contact@lmeoccasions.com' },
							].map(({ icon: Icon, title, text }) => (
								<div key={title} className="flex items-start gap-4">
									<div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
										<Icon className="w-5 h-5 text-brand-400" />
									</div>
									<div>
										<p className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-1">{title}</p>
										<p className="text-sm text-white whitespace-pre-line">{text}</p>
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="card p-8">
						{done ? (
							<div className="text-center py-8">
								<div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
									<CheckCircle2 className="w-8 h-8 text-emerald-400" />
								</div>
								<h3 className="font-display font-bold text-white text-xl mb-2">Message envoyé !</h3>
								<p className="text-dark-400 text-sm">Nous vous répondrons dans les plus brefs délais.</p>
								<button onClick={() => { setDone(false); setForm({ name:'', email:'', phone:'', subject:'', message:'' }) }}
									className="btn-ghost mt-6 text-sm">Envoyer un autre message</button>
							</div>
						) : (
							<form onSubmit={handleSubmit} className="space-y-4">
								<input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

								<div className="flex items-center gap-3 mb-5">
									<MessageSquare className="w-5 h-5 text-brand-400" />
									<h3 className="font-display font-bold text-white">Envoyer un message</h3>
								</div>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									<div>
										<label className="text-xs font-semibold text-dark-400 uppercase tracking-wider block mb-1.5">Nom <span className="text-brand-400">*</span></label>
										<input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
											placeholder="Votre nom" className="input-base" required />
									</div>
									<div>
										<label className="text-xs font-semibold text-dark-400 uppercase tracking-wider block mb-1.5">Téléphone</label>
										<input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}
											placeholder="06 XX XX XX XX" className="input-base" />
									</div>
								</div>
								<div>
									<label className="text-xs font-semibold text-dark-400 uppercase tracking-wider block mb-1.5">Email <span className="text-brand-400">*</span></label>
									<input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
										placeholder="votre@email.com" className="input-base" required />
								</div>
								<div>
									<label className="text-xs font-semibold text-dark-400 uppercase tracking-wider block mb-1.5">Sujet</label>
									<input value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})}
										placeholder="Demande d'information, réservation…" className="input-base" />
								</div>
								<div>
									<label className="text-xs font-semibold text-dark-400 uppercase tracking-wider block mb-1.5">Message <span className="text-brand-400">*</span></label>
									<textarea rows={4} value={form.message} onChange={(e) => setForm({...form, message: e.target.value})}
										placeholder="Écrivez votre message ici…" className="input-base resize-none" required minLength={10} />
								</div>
								<button type="submit" disabled={loading} className="btn-primary w-full">
									{loading
										? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
										: <><Send className="w-4 h-4" /> Envoyer le message</>}
								</button>
							</form>
						)}
					</div>
				</div>
			</div>
		</section>
	)
}
