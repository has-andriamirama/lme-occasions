// src/lib/mail.ts
import { Resend } from 'resend'
import { formatPriceExact } from '@/lib/utils'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM     = process.env.EMAIL_FROM          ?? 'LME Occasions <onboarding@resend.dev>'
const ADMIN_TO = process.env.ADMIN_EMAIL         ?? 'hasandriamirama@hotmail.com'
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function wrap(bodyHtml: string): string {
	const year = new Date().getFullYear()
	return `<!DOCTYPE html>
		<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width,initial-scale=1">
			<meta http-equiv="X-UA-Compatible" content="IE=edge">
			<meta name="color-scheme" content="dark light">
			<title>LME Occasions</title>
			<!--[if mso]>
			<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
			<![endif]-->
			<style>
				body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
				table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
				img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
				body { margin:0; padding:0; width:100% !important; background-color:#0A0A0B; }
			</style>
		</head>
		<body style="margin:0;padding:0;background-color:#0A0A0B;">
			<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0A0A0B;">
				<tr>
					<td align="center" style="padding:32px 16px;">
					<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
						<tr>
							<td style="background-color:#141418;border:1px solid #3A3220;border-radius:12px 12px 0 0;padding:32px;text-align:center;">
								<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:800;letter-spacing:2px;color:#D4AF37;">LME OCCASIONS</p>
								<p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;color:#9C9CA3;">PREMIUM AUTOMOBILE</p>
							</td>
						</tr>
						<tr>
							<td style="background-color:#141418;border-left:1px solid #26262E;border-right:1px solid #26262E;padding:32px;font-family:Arial,Helvetica,sans-serif;">
								${bodyHtml}
							</td>
						</tr>
						<tr>
							<td style="background-color:#0A0A0B;border:1px solid #1C1C22;border-radius:0 0 12px 12px;padding:24px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
								<p style="margin:0;color:#55555C;font-size:12px;">© ${year} LME Occasions. Tous droits réservés.</p>
								<p style="margin:8px 0 0;font-size:12px;">
									<a href="${APP_URL}/cgv" style="color:#D4AF37;text-decoration:none;">CGV</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${APP_URL}/confidentialite" style="color:#D4AF37;text-decoration:none;">Confidentialité</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${APP_URL}/contact" style="color:#D4AF37;text-decoration:none;">Contact</a>
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

function heading(text: string): string {
	return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:21px;font-weight:700;color:#ffffff;">${text}</p>`
}

function paragraph(html: string): string {
	return `<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#9C9CA3;">${html}</p>`
}

function infoRow(label: string, value: string, opts?: { strong?: boolean; color?: string }): string {
	const color  = opts?.color ?? '#E4E4E6'
	const weight = opts?.strong ? '700' : '500'
	return `<tr>
	<td style="padding:9px 0;border-bottom:1px solid #29292F;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#9C9CA3;" width="52%" valign="top">${label}</td>
	<td style="padding:9px 0;border-bottom:1px solid #29292F;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${color};font-weight:${weight};text-align:right;" valign="top">${value}</td>
</tr>`
}

function card(title: string, rowsHtml: string): string {
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1E1E26;border:1px solid #4A3F1E;border-radius:8px;margin:8px 0 20px;">
		<tr>
			<td style="padding:20px;">
				<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#ffffff;">${title}</p>
				<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
					${rowsHtml}
				</table>
			</td>
		</tr>
	</table>`
}

type AlertVariant = 'gold' | 'red' | 'green' | 'blue'

function alertBox(html: string, variant: AlertVariant = 'gold'): string {
	const palette: Record<AlertVariant, { bg: string; border: string; text: string }> = {
		gold:  { bg: '#2C2716', border: '#4A3F1E', text: '#D4AF37' },
		red:   { bg: '#2B1616', border: '#4A2323', text: '#F87171' },
		green: { bg: '#122922', border: '#1E4A3A', text: '#34D399' },
		blue:  { bg: '#12212B', border: '#1E3A4A', text: '#60A5FA' },
	}
	const c = palette[variant]
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${c.bg};border:1px solid ${c.border};border-radius:8px;margin:0 0 20px;">
		<tr>
			<td style="padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:13.5px;line-height:1.6;color:${c.text};">
				${html}
			</td>
		</tr>
	</table>`
}

