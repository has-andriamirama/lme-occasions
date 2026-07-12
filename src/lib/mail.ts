// src/lib/mail.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_for_build')

const FROM     = process.env.EMAIL_FROM          ?? 'LME Occasions <onboarding@resend.dev>'
const ADMIN_TO = process.env.ADMIN_EMAIL         ?? 'hasandriamirama@hotmail.com'
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function wrap(content: string): string {
	return `<!DOCTYPE html>
		<html lang="fr">
		<head>
			<meta charset="UTF-8"/>
			<meta name="viewport" content="width=device-width,initial-scale=1"/>
			<style>
				* { margin:0; padding:0; box-sizing:border-box; }
				body { background:#0A0A0B; font-family:'Segoe UI',sans-serif; color:#E4E4E6; }
				h2 { font-size:22px; color:#fff; margin-bottom:16px; }
				p  { line-height:1.7; color:#9C9CA3; margin-bottom:12px; font-size:14px; }
			</style>
		</head>
		<body style="background-color: #0A0A0B; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #E4E4E6;">
			<table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#0A0A0B" style="background-color: #0A0A0B; font-family: 'Segoe UI', Arial, sans-serif; color: #E4E4E6; margin: 0; padding: 0; width: 100%;">
				<tr>
					<td align="center" style="padding: 40px 20px;">
						<table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; border-collapse: collapse; margin: 0 auto;">
							<!-- Header -->
							<tr>
								<td align="center" bgcolor="#141418" style="background: linear-gradient(135deg,#141418 0%,#1E1E26 100%); border: 1px solid rgba(212,175,55,0.3); border-bottom: none; border-radius: 12px 12px 0 0; padding: 32px; text-align: center;">
									<div style="font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #D4AF37; background: linear-gradient(135deg,#D4AF37,#F0CA47); -webkit-background-clip: text; text-align: center;">LME OCCASIONS</div>
									<div style="color: #9C9CA3; font-size: 13px; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase; text-align: center;">Premium Automobile</div>
								</td>
							</tr>
							<!-- Body -->
							<tr>
								<td bgcolor="#141418" style="background-color: #141418; border: 1px solid rgba(255,255,255,0.06); border-top: none; border-bottom: none; padding: 32px; color: #9C9CA3; font-size: 14px; line-height: 1.7; text-align: left;">
									${content}
								</td>
							</tr>
							<!-- Footer -->
							<tr>
								<td align="center" bgcolor="#0A0A0B" style="background-color: #0A0A0B; border: 1px solid rgba(255,255,255,0.04); border-top: none; border-radius: 0 0 12px 12px; padding: 24px; text-align: center;">
									<p style="margin: 0; line-height: 1.7; color: #555560; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} LME Occasions. Tous droits réservés.</p>
									<p style="margin: 6px 0 0; line-height: 1.7; color: #555560; font-size: 12px; text-align: center;">
										<a href="${APP_URL}/cgv" style="color: #D4AF37; text-decoration: none;">CGV</a> &nbsp;·&nbsp;
										<a href="${APP_URL}/confidentialite" style="color: #D4AF37; text-decoration: none;">Confidentialité</a> &nbsp;·&nbsp;
										<a href="${APP_URL}/contact" style="color: #D4AF37; text-decoration: none;">Contact</a>
									</p>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
		</body>
		</html>`
}

async function sendEmail(params: {
	to: string | string[]
	subject: string
	html: string
	replyTo?: string
}) {
	const { data, error } = await resend.emails.send({
		from:    FROM,
		to:      Array.isArray(params.to) ? params.to : [params.to],
		subject: params.subject,
		html:    params.html,
		replyTo: params.replyTo,
	})

	if (error) {
		throw new Error(`Resend error: ${error.message}`)
	}

	return data
}

