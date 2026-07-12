// src/lib/stripe.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2025-02-24.acacia',
	typescript: true,
})

export async function createCheckoutSession({
	carId,
	carTitle,
	price,
	depositAmount,
	clientName,
	clientEmail,
	clientPhone,
	installmentType,
	reservationId,
	successUrl,
	cancelUrl,
}: {
	carId:           string
	carTitle:        string
	price:           number
	depositAmount:   number
	clientName:      string
	clientEmail:     string
	clientPhone:     string
	installmentType: 'FULL' | 'THREE_TIMES' | 'FOUR_TIMES'
	reservationId:   string
	successUrl:      string
	cancelUrl:       string
}) {
	const session = await stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		mode: 'payment',
		customer_email: clientEmail,
		line_items: [
			{
				price_data: {
					currency: 'eur',
					product_data: {
						name: `Acompte - ${carTitle}`,
						description: `Acompte de réservation (30%) — Solde dû sous 5 jours en agence`,
						metadata: { carId },
					},
					unit_amount: Math.round(depositAmount * 100),
				},
				quantity: 1,
			},
		],
		metadata: {
			reservationId,
			carId,
			clientName,
			clientEmail,
			clientPhone,
			installmentType,
			depositAmount: depositAmount.toString(),
			totalPrice: price.toString(),
		},
		success_url: successUrl,
		cancel_url: cancelUrl,
		expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 min
	})
	return session
}

export async function constructWebhookEvent(
	body: string | Buffer,
	signature: string
): Promise<Stripe.Event> {
	return stripe.webhooks.constructEvent(
		body,
		signature,
		process.env.STRIPE_WEBHOOK_SECRET!
	)
}