function button(url: string, label: string): string {
	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;">
		<tr>
			<td style="background-color:#D4AF37;border-radius:8px;" align="center">
				<a href="${url}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#0A0A0B;text-decoration:none;border-radius:8px;">${label}</a>
			</td>
		</tr>
	</table>`
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
}) {
	const expiryStr = data.expiresAt.toLocaleDateString('fr-FR', {
		weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
	})
	const balance = Math.max(0, data.totalPrice - data.depositAmount)

	const html = wrap(`
		${heading('Votre paiement a bien été reçu !')}
		${paragraph(`Bonjour <strong style="color:#E4E4E6;">${data.clientName}</strong>, votre acompte a bien été encaissé. Voici le récapitulatif de votre réservation :`)}
		${card(data.carTitle, [
			infoRow('Référence réservation', `#${data.reservationId.slice(-8).toUpperCase()}`),
			infoRow('Véhicule', `${data.carBrand} ${data.carModel} ${data.carYear}`),
			infoRow('Prix total du véhicule', formatPriceExact(data.totalPrice), { strong: true, color: '#D4AF37' }),
			infoRow('Acompte versé (30%)', formatPriceExact(data.depositAmount), { strong: true, color: '#34D399' }),
			infoRow('Solde restant', formatPriceExact(balance)),
		].join(''))}
		${alertBox(`<strong>Important :</strong> Votre réservation n'est pas encore définitive. Vous avez jusqu'au <strong>${expiryStr}</strong> pour vous présenter en agence afin qu'un membre de notre équipe confirme votre réservation et organise le règlement du solde.`)}
		${heading('Prochaines étapes')}
		${paragraph('1. Présentez-vous à notre agence avec une pièce d\'identité valide.')}
		${paragraph('2. Notre équipe confirme votre réservation sur place.')}
		${paragraph(`3. Réglez le solde de <strong style="color:#E4E4E6;">${formatPriceExact(balance)}</strong> (comptant ou en plusieurs fois selon votre choix), signez le contrat de vente et repartez avec votre véhicule !`)}
		${alertBox(`<strong>Délai de 5 jours :</strong> En cas de non-présentation avant le ${expiryStr}, la réservation expirera automatiquement et l'acompte versé ne sera pas remboursé. Pour toute question, contactez-nous immédiatement.`, 'red')}
		${button(`${APP_URL}/contact`, 'Nous contacter')}
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
}) {
	const balance      = Math.max(0, data.totalPrice - data.depositAmount)
	const isPaidInFull = balance <= 0

	const installmentLabel: Record<string, string> = {
		FULL:        `le règlement comptant du solde restant (${formatPriceExact(balance)})`,
		THREE_TIMES: `le règlement du solde en 3 fois (soit environ ${formatPriceExact(balance / 3)} par échéance)`,
		FOUR_TIMES:  `le règlement du solde en 4 fois (soit environ ${formatPriceExact(balance / 4)} par échéance)`,
	}
	const nextStep = installmentLabel[data.installmentType ?? 'FULL']

	const html = wrap(`
		${heading('Votre réservation est confirmée !')}
		${paragraph(`Bonjour <strong style="color:#E4E4E6;">${data.clientName}</strong>, votre réservation a été confirmée par notre équipe. Voici le récapitulatif :`)}
		${card(data.carTitle, [
			infoRow('Référence réservation', `#${data.reservationId.slice(-8).toUpperCase()}`),
			infoRow('Véhicule', `${data.carBrand} ${data.carModel} ${data.carYear}`),
			infoRow('Prix total du véhicule', formatPriceExact(data.totalPrice), { strong: true, color: '#D4AF37' }),
			infoRow('Acompte versé', formatPriceExact(data.depositAmount), { strong: true, color: '#34D399' }),
			infoRow('Solde restant', formatPriceExact(balance)),
		].join(''))}
		${isPaidInFull
			? alertBox('<strong>Véhicule réglé intégralement !</strong> Votre acompte couvre la totalité du prix de vente. Notre équipe vous contactera pour organiser la remise des clés et les démarches administratives.', 'green')
			: alertBox(`<strong>Prochaine étape :</strong> ${nextStep}. Notre équipe reste à votre disposition en agence pour organiser ce règlement.`)}
		${button(`${APP_URL}/contact`, 'Nous contacter')}
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
		${heading('Nouvelle réservation reçue !')}
		${paragraph('Une nouvelle réservation a été effectuée sur le site LME Occasions.')}
		${card(`Réservation #${data.reservationId.slice(-8).toUpperCase()}`, [
			infoRow('Client', data.clientName),
			infoRow('Email', data.clientEmail),
			infoRow('Téléphone', data.clientPhone),
			infoRow('Véhicule', data.carTitle),
			infoRow('Acompte reçu', formatPriceExact(data.depositAmount), { strong: true, color: '#D4AF37' }),
			infoRow('Prix total', formatPriceExact(data.totalPrice)),
			infoRow('Expire le', data.expiresAt.toLocaleDateString('fr-FR')),
		].join(''))}
		${button(`${APP_URL}/admin/reservations`, "Voir dans l'admin")}
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
		${heading('Réservation expirée')}
		${paragraph(`Bonjour <strong style="color:#E4E4E6;">${data.clientName}</strong>,`)}
		${paragraph(`Nous vous informons que votre réservation pour le véhicule <strong style="color:#E4E4E6;">${data.carTitle}</strong> a expiré, le délai de 5 jours ayant été dépassé.`)}
		${alertBox(`Le véhicule est de nouveau disponible à la vente.<br/>L'acompte de <strong>${formatPriceExact(data.depositAmount)}</strong> versé ne peut pas être remboursé conformément à nos conditions générales de vente.`, 'red')}
		${paragraph("Si vous pensez qu'il s'agit d'une erreur ou souhaitez contester cette décision, contactez-nous dans les plus brefs délais.")}
		${button(`${APP_URL}/contact`, "Contacter l'agence")}
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
		${heading('Réservation expirée automatiquement')}
		${paragraph('La réservation suivante a expiré après 5 jours sans finalisation :')}
		${card('Détail', [
			infoRow('Réservation', `#${data.reservationId.slice(-8).toUpperCase()}`),
			infoRow('Client', `${data.clientName} (${data.clientEmail})`),
			infoRow('Véhicule', data.carTitle),
		].join(''))}
		${paragraph('Le véhicule est automatiquement repassé en statut <strong style="color:#E4E4E6;">Disponible</strong>.')}
		${button(`${APP_URL}/admin/reservations`, 'Voir les réservations')}
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
	const rows = [infoRow('Nom', data.name), infoRow('Email', data.email)]
	if (data.phone)   rows.push(infoRow('Téléphone', data.phone))
	if (data.subject) rows.push(infoRow('Sujet', data.subject))

	const html = wrap(`
		${heading('Nouveau message de contact')}
		${card('Expéditeur', rows.join(''))}
		${paragraph('<strong style="color:#E4E4E6;">Message :</strong>')}
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1E1E26;border-radius:8px;margin:8px 0 20px;">
			<tr><td style="padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#E4E4E6;line-height:1.6;">${data.message.replace(/\n/g, '<br/>')}</td></tr>
		</table>
		${button(`mailto:${data.email}`, 'Répondre')}
	`)

	return sendEmail({
		to:      ADMIN_TO,
		replyTo: data.email,
		subject: `Contact — ${data.subject ?? data.name}`,
		html,
	})
}