export async function sendPaymentReceivedToClient(data: {
	clientName: string
	clientEmail: string
	carTitle: string
	carBrand: string
	carModel: string
	carYear: number
	depositAmount: number
	totalPrice: number
	reservationId: string
	expiresAt: Date
	invoiceUrl?: string | null
}) {
	const expiryStr = data.expiresAt.toLocaleDateString('fr-FR', {
		weekday:'long', day:'2-digit', month:'long', year:'numeric'
	})

	const html = wrap(`
		<h2 style="font-size: 22px; color: #fff; margin-bottom: 16px;">Votre paiement a bien été reçu !</h2>
		<p style="line-height: 1.7; color: #9C9CA3; margin-bottom: 12px; font-size: 14px;">Bonjour <strong>${data.clientName}</strong>, votre acompte a bien été encaissé.
		Voici le récapitulatif de votre réservation :</p>

		<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1E1E26; border: 1px solid rgba(212,175,55,0.2); border-radius: 8px; padding: 20px; margin: 20px 0; width: 100%; border-collapse: collapse;">
			<tr>
				<td style="padding-bottom: 12px; text-align: left;">
					<div style="font-size: 14px; font-weight: 700; color: #fff;">${data.carTitle}</div>
				</td>
			</tr>
			<tr>
				<td>
					<table border="0" cellpadding="0" cellspacing="0" width="100%">
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Référence réservation</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">#${data.reservationId.slice(-8).toUpperCase()}</td>
						</tr>
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Véhicule</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">${data.carBrand} ${data.carModel} ${data.carYear}</td>
						</tr>
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Prix total du véhicule</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 22px; color: #D4AF37; font-weight: 700; text-align: right;">${data.totalPrice.toLocaleString('fr-FR')} €</td>
						</tr>
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Acompte versé (30%)</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #10B981; font-weight: 700; text-align: right;">${data.depositAmount.toLocaleString('fr-FR')} €</td>
						</tr>
						<tr>
							<td style="padding: 6px; font-size: 14px; color: #9C9CA3; text-align: left;">Solde restant</td>
							<td align="right" style="padding: 6px; font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">${(data.totalPrice - data.depositAmount).toLocaleString('fr-FR')} €</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>

		${data.invoiceUrl ? `
		<table border="0" cellpadding="0" cellspacing="0" style="margin: 16px 8px 16px 0; display: inline-block;">
			<tr>
				<td align="center" style="border: 1.5px solid rgba(212,175,55,0.5); border-radius: 8px;">
					<a href="${data.invoiceUrl}" style="display: inline-block; color: #D4AF37; font-family: sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 12.5px 26px; border-radius: 8px;">📄 Télécharger la facture d'acompte (PDF)</a>
				</td>
			</tr>
		</table>` : ''}

		<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.3); border-radius: 8px; margin: 20px 0; width: 100%;">
			<tr>
				<td style="padding: 16px; color: #D4AF37; font-size: 14px; line-height: 1.7; text-align: left;">
					<strong>Important :</strong> Votre réservation n'est pas encore définitive.
					Vous avez jusqu'au <strong>${expiryStr}</strong> pour vous présenter en agence
					afin qu'un membre de notre équipe confirme votre réservation et organise le règlement du solde.
				</td>
			</tr>
		</table>

		<h2 style="font-size: 22px; color: #fff; margin-bottom: 16px;">Prochaines étapes</h2>
		<p style="line-height: 1.7; color: #9C9CA3; margin-bottom: 12px; font-size: 14px;">1. Présentez-vous à notre agence avec une pièce d'identité valide.</p>
		<p style="line-height: 1.7; color: #9C9CA3; margin-bottom: 12px; font-size: 14px;">2. Notre équipe confirme votre réservation sur place.</p>
		<p style="line-height: 1.7; color: #9C9CA3; margin-bottom: 12px; font-size: 14px;">3. Réglez le solde de <strong>${(data.totalPrice - data.depositAmount).toLocaleString('fr-FR')} €</strong> (comptant ou en plusieurs fois selon votre choix), signez le contrat de vente et repartez avec votre véhicule !</p>

		<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; margin: 20px 0; width: 100%;">
			<tr>
				<td style="padding: 16px; color: #F87171; font-size: 14px; line-height: 1.7; text-align: left;">
					<strong>Délai de 5 jours :</strong> En cas de non-présentation avant le ${expiryStr},
					la réservation expirera automatiquement et l'acompte versé ne sera pas remboursé.
					Pour toute question, contactez-nous immédiatement.
				</td>
			</tr>
		</table>

		<table border="0" cellpadding="0" cellspacing="0" style="margin: 16px 8px 16px 0; display: inline-block;">
			<tr>
				<td align="center" bgcolor="#D4AF37" style="background: linear-gradient(135deg, #D4AF37 0%, #B8962B 100%); border-radius: 8px;">
					<a href="${APP_URL}/contact" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8962B 100%); color: #0A0A0B; font-family: sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; border: 1px solid #D4AF37;">Nous contacter</a>
				</td>
			</tr>
		</table>
	`)

	return sendEmail({
		to:      data.clientEmail,
		subject: `Paiement reçu — finalisez votre réservation en agence — ${data.carTitle}`,
		html,
	})
}

