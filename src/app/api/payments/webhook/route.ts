// src/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/stripe'
import prisma from '@/lib/db'
import { broadcastCarUpdated, broadcastReservationCreated } from '@/lib/pusher'
import { sendPaymentReceivedToClient, sendReservationNotificationToAdmin } from '@/lib/mail'
import { upsertInvoice, depositPaymentMethodLabel } from '@/lib/invoices'
import { safePusher } from '@/lib/api'

export async function POST(req: NextRequest) {
	let event
	try {
		const body      = await req.text()
		const signature = req.headers.get('stripe-signature')!
		event = await constructWebhookEvent(body, signature)
	} catch (err: any) {
		console.error('[Webhook] Signature invalide :', err.message)
		return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
	}

	try {
		switch (event.type) {

			case 'checkout.session.completed': {
				const session = event.data.object as any
				if (session.payment_status !== 'paid') break

				const { reservationId, carId, clientName, clientEmail, clientPhone, depositAmount } =
					session.metadata as Record<string, string>

				console.log('[Webhook] checkout.session.completed →', { reservationId, carId })

				await prisma.$transaction(async (tx) => {
					const reservation = reservationId
						? await tx.reservation.findFirst({ where: { id: reservationId, status: 'PENDING' } })
						: await tx.reservation.findFirst({ where: { paymentSessionId: session.id, status: 'PENDING' } })

					if (!reservation) { console.log('[Webhook] Réservation introuvable ou déjà traitée'); return }

					const car = await tx.car.findUnique({ where: { id: carId } })
					if (!car) { console.log('[Webhook] Voiture introuvable :', carId); return }

					if (car.status !== 'AVAILABLE' && car.status !== 'RESERVED') {
						await tx.reservation.update({ where: { id: reservation.id }, data: { status: 'CANCELLED' } })
						return
					}

					await tx.car.update({ where: { id: carId }, data: { status: 'RESERVED' } })

					const now            = new Date()
					const expiryDays     = Number(process.env.RESERVATION_EXPIRY_DAYS ?? 5)
					const payedExpiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000)

					await tx.reservation.update({
						where: { id: reservation.id },
						data: {
							paymentIntentId:  session.payment_intent,
							paymentSessionId: session.id,
							status:           'PAID',
							paidAt:           now,
							expiresAt:        payedExpiresAt,
						},
					})
					console.log('[Webhook] DB mise à jour : voiture RESERVED, réservation PAID')
				})

				const paid = await prisma.reservation.findFirst({
					where:   { paymentSessionId: session.id, status: 'PAID' },
					include: { car: true },
				})
				if (!paid) { console.log('[Webhook] Réservation payée introuvable après transaction'); break }

				await safePusher(async () => {
					await broadcastCarUpdated({ id: carId, status: 'RESERVED', title: paid.car.title })
					await broadcastReservationCreated({
						id:              paid.id,
						carId,
						car:             { id: paid.car.id, title: paid.car.title, brand: paid.car.brand, model: paid.car.model, mainImage: paid.car.mainImage },
						clientName,
						clientEmail,
						clientPhone,
						depositAmount:   paid.depositAmount,
						totalPrice:      paid.totalPrice,
						installmentType: paid.installmentType,
						status:          paid.status,
						reservedAt:      paid.reservedAt,
						expiresAt:       paid.expiresAt,
						paidAt:          paid.paidAt,
						notes:           paid.notes,
					})
				}, 'Webhook')

				// Facture d'acompte pour le paiement en ligne qui vient d'être confirmé.
				const invoice = await upsertInvoice({
					reservationId:  paid.id,
					reservationRef: paid.id.slice(-8).toUpperCase(),
					type:           'DEPOSIT',
					vehicle:        { title: paid.car.title, brand: paid.car.brand, model: paid.car.model, year: paid.car.year },
					client:         { name: clientName, email: clientEmail, phone: clientPhone },
					totalPrice:            paid.totalPrice,
					depositAmount:         paid.depositAmount,
					paymentMethodDeposit:  depositPaymentMethodLabel(true),
				})

				await Promise.all([
					sendPaymentReceivedToClient({
						clientName, clientEmail,
						carTitle:      paid.car.title,
						carBrand:      paid.car.brand,
						carModel:      paid.car.model,
						carYear:       paid.car.year,
						depositAmount: paid.depositAmount,
						totalPrice:    paid.totalPrice,
						reservationId: paid.id,
						expiresAt:     paid.expiresAt,
						invoiceUrl:    invoice?.url ?? null,
					}).then(() =>
						prisma.reservation.update({ where: { id: paid.id }, data: { emailSentToClient: true } })
					),
					sendReservationNotificationToAdmin({
						clientName, clientEmail,
						clientPhone:   paid.clientPhone,
						carTitle:      paid.car.title,
						depositAmount: paid.depositAmount,
						totalPrice:    paid.totalPrice,
						reservationId: paid.id,
						expiresAt:     paid.expiresAt,
					}).then(() =>
						prisma.reservation.update({ where: { id: paid.id }, data: { emailSentToAdmin: true } })
					),
				]).catch((mailErr) =>
					console.error('[Webhook] Email échoué (non-critique) :', mailErr)
				)

				console.log('[Webhook] checkout.session.completed traité avec succès')
				break
			}

			case 'checkout.session.expired':
			case 'payment_intent.payment_failed': {
				const obj       = event.data.object as any
				const sessionId = obj.id ?? obj.metadata?.sessionId
				await prisma.reservation.updateMany({
					where: { paymentSessionId: sessionId, status: 'PENDING' },
					data:  { status: 'CANCELLED' },
				})
				break
			}

			default:
				break
		}
	} catch (err) {
		console.error('[Webhook] Erreur critique dans le handler :', err)
		return NextResponse.json({ error: 'Handler error' }, { status: 500 })
	}

	return NextResponse.json({ received: true })
}
