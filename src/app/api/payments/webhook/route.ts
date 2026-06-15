// src/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { constructWebhookEvent } from '@/lib/stripe'
import prisma from '@/lib/db'
import { broadcastCarStatus, broadcastAdminNotification, EVENTS } from '@/lib/pusher'
import {
  sendReservationConfirmationToClient,
  sendReservationNotificationToAdmin,
} from '@/lib/mail'

// NOTE : "export const config = { api: { bodyParser: false } }" est la syntaxe
// Pages Router — inutile en App Router. On utilise req.text() directement.

export async function POST(req: NextRequest) {
  // ── 1. Vérification de la signature Stripe ───────────────────────────────
  let event
  try {
    const body      = await req.text()
    const signature = req.headers.get('stripe-signature')!
    event = await constructWebhookEvent(body, signature)
  } catch (err: any) {
    console.error('[Webhook] Signature invalide :', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ── 2. Traitement de l'événement ─────────────────────────────────────────
  try {
    switch (event.type) {

      // ── Paiement réussi ───────────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as any
        if (session.payment_status !== 'paid') break

        const {
          reservationId, // ← NOUVEAU : identifiant direct de la réservation
          carId,
          clientName,
          clientEmail,
          clientPhone,
          depositAmount,
        } = session.metadata as Record<string, string>

        console.log('[Webhook] checkout.session.completed →', { reservationId, carId })

        // ── Mise à jour atomique DB (transaction Prisma) ──────────────────
        await prisma.$transaction(async (tx) => {
          // Cherche la réservation par reservationId (prioritaire) ou paymentSessionId (fallback)
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
            // Voiture déjà vendue → annule la réservation
            await tx.reservation.update({
              where: { id: reservation.id },
              data:  { status: 'CANCELLED' },
            })
            return
          }

          // Marque la voiture RESERVED
          await tx.car.update({
            where: { id: carId },
            data:  { status: 'RESERVED' },
          })

          // Confirme la réservation
          await tx.reservation.update({
            where: { id: reservation.id },
            data: {
              paymentIntentId:  session.payment_intent,
              paymentSessionId: session.id, // sécurité : s'assure que c'est bien lié
              status:           'CONFIRMED',
              reservedAt:       new Date(),
            },
          })

          console.log('[Webhook] ✅ DB mise à jour : voiture RESERVED, réservation CONFIRMED')
        })

        // ── Récupère la réservation confirmée pour les emails ─────────────
        const confirmed = await prisma.reservation.findFirst({
          where:   { paymentSessionId: session.id, status: 'CONFIRMED' },
          include: { car: true },
        })
        if (!confirmed) {
          console.log('[Webhook] Réservation confirmée introuvable après transaction')
          break
        }

        // ── Broadcast Pusher (NON-CRITIQUE : une erreur ne bloque pas le 200) ──
        // Si Pusher est indisponible, on log l'erreur sans faire planter le webhook.
        // Stripe ne retentera pas inutilement et la DB est déjà mise à jour.
        try {
          await broadcastCarStatus(carId, 'RESERVED', confirmed.car.title)
          await broadcastAdminNotification(EVENTS.newReservation, {
            reservationId: confirmed.id,
            carTitle:      confirmed.car.title,
            clientName,
            depositAmount: Number(depositAmount),
          })
          console.log('[Webhook] ✅ Pusher broadcast OK')
        } catch (pusherErr) {
          // Pusher a échoué (app expirée, timeout, mauvaises credentials)
          // → on logge l'erreur mais on continue (le webhook doit répondre 200)
          console.error('[Webhook] ⚠️ Pusher broadcast échoué (non-critique) :', pusherErr)
        }

        // ── Emails (NON-CRITIQUE) ─────────────────────────────────────────
        await Promise.all([
          sendReservationConfirmationToClient({
            clientName,
            clientEmail,
            carTitle:      confirmed.car.title,
            carBrand:      confirmed.car.brand,
            carModel:      confirmed.car.model,
            carYear:       confirmed.car.year,
            depositAmount: confirmed.depositAmount,
            totalPrice:    confirmed.totalPrice,
            reservationId: confirmed.id,
            expiresAt:     confirmed.expiresAt,
          }).then(() =>
            prisma.reservation.update({
              where: { id: confirmed.id },
              data:  { emailSentToClient: true },
            })
          ),
          sendReservationNotificationToAdmin({
            clientName,
            clientEmail,
            clientPhone:   confirmed.clientPhone,
            carTitle:      confirmed.car.title,
            depositAmount: confirmed.depositAmount,
            totalPrice:    confirmed.totalPrice,
            reservationId: confirmed.id,
            expiresAt:     confirmed.expiresAt,
          }).then(() =>
            prisma.reservation.update({
              where: { id: confirmed.id },
              data:  { emailSentToAdmin: true },
            })
          ),
        ]).catch((mailErr) =>
          console.error('[Webhook] ⚠️ Email échoué (non-critique) :', mailErr)
        )

        console.log('[Webhook] ✅ checkout.session.completed traité avec succès')
        break
      }

      // ── Paiement expiré ou échoué ─────────────────────────────────────────
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
    // Cette erreur est maintenant réservée aux vraies erreurs DB (Prisma)
    console.error('[Webhook] ❌ Erreur critique dans le handler :', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}