export async function sendReservationConfirmedToClient(data: {
	clientName: string
	clientEmail: string
	carTitle: string
	carBrand: string
	carModel: string
	carYear: number
	depositAmount: number
	totalPrice: number
	reservationId: string
	installmentType?: 'FULL' | 'THREE_TIMES' | 'FOUR_TIMES' | null
	invoiceUrl?: string | null
}) {
	const balance = Math.max(0, data.totalPrice - data.depositAmount)
	const isPaidInFull = balance <= 0

	const installmentLabel: Record<string, string> = {
		FULL:        `le règlement comptant du solde restant (${balance.toLocaleString('fr-FR')} €)`,
		THREE_TIMES: `le règlement du solde en 3 fois (soit environ ${(balance / 3).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} € par échéance)`,
		FOUR_TIMES:  `le règlement du solde en 4 fois (soit environ ${(balance / 4).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} € par échéance)`,
	}
	const nextStep = installmentLabel[data.installmentType ?? 'FULL']
	const invoiceButtonLabel = isPaidInFull ? '📄 Télécharger la facture (PDF)' : "📄 Télécharger la facture d'acompte (PDF)"

	const html = wrap(`
		<h2 style="font-size: 22px; color: #fff; margin-bottom: 16px;">Votre réservation est confirmée !</h2>
		<p style="line-height: 1.7; color: #9C9CA3; margin-bottom: 12px; font-size: 14px;">Bonjour <strong>${data.clientName}</strong>, votre réservation a été confirmée par notre équipe.
		Voici le récapitulatif :</p>

		<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1E1E26; border: 1px solid rgba(212,175,55,0.2); border-radius: 8px; padding: 20px; margin: 20px 0; width: 100%; border-collapse: collapse;">
			<tr>
				<td style="padding-bottom: 12px; text-align: left;">
					<div style="font-size: 14px; font-weight: 700; color: #fff;">${data.carTitle}</div>
				</td>
			</tr>
			<tr>
				<td>
					<table border="0" cellpadding="0" cellspacing="0" width="100%">
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Référence réservation</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">#${data.reservationId.slice(-8).toUpperCase()}</td>
						</tr>
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Véhicule</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">${data.carBrand} ${data.carModel} ${data.carYear}</td>
						</tr>
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Prix total du véhicule</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 22px; color: #D4AF37; font-weight: 700; text-align: right;">${data.totalPrice.toLocaleString('fr-FR')} €</td>
						</tr>
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Acompte versé</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #10B981; font-weight: 700; text-align: right;">${data.depositAmount.toLocaleString('fr-FR')} €</td>
						</tr>
						<tr>
							<td style="padding: 6px; font-size: 14px; color: #9C9CA3; text-align: left;">Solde restant</td>
							<td align="right" style="padding: 6px; font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">${balance.toLocaleString('fr-FR')} €</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>

		${data.invoiceUrl ? `
		<table border="0" cellpadding="0" cellspacing="0" style="margin: 16px 8px 16px 0; display: inline-block;">
			<tr>
				<td align="center" style="border: 1.5px solid rgba(212,175,55,0.5); border-radius: 8px;">
					<a href="${data.invoiceUrl}" style="display: inline-block; color: #D4AF37; font-family: sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 12.5px 26px; border-radius: 8px;">${invoiceButtonLabel}</a>
				</td>
			</tr>
		</table>` : ''}

		${isPaidInFull ? `
		<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.3); border-radius: 8px; margin: 20px 0; width: 100%;">
			<tr>
				<td style="padding: 16px; color: #D4AF37; font-size: 14px; line-height: 1.7; text-align: left;">
					<strong>Véhicule réglé intégralement !</strong> Votre acompte couvre la totalité du prix de vente.
					Notre équipe vous contactera pour organiser la remise des clés et les démarches administratives.
				</td>
			</tr>
		</table>
		` : `
		<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.3); border-radius: 8px; margin: 20px 0; width: 100%;">
			<tr>
				<td style="padding: 16px; color: #D4AF37; font-size: 14px; line-height: 1.7; text-align: left;">
					<strong>Prochaine étape :</strong> ${nextStep}.
					Notre équipe reste à votre disposition en agence pour organiser ce règlement.
				</td>
			</tr>
		</table>
		`}

		<table border="0" cellpadding="0" cellspacing="0" style="margin: 16px 8px 16px 0; display: inline-block;">
			<tr>
				<td align="center" bgcolor="#D4AF37" style="background: linear-gradient(135deg, #D4AF37 0%, #B8962B 100%); border-radius: 8px;">
					<a href="${APP_URL}/contact" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8962B 100%); color: #0A0A0B; font-family: sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; border: 1px solid #D4AF37;">Nous contacter</a>
				</td>
			</tr>
		</table>
	`)

	return sendEmail({
		to:      data.clientEmail,
		subject: `Réservation confirmée — ${data.carTitle}`,
		html,
	})
}

