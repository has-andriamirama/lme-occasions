// src/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/stripe'
import prisma from '@/lib/db'
import { broadcastCarUpdate, broadcastAdminNotification, EVENTS } from '@/lib/pusher'
import {
	sendPaymentReceivedToClient,
	sendReservationNotificationToAdmin,
} from '@/lib/mail'

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

				const {
					reservationId,
					carId,
					clientName,
					clientEmail,
					clientPhone,
					depositAmount,
				} = session.metadata as Record<string, string>

				console.log('[Webhook] checkout.session.completed →', { reservationId, carId })

				await prisma.$transaction(async (tx) => {
					const reservation = reservationId
						? await tx.reservation.findFirst({
								where: { id: reservationId, status: 'PENDING' },
							})
						: await tx.reservation.findFirst({
								where: { paymentSessionId: session.id, status: 'PENDING' },
							})

					if (!reservation) {
						console.log('[Webhook] Réservation introuvable ou déjà traitée')
						return
					}

					const car = await tx.car.findUnique({ where: { id: carId } })
					if (!car) {
						console.log('[Webhook] Voiture introuvable :', carId)
						return
					}

					if (car.status !== 'AVAILABLE' && car.status !== 'RESERVED') {
						await tx.reservation.update({
							where: { id: reservation.id },
							data:  { status: 'CANCELLED' },
						})
						return
					}

					await tx.car.update({
						where: { id: carId },
						data:  { status: 'RESERVED' },
					})

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

					console.log('[Webhook] DB mise à jour : voiture RESERVED, réservation PAID (en attente de confirmation agence)')
				})

				const paid = await prisma.reservation.findFirst({
					where:   { paymentSessionId: session.id, status: 'PAID' },
					include: { car: true },
				})
				if (!paid) {
					console.log('[Webhook] Réservation payée introuvable après transaction')
					break
				}

				try {
					await broadcastCarUpdate({ id: carId, status: 'RESERVED', title: paid.car.title })
					await broadcastAdminNotification(EVENTS.newReservation, {
						reservationId: paid.id,
						carTitle:      paid.car.title,
						clientName,
						depositAmount: Number(depositAmount),
					})
					console.log('[Webhook] Pusher broadcast OK')
				} catch (pusherErr) {
					console.error('[Webhook] Pusher broadcast échoué (non-critique) :', pusherErr)
				}

				await Promise.all([
					sendPaymentReceivedToClient({
						clientName,
						clientEmail,
						carTitle:      paid.car.title,
						carBrand:      paid.car.brand,
						carModel:      paid.car.model,
						carYear:       paid.car.year,
						depositAmount: paid.depositAmount,
						totalPrice:    paid.totalPrice,
						reservationId: paid.id,
						expiresAt:     paid.expiresAt,
					}).then(() =>
						prisma.reservation.update({
							where: { id: paid.id },
							data:  { emailSentToClient: true },
						})
					),
					sendReservationNotificationToAdmin({
						clientName,
						clientEmail,
						clientPhone:   paid.clientPhone,
						carTitle:      paid.car.title,
						depositAmount: paid.depositAmount,
						totalPrice:    paid.totalPrice,
						reservationId: paid.id,
						expiresAt:     paid.expiresAt,
					}).then(() =>
						prisma.reservation.update({
							where: { id: paid.id },
							data:  { emailSentToAdmin: true },
						})
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