interface PaymentConfirmationData {
	clientName:     string
	clientEmail:    string
	clientPhone:    string
	carTitle:       string
	carBrand:       string
	carModel:       string
	carYear:        number
	reservationId:  string
	paymentLabel:   string
	amount:         number
	totalPaid:      number
	totalPrice:     number
	
	invoiceUrl:     string | null
	isModification: boolean
	isReset:        boolean
}

function paymentEmailSubject(data: PaymentConfirmationData): string {
	if (data.isReset)        return `Paiement annulé — ${data.paymentLabel} — ${data.carTitle}`
	if (data.isModification) return `Paiement corrigé — ${data.paymentLabel} — ${data.carTitle}`
	return `Paiement reçu — ${data.paymentLabel} — ${data.carTitle}`
}

function paymentEmailBody(data: PaymentConfirmationData, forAdmin: boolean): string {
	const remaining   = Math.max(0, data.totalPrice - data.totalPaid)
	const isFullyPaid = data.totalPaid >= data.totalPrice

	const title = data.isReset ? 'Paiement annulé' : data.isModification ? 'Paiement corrigé' : 'Paiement confirmé'

	const intro = forAdmin
		? (data.isReset
			? `Le paiement suivant a été remis à « impayée » pour la réservation de <strong style="color:#E4E4E6;">${data.clientName}</strong>.`
			: data.isModification
				? `Le montant d'un paiement a été corrigé pour la réservation de <strong style="color:#E4E4E6;">${data.clientName}</strong>.`
				: `Un nouveau paiement a été enregistré pour la réservation de <strong style="color:#E4E4E6;">${data.clientName}</strong>.`)
		: (data.isReset
			? "Nous vous informons que l'enregistrement du paiement suivant a été annulé par notre équipe. Ce montant reste donc à régler."
			: data.isModification
				? `Bonjour <strong style="color:#E4E4E6;">${data.clientName}</strong>, le montant d'un de vos paiements a été corrigé par notre équipe. Voici le détail mis à jour :`
				: `Bonjour <strong style="color:#E4E4E6;">${data.clientName}</strong>, nous confirmons la bonne réception de votre paiement.`)

	const rows = [
		infoRow('Véhicule', data.carTitle),
		infoRow('Référence réservation', `#${data.reservationId.slice(-8).toUpperCase()}`),
		infoRow('Paiement concerné', data.paymentLabel),
		infoRow(
			data.isReset ? 'Montant annulé' : 'Montant réglé',
			formatPriceExact(data.amount),
			{ strong: true, color: data.isReset ? '#F87171' : '#34D399' },
		),
	]
	if (forAdmin) {
		rows.push(infoRow('Client', `${data.clientName} (${data.clientEmail})`))
		if (data.clientPhone) rows.push(infoRow('Téléphone', data.clientPhone))
	}
	rows.push(infoRow('Total encaissé à ce jour', formatPriceExact(data.totalPaid)))
	rows.push(infoRow(
		isFullyPaid ? 'Solde' : 'Reste à payer',
		isFullyPaid ? 'Intégralement réglé' : formatPriceExact(remaining),
		{ strong: isFullyPaid, color: isFullyPaid ? '#34D399' : '#E4E4E6' },
	))

	const variant: AlertVariant = data.isReset ? 'red' : data.isModification ? 'blue' : 'green'
	const alertText = data.isReset
		? 'Ce paiement ne figure plus dans le suivi des encaissements. La facture correspondante a été supprimée.'
		: data.isModification
			? 'Cette facture annule et remplace une facture précédemment émise pour ce paiement.'
			: (isFullyPaid
				? 'Le solde total est désormais intégralement couvert.'
				: 'Merci pour votre confiance.')

	return `
		${heading(title)}
		${paragraph(intro)}
		${card(data.carTitle, rows.join(''))}
		${alertBox(alertText, variant)}
		${data.invoiceUrl ? button(data.invoiceUrl, 'Télécharger la facture (PDF)') : ''}
		${forAdmin ? button(`${APP_URL}/admin/reservations/${data.reservationId}`, 'Voir la réservation') : button(`${APP_URL}/contact`, 'Nous contacter')}
	`
}

export async function sendPaymentConfirmationToClient(data: PaymentConfirmationData) {
	const html = wrap(paymentEmailBody(data, false))
	return sendEmail({ to: data.clientEmail, subject: paymentEmailSubject(data), html })
}

export async function sendPaymentConfirmationToAdmin(data: PaymentConfirmationData) {
	const html = wrap(paymentEmailBody(data, true))
	return sendEmail({ to: ADMIN_TO, subject: `[Admin] ${paymentEmailSubject(data)}`, html })
}