export async function sendReservationNotificationToAdmin(data: {
	clientName: string
	clientEmail: string
	clientPhone: string
	carTitle: string
	depositAmount: number
	totalPrice: number
	reservationId: string
	expiresAt: Date
}) {
	const html = wrap(`
		<h2 style="font-size: 22px; color: #fff; margin-bottom: 16px;">Nouvelle réservation reçue !</h2>
		<p style="line-height: 1.7; color: #9C9CA3; margin-bottom: 12px; font-size: 14px;">Une nouvelle réservation a été effectuée sur le site LME Occasions.</p>

		<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1E1E26; border: 1px solid rgba(212,175,55,0.2); border-radius: 8px; padding: 20px; margin: 20px 0; width: 100%; border-collapse: collapse;">
			<tr>
				<td style="padding-bottom: 12px; text-align: left;">
					<div style="font-size: 14px; font-weight: 700; color: #fff;">Réservation #${data.reservationId.slice(-8).toUpperCase()}</div>
				</td>
			</tr>
			<tr>
				<td>
					<table border="0" cellpadding="0" cellspacing="0" width="100%">
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Client</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">${data.clientName}</td>
						</tr>
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Email</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">${data.clientEmail}</td>
						</tr>
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Téléphone</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">${data.clientPhone}</td>
						</tr>
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Véhicule</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">${data.carTitle}</td>
						</tr>
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Acompte reçu</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 22px; color: #D4AF37; font-weight: 700; text-align: right;">${data.depositAmount.toLocaleString('fr-FR')} €</td>
						</tr>
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Prix total</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">${data.totalPrice.toLocaleString('fr-FR')} €</td>
						</tr>
						<tr>
							<td style="padding: 6px; font-size: 14px; color: #9C9CA3; text-align: left;">Expire le</td>
							<td align="right" style="padding: 6px; font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">${data.expiresAt.toLocaleDateString('fr-FR')}</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>

		<table border="0" cellpadding="0" cellspacing="0" style="margin: 16px 8px 16px 0; display: inline-block;">
			<tr>
				<td align="center" bgcolor="#D4AF37" style="background: linear-gradient(135deg, #D4AF37 0%, #B8962B 100%); border-radius: 8px;">
					<a href="${APP_URL}/admin/reservations" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8962B 100%); color: #0A0A0B; font-family: sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; border: 1px solid #D4AF37;">Voir dans l'admin</a>
				</td>
			</tr>
		</table>
	`)

	return sendEmail({
		to:      ADMIN_TO,
		subject: `Nouvelle réservation — ${data.carTitle} — ${data.clientName}`,
		html,
	})
}

