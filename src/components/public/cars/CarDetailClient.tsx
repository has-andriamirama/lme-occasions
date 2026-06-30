// src/components/public/cars/CarDetailClient.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
	ChevronLeft, ChevronRight, Gauge, Calendar, Fuel, Settings2,
	Users, DoorOpen, Palette, Zap, CheckCircle2, AlertTriangle,
	Shield, Phone, CreditCard, Loader2, Star, Tag, Clock
} from 'lucide-react'
import {
	formatPrice, formatMileage, getStatusLabel, getStatusColor,
	getTransmissionLabel, getFuelLabel, calculateDiscountedPrice, formatDate,
	getOfferStatus, cn
} from '@/lib/utils'
import { useCarUpdates } from '@/hooks/useCarUpdates'
import { useOfferUpdates } from '@/hooks/useOfferUpdates'
import { useNow } from '@/hooks/useNow'
import toast from 'react-hot-toast'
import type { Car, Offer } from '@prisma/client'

type CarWithOffers = Car & { offers: Array<{ offer: Offer }> }

interface Props {
	car: CarWithOffers
	paymentSuccess: boolean
	paymentCancelled: boolean
}

export default function CarDetailClient({ car: initialCar, paymentSuccess, paymentCancelled }: Props) {
	const router = useRouter()
	const [car, setCar]         = useState(initialCar)
	const [imgIdx, setImgIdx]   = useState(0)
	const [loading, setLoading] = useState(false)
	const [form, setForm]       = useState({ clientName: '', clientEmail: '', clientPhone: '' })
	const [installment, setInstallment] = useState<'FULL' | 'THREE_TIMES' | 'FOUR_TIMES'>('FULL')
	const [errors, setErrors]   = useState<Record<string, string>>({})

	const allImages = car.mainImage
		? [car.mainImage, ...car.images.filter((i) => i !== car.mainImage)]
		: car.images

	const now = useNow(15000)

	const rawOffer = car.offers[0]?.offer ?? null
	const activeOffer = rawOffer && getOfferStatus(rawOffer, now) === 'ACTIVE' ? rawOffer : null
	const finalPrice = activeOffer
		? calculateDiscountedPrice(car.price, activeOffer.type as any, activeOffer.value)
		: car.price
	const depositAmount = Math.round(finalPrice * 0.30)
	const isAvailable = car.status === 'AVAILABLE'

	useCarUpdates({
		onChange: (updatedCar) => {
			if (updatedCar.id !== car.id) return

			const statusChangedToReserved = updatedCar.status !== undefined
				&& updatedCar.status !== car.status
				&& updatedCar.status === 'RESERVED'

			setCar((prev) => ({ ...prev, ...updatedCar } as typeof prev))

			if (statusChangedToReserved) {
				toast.error('Ce véhicule vient d\'être réservé par quelqu\'un d\'autre.')
			}
		},
		onDelete: (carId) => {
			if (carId !== car.id) return
			toast.error('Ce véhicule a été retiré du catalogue.')
			router.push('/cars')
		},
	})

	useOfferUpdates({
		onCreate: (offer) => {
			setCar((prev) => {
				const isLinked = offer.carIds.includes(prev.id)
				if (isLinked) return { ...prev, offers: [{ offer: offer as any }] }
				return prev
			})
		},
		onChange: (offer) => {
			setCar((prev) => {
				const isLinked = offer.carIds.includes(prev.id)
				const hasThisOffer = prev.offers[0]?.offer?.id === offer.id
				if (isLinked) return { ...prev, offers: [{ offer: offer as any }] }
				if (hasThisOffer) return { ...prev, offers: [] }
				return prev
			})
		},
		onDelete: (offerId) => {
			setCar((prev) =>
				prev.offers[0]?.offer?.id === offerId ? { ...prev, offers: [] } : prev
			)
		},
	})

	useEffect(() => {
		if (paymentSuccess) toast.success('Paiement réussi ! Présentez-vous en agence sous 5 jours.')
		if (paymentCancelled) toast.error('Paiement annulé. Vous pouvez réessayer.')
	}, [paymentSuccess, paymentCancelled])

	function validate() {
		const e: Record<string, string> = {}
		if (!form.clientName.trim() || form.clientName.length < 2) e.clientName  = 'Nom requis (min 2 caractères)'
		if (!form.clientEmail || !/\S+@\S+\.\S+/.test(form.clientEmail)) e.clientEmail = 'Email invalide'
		if (!form.clientPhone || form.clientPhone.length < 8) e.clientPhone = 'Téléphone requis'
		setErrors(e)
		return Object.keys(e).length === 0
	}

	async function handleReserve() {
		if (!validate()) return
		setLoading(true)
		try {
			const res = await fetch('/api/payments/create-checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					carId: car.id, ...form, installmentType: installment,
				}),
			})
			const data = await res.json()
			if (!data.success) {
				if (res.status === 409) {
					setCar((prev) => ({ ...prev, status: 'RESERVED' }))
					toast.error('Ce véhicule vient d\'être réservé. Veuillez en choisir un autre.')
				} else {
					toast.error(data.error ?? 'Erreur lors du paiement')
				}
				return
			}
			window.location.href = data.data.url
		} catch {
			toast.error('Erreur réseau. Veuillez réessayer.')
		} finally {
			setLoading(false)
		}
	}

	const prevImg = () => setImgIdx((i) => (i - 1 + allImages.length) % allImages.length)
	const nextImg = () => setImgIdx((i) => (i + 1) % allImages.length)

	const specItems = [
		{ icon: Gauge,     label: 'Kilométrage',  value: formatMileage(car.mileage) },
		{ icon: Calendar,  label: 'Année',        value: String(car.year) },
		{ icon: Fuel,      label: 'Carburant',    value: getFuelLabel(car.fuelType) },
		{ icon: Settings2, label: 'Transmission', value: getTransmissionLabel(car.transmission) },
		{ icon: Users,     label: 'Places',       value: String(car.seats ?? 5) },
		{ icon: DoorOpen,  label: 'Portes',       value: String(car.doors ?? 4) },
		...(car.color      ? [{ icon: Palette, label: 'Couleur', value: car.color }] : []),
		...(car.engineSize ? [{ icon: Zap, label: 'Motorisation', value: car.engineSize }] : []),
	]

	return (
		<div className="pt-20 pb-20 min-h-screen">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

				<nav className="flex items-center gap-2 text-sm text-dark-400 mb-8 pt-4">
					<Link href="/" className="hover:text-white transition-colors">Accueil</Link>
					<span>/</span>
					<Link href="/cars" className="hover:text-white transition-colors">Véhicules</Link>
					<span>/</span>
					<span className="text-white truncate max-w-[200px]">{car.title}</span>
				</nav>

				{paymentSuccess && (
					<div className="flex items-start gap-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 mb-8">
						<CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
						<div>
							<h3 className="font-semibold text-white mb-1">Paiement reçu !</h3>
							<p className="text-sm text-dark-300">
								Un email récapitulatif vous a été envoyé. Présentez-vous en agence sous 5 jours avec une pièce
								d&apos;identité pour que votre réservation soit définitivement confirmée et finaliser la vente.
							</p>
						</div>
					</div>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

					<div className="lg:col-span-3 space-y-6">

						<div className="relative rounded-2xl overflow-hidden bg-dark-800 border border-dark-700">
							<div className="relative aspect-[16/10]">
								{allImages[imgIdx] ? (
									<Image src={allImages[imgIdx]} alt={car.title} fill
										className="object-cover transition-opacity duration-300" priority={imgIdx === 0}
										sizes="(max-width: 1024px) 100vw, 60vw" />
								) : (
									<div className="absolute inset-0 flex items-center justify-center bg-dark-800">
										<Settings2 className="w-16 h-16 text-dark-600" />
									</div>
								)}
								<div className="absolute top-4 left-4 flex items-center gap-2">
									<span className={`badge ${getStatusColor(car.status)}`}>
										<span className={`status-dot ${
											car.status === 'AVAILABLE' ? 'bg-emerald-400' :
											car.status === 'RESERVED'  ? 'bg-amber-400' : 'bg-red-400'
										}`} />
										{getStatusLabel(car.status)}
									</span>
									{car.isFeatured && (
										<span className="badge bg-brand-500/10 text-brand-400 border-brand-500/20">
											<Star className="w-3 h-3" fill="currentColor" /> Vedette
										</span>
									)}
								</div>
								{activeOffer && (
									<div className="absolute top-4 right-4 badge bg-brand-500 text-dark-950 border-0 font-bold text-sm">
										<Tag className="w-3.5 h-3.5" />
										{activeOffer.type === 'PERCENTAGE' ? `-${activeOffer.value}%` : `-${activeOffer.value}€`}
									</div>
								)}
								{allImages.length > 1 && (
									<>
										<button onClick={prevImg}
											className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
																 bg-dark-950/70 backdrop-blur-sm border border-dark-700 flex items-center justify-center
																 text-white hover:bg-dark-800 transition-all">
											<ChevronLeft className="w-5 h-5" />
										</button>
										<button onClick={nextImg}
											className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full
																 bg-dark-950/70 backdrop-blur-sm border border-dark-700 flex items-center justify-center
																 text-white hover:bg-dark-800 transition-all">
											<ChevronRight className="w-5 h-5" />
										</button>
										<div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
											{allImages.map((_, i) => (
												<button key={i} onClick={() => setImgIdx(i)}
													className={cn('rounded-full transition-all',
														i === imgIdx ? 'w-5 h-1.5 bg-brand-400' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70')} />
											))}
										</div>
									</>
								)}
							</div>
							{allImages.length > 1 && (
								<div className="flex gap-2 p-3 overflow-x-auto">
									{allImages.map((src, i) => (
										<button key={i} onClick={() => setImgIdx(i)}
											className={cn('relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all',
												i === imgIdx ? 'border-brand-400' : 'border-dark-600 hover:border-dark-400')}>
											<Image src={src} alt="" fill className="object-cover" />
										</button>
									))}
								</div>
							)}
						</div>

						<div>
							<div className="flex items-start justify-between gap-4 flex-wrap mb-3">
								<div>
									<p className="text-sm font-bold text-brand-400 uppercase tracking-wider mb-1">{car.brand}</p>
									<h1 className="font-display font-black text-2xl sm:text-3xl text-white leading-tight">{car.title}</h1>
								</div>
								<div className="text-right flex-1">
									{activeOffer && (
										<p className="text-sm text-dark-500 line-through">{formatPrice(car.price)}</p>
									)}
									<p className="font-display font-black text-3xl text-white">{formatPrice(finalPrice)}</p>
									{activeOffer && (
										<p className="text-xs text-brand-400 mt-0.5">
											{activeOffer.name} · expire le {formatDate(activeOffer.endDate)}
										</p>
									)}
								</div>
							</div>
						</div>

						<div className="card p-5">
							<h2 className="font-display font-bold text-white text-sm uppercase tracking-widest mb-4">
								Caractéristiques
							</h2>
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
								{specItems.map(({ icon: Icon, label, value }) => (
									<div key={label} className="text-center p-3 bg-dark-900/50 rounded-xl">
										<Icon className="w-5 h-5 text-brand-400 mx-auto mb-1.5" />
										<p className="text-xs text-dark-400 mb-0.5">{label}</p>
										<p className="text-sm font-semibold text-white">{value}</p>
									</div>
								))}
							</div>
						</div>

						<div className="card p-6">
							<h2 className="font-display font-bold text-white text-sm uppercase tracking-widest mb-4">Description</h2>
							<p className="text-dark-300 text-sm leading-relaxed whitespace-pre-line">{car.description}</p>
							{car.condition && (
								<div className="mt-4 p-3 bg-dark-900/50 rounded-lg border border-dark-700">
									<p className="text-xs font-semibold text-brand-400 mb-1">État / Info complémentaire</p>
									<p className="text-sm text-dark-300">{car.condition}</p>
								</div>
							)}
						</div>

						{car.equipments.length > 0 && (
							<div className="card p-6">
								<h2 className="font-display font-bold text-white text-sm uppercase tracking-widest mb-4">
									Équipements ({car.equipments.length})
								</h2>
								<div className="flex flex-wrap gap-2">
									{car.equipments.map((eq) => (
										<span key={eq}
											className="flex items-center gap-1.5 bg-dark-900/60 border border-dark-700
																 text-sm text-dark-300 rounded-lg px-3 py-1.5">
											<CheckCircle2 className="w-3.5 h-3.5 text-brand-400 shrink-0" />
											{eq}
										</span>
									))}
								</div>
							</div>
						)}
					</div>

					<div className="lg:col-span-2">
						<div className="sticky top-24 space-y-4">

							{!isAvailable && (
								<div className={cn('rounded-2xl p-5 border',
									car.status === 'RESERVED'
										? 'bg-amber-500/10 border-amber-500/20'
										: 'bg-red-500/10 border-red-500/20'
								)}>
									<div className="flex items-center gap-3">
										<AlertTriangle className={cn('w-6 h-6 shrink-0',
											car.status === 'RESERVED' ? 'text-amber-400' : 'text-red-400')} />
										<div>
											<p className={cn('font-semibold', car.status === 'RESERVED' ? 'text-amber-300' : 'text-red-300')}>
												{car.status === 'RESERVED' ? 'Véhicule réservé' : 'Véhicule vendu'}
											</p>
											<p className="text-sm text-dark-400 mt-0.5">
												{car.status === 'RESERVED'
													? 'Ce véhicule est en cours de réservation.'
													: 'Ce véhicule a déjà été vendu.'}
											</p>
										</div>
									</div>
									<Link href="/cars" className="btn-secondary w-full justify-center mt-4 text-sm">
										Voir d'autres véhicules
									</Link>
								</div>
							)}

							{isAvailable && (
								<div className="card p-6">
									<div className="flex items-center gap-3 mb-5">
										<div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
											<CreditCard className="w-5 h-5 text-brand-400" />
										</div>
										<div>
											<h3 className="font-display font-bold text-white text-base">Réserver ce véhicule</h3>
											<p className="text-xs text-dark-400">Acompte sécurisé par Stripe</p>
										</div>
									</div>

									<div className="bg-dark-900/60 rounded-xl p-4 mb-5 space-y-2">
										<div className="flex justify-between text-sm">
											<span className="text-dark-400">Prix du véhicule</span>
											<span className="text-white font-medium">{formatPrice(finalPrice)}</span>
										</div>
										<div className="flex justify-between text-sm">
											<span className="text-dark-400">Acompte (30%)</span>
											<span className="text-brand-400 font-bold">{formatPrice(depositAmount)}</span>
										</div>
										<div className="flex justify-between text-sm pt-2 border-t border-dark-700">
											<span className="text-dark-400">Solde en agence</span>
											<span className="text-white">{formatPrice(finalPrice - depositAmount)}</span>
										</div>
									</div>

									{car.allowInstallment && (
										<div className="mb-5">
											<label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-2">
												Mode de paiement
											</label>
											<div className="grid grid-cols-3 gap-2">
												{[
													{ value: 'FULL',        label: 'Comptant' },
													{ value: 'THREE_TIMES', label: '3× CB' },
													{ value: 'FOUR_TIMES',  label: '4× CB' },
												].map(({ value, label }) => (
													<button key={value} type="button"
														onClick={() => setInstallment(value as any)}
														className={cn('py-2.5 rounded-lg text-xs font-semibold border transition-all',
															installment === value
																? 'bg-brand-500/10 border-brand-500/40 text-brand-400'
																: 'bg-dark-800 border-dark-700 text-dark-400 hover:border-dark-600 hover:text-white')}>
														{label}
													</button>
												))}
											</div>
										</div>
									)}

									<div className="space-y-3 mb-5">
										<div>
											<label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">
												Nom complet <span className="text-brand-400">*</span>
											</label>
											<input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })}
												placeholder="Prénom Nom" className={cn('input-base text-sm', errors.clientName && 'border-red-500/50')} />
											{errors.clientName && <p className="text-xs text-red-400 mt-1">{errors.clientName}</p>}
										</div>
										<div>
											<label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">
												Email <span className="text-brand-400">*</span>
											</label>
											<input type="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })}
												placeholder="votre@email.com" className={cn('input-base text-sm', errors.clientEmail && 'border-red-500/50')} />
											{errors.clientEmail && <p className="text-xs text-red-400 mt-1">{errors.clientEmail}</p>}
										</div>
										<div>
											<label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">
												Téléphone <span className="text-brand-400">*</span>
											</label>
											<input value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: e.target.value })}
												placeholder="06 XX XX XX XX" className={cn('input-base text-sm', errors.clientPhone && 'border-red-500/50')} />
											{errors.clientPhone && <p className="text-xs text-red-400 mt-1">{errors.clientPhone}</p>}
										</div>
									</div>

									<div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 text-xs text-amber-300 space-y-1">
										<div className="flex items-center gap-1.5 font-semibold">
											<Clock className="w-3.5 h-3.5 shrink-0" /> Délai de 5 jours
										</div>
										<p>Après réservation, vous disposez de 5 jours pour finaliser la vente en agence. L'acompte n'est pas remboursable en cas d'expiration.</p>
									</div>

									<button onClick={handleReserve} disabled={loading} className="btn-primary w-full text-base py-4">
										{loading
											? <><Loader2 className="w-5 h-5 animate-spin" /> Redirection Stripe...</>
											: <><CreditCard className="w-5 h-5" /> Payer l'acompte {formatPrice(depositAmount)}</>}
									</button>

									<p className="text-[11px] text-dark-500 text-center mt-3">
										En continuant, vous acceptez nos{' '}
										<Link href="/cgv" target="_blank" className="text-brand-500 hover:underline">CGV</Link>.
										Paiement sécurisé par Stripe.
									</p>
								</div>
							)}

							<div className="card p-4">
								<div className="grid grid-cols-3 gap-3 text-center">
									{[
										{ icon: Shield, label: 'Paiement\nsécurisé' },
										{ icon: Phone, label: 'Support\ndédié' },
										{ icon: CheckCircle2, label: 'Véhicule\ncontrôlé' },
									].map(({ icon: Icon, label }) => (
										<div key={label}>
											<Icon className="w-5 h-5 text-brand-400 mx-auto mb-1" />
											<p className="text-[11px] text-dark-400 whitespace-pre-line">{label}</p>
										</div>
									))}
								</div>
							</div>

							<a href="tel:+262693405407"
								className="btn-secondary w-full justify-center text-sm">
								<Phone className="w-4 h-4" /> Appeler l'agence
							</a>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