export async function sendReservationExpiredToClient(data: {
	clientName: string
	clientEmail: string
	carTitle: string
	depositAmount: number
}) {
	const html = wrap(`
		<h2 style="font-size: 22px; color: #fff; margin-bottom: 16px;">Réservation expirée</h2>
		<p style="line-height: 1.7; color: #9C9CA3; margin-bottom: 12px; font-size: 14px;">Bonjour <strong>${data.clientName}</strong>,</p>
		<p style="line-height: 1.7; color: #9C9CA3; margin-bottom: 12px; font-size: 14px;">Nous vous informons que votre réservation pour le véhicule
		<strong>${data.carTitle}</strong> a expiré, le délai de 5 jours ayant été dépassé.</p>

		<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px; margin: 20px 0; width: 100%;">
			<tr>
				<td style="padding: 16px; color: #F87171; font-size: 14px; line-height: 1.7; text-align: left;">
					Le véhicule est de nouveau disponible à la vente.<br/>
					L'acompte de <strong>${data.depositAmount.toLocaleString('fr-FR')} €</strong> versé
					ne peut pas être remboursé conformément à nos conditions générales de vente.
				</td>
			</tr>
		</table>

		<p style="line-height: 1.7; color: #9C9CA3; margin-bottom: 12px; font-size: 14px;">Si vous pensez qu'il s'agit d'une erreur ou souhaitez contester cette décision,
		contactez-nous dans les plus brefs délais.</p>

		<table border="0" cellpadding="0" cellspacing="0" style="margin: 16px 8px 16px 0; display: inline-block;">
			<tr>
				<td align="center" bgcolor="#D4AF37" style="background: linear-gradient(135deg, #D4AF37 0%, #B8962B 100%); border-radius: 8px;">
					<a href="${APP_URL}/contact" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8962B 100%); color: #0A0A0B; font-family: sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; border: 1px solid #D4AF37;">Contacter l'agence</a>
				</td>
			</tr>
		</table>
	`)

	return sendEmail({
		to:      data.clientEmail,
		subject: `Réservation expirée — ${data.carTitle}`,
		html,
	})
}

export async function sendReservationExpiredToAdmin(data: {
	clientName: string
	clientEmail: string
	carTitle: string
	reservationId: string
}) {
	const html = wrap(`
		<h2 style="font-size: 22px; color: #fff; margin-bottom: 16px;">Réservation expirée automatiquement</h2>
		<p style="line-height: 1.7; color: #9C9CA3; margin-bottom: 12px; font-size: 14px;">La réservation suivante a expiré après 5 jours sans finalisation :</p>

		<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1E1E26; border: 1px solid rgba(212,175,55,0.2); border-radius: 8px; padding: 20px; margin: 20px 0; width: 100%; border-collapse: collapse;">
			<tr>
				<td>
					<table border="0" cellpadding="0" cellspacing="0" width="100%">
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Réservation</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">#${data.reservationId.slice(-8).toUpperCase()}</td>
						</tr>
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Client</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">${data.clientName} (${data.clientEmail})</td>
						</tr>
						<tr>
							<td style="padding: 6px; font-size: 14px; color: #9C9CA3; text-align: left;">Véhicule</td>
							<td align="right" style="padding: 6px; font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">${data.carTitle}</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
		<p style="line-height: 1.7; color: #9C9CA3; margin-bottom: 12px; font-size: 14px;">Le véhicule est automatiquement repassé en statut <strong>Disponible</strong>.</p>
		
		<table border="0" cellpadding="0" cellspacing="0" style="margin: 16px 8px 16px 0; display: inline-block;">
			<tr>
				<td align="center" bgcolor="#D4AF37" style="background: linear-gradient(135deg, #D4AF37 0%, #B8962B 100%); border-radius: 8px;">
					<a href="${APP_URL}/admin/reservations" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8962B 100%); color: #0A0A0B; font-family: sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; border: 1px solid #D4AF37;">Voir les réservations</a>
				</td>
			</tr>
		</table>
	`)

	return sendEmail({
		to:      ADMIN_TO,
		subject: `Réservation expirée — ${data.carTitle}`,
		html,
	})
}

export async function sendContactEmail(data: {
	name: string
	email: string
	phone?: string
	subject?: string
	message: string
}) {
	const html = wrap(`
		<h2 style="font-size: 22px; color: #fff; margin-bottom: 16px;">Nouveau message de contact</h2>
		
		<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1E1E26; border: 1px solid rgba(212,175,55,0.2); border-radius: 8px; padding: 20px; margin: 20px 0; width: 100%; border-collapse: collapse;">
			<tr>
				<td>
					<table border="0" cellpadding="0" cellspacing="0" width="100%">
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Nom</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">${data.name}</td>
						</tr>
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Email</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">${data.email}</td>
						</tr>
						${data.phone ? `
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Téléphone</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">${data.phone}</td>
						</tr>` : ''}
						${data.subject ? `
						<tr>
							<td style="padding: 6px; font-size: 14px; color: #9C9CA3; text-align: left;">Sujet</td>
							<td align="right" style="padding: 6px; font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">${data.subject}</td>
						</tr>` : ''}
					</table>
				</td>
			</tr>
		</table>
		
		<p style="line-height: 1.7; color: #9C9CA3; margin-bottom: 12px; font-size: 14px;"><strong>Message :</strong></p>
		
		<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1E1E26; border-radius: 8px; margin-top: 8px; width: 100%;">
			<tr>
				<td style="padding: 16px; color: #E4E4E6; font-size: 14px; line-height: 1.7; text-align: left;">
					${data.message.replace(/\n/g, '<br/>')}
				</td>
			</tr>
		</table>
		
		<table border="0" cellpadding="0" cellspacing="0" style="margin: 20px 8px 16px 0; display: inline-block;">
			<tr>
				<td align="center" bgcolor="#D4AF37" style="background: linear-gradient(135deg, #D4AF37 0%, #B8962B 100%); border-radius: 8px;">
					<a href="mailto:${data.email}" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8962B 100%); color: #0A0A0B; font-family: sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; border: 1px solid #D4AF37;">Répondre</a>
				</td>
			</tr>
		</table>
	`)

	return sendEmail({
		to:      ADMIN_TO,
		replyTo: data.email,
		subject: `Contact — ${data.subject ?? data.name}`,
		html,
	})
}

export async function sendBalancePaidToClient(data: {
	clientName: string
	clientEmail: string
	carTitle: string
	carBrand: string
	carModel: string
	carYear: number
	depositAmount: number
	totalPrice: number
	reservationId: string
	invoiceUrl: string
}) {
	const html = wrap(`
		<h2 style="font-size: 22px; color: #fff; margin-bottom: 16px;">Votre règlement final a été enregistré !</h2>
		<p style="line-height: 1.7; color: #9C9CA3; margin-bottom: 12px; font-size: 14px;">Bonjour <strong>${data.clientName}</strong>,</p>
		<p style="line-height: 1.7; color: #9C9CA3; margin-bottom: 12px; font-size: 14px;">Nous vous informons que le règlement du solde de votre véhicule <strong>${data.carTitle}</strong> a bien été enregistré. Votre commande est désormais finalisée et entièrement réglée.</p>

		<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1E1E26; border: 1px solid rgba(212,175,55,0.2); border-radius: 8px; padding: 20px; margin: 20px 0; width: 100%; border-collapse: collapse;">
			<tr>
				<td style="padding-bottom: 12px; text-align: left;">
					<div style="font-size: 14px; font-weight: 700; color: #fff;">${data.carTitle}</div>
				</td>
			</tr>
			<tr>
				<td>
					<table border="0" cellpadding="0" cellspacing="0" width="100%">
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Référence réservation</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">#${data.reservationId.slice(-8).toUpperCase()}</td>
						</tr>
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Véhicule</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">${data.carBrand} ${data.carModel} ${data.carYear}</td>
						</tr>
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Prix total</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 22px; color: #D4AF37; font-weight: 700; text-align: right;">${data.totalPrice.toLocaleString('fr-FR')} €</td>
						</tr>
						<tr>
							<td style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #9C9CA3; text-align: left;">Acompte versé</td>
							<td align="right" style="padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #10B981; font-weight: 700; text-align: right;">${data.depositAmount.toLocaleString('fr-FR')} €</td>
						</tr>
						<tr>
							<td style="padding: 6px; font-size: 14px; color: #9C9CA3; text-align: left;">Solde restant</td>
							<td align="right" style="padding: 6px; font-size: 14px; color: #E4E4E6; font-weight: 500; text-align: right;">0 € (Entièrement réglé)</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>

		<p style="line-height: 1.7; color: #9C9CA3; margin-bottom: 12px; font-size: 14px;">Vous pouvez télécharger votre facture de totalité correspondante en cliquant sur le bouton ci-dessous :</p>
		
		<table border="0" cellpadding="0" cellspacing="0" style="margin: 16px 8px 16px 0; display: inline-block;">
			<tr>
				<td align="center" style="border: 1.5px solid rgba(212,175,55,0.5); border-radius: 8px;">
					<a href="${data.invoiceUrl}" style="display: inline-block; color: #D4AF37; font-family: sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 12.5px 26px; border-radius: 8px;">📄 Télécharger la facture de totalité (PDF)</a>
				</td>
			</tr>
		</table>

		<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.3); border-radius: 8px; margin: 20px 0; width: 100%;">
			<tr>
				<td style="padding: 16px; color: #D4AF37; font-size: 14px; line-height: 1.7; text-align: left;">
					<strong>Félicitations !</strong> Le règlement complet de votre véhicule a été validé. Nous restons à votre entière disposition pour planifier la livraison et la remise des documents d'immatriculation.
				</td>
			</tr>
		</table>

		<table border="0" cellpadding="0" cellspacing="0" style="margin: 16px 8px 16px 0; display: inline-block;">
			<tr>
				<td align="center" bgcolor="#D4AF37" style="background: linear-gradient(135deg, #D4AF37 0%, #B8962B 100%); border-radius: 8px;">
					<a href="${APP_URL}/contact" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8962B 100%); color: #0A0A0B; font-family: sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 14px 28px; border-radius: 8px; border: 1px solid #D4AF37;">Nous contacter</a>
				</td>
			</tr>
		</table>
	`)

	return sendEmail({
		to:      data.clientEmail,
		subject: `Règlement final reçu — Facture de totalité — ${data.carTitle}`,
		html,
	})
}
