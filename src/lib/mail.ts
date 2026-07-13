// src/lib/mail.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM     = process.env.EMAIL_FROM          ?? 'LME Occasions <onboarding@resend.dev>'
const ADMIN_TO = process.env.ADMIN_EMAIL         ?? 'hasandriamirama@hotmail.com'
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const FONT_STACK = "'Segoe UI',Helvetica,Arial,sans-serif"

const COLORS = {
	bg:                '#0A0A0B',
	headerFrom:        '#141418',
	headerTo:          '#1E1E26',
	headerFallback:    '#17171C',
	panel:             '#141418',
	card:              '#1E1E26',
	borderCard:        'rgba(212,175,55,0.2)',
	borderPanel:       'rgba(255,255,255,0.06)',
	borderRow:         'rgba(255,255,255,0.05)',
	borderFooter:      'rgba(255,255,255,0.04)',
	white:             '#ffffff',
	text:              '#E4E4E6',
	muted:             '#9C9CA3',
	gold:              '#D4AF37',
	goldDark:          '#B8962B',
	green:             '#10B981',
	red:               '#F87171',
	footerText:        '#555560',
	alertBg:           'rgba(212,175,55,0.1)',
	alertBgFallback:   '#1F1A0E',
	alertBorder:       'rgba(212,175,55,0.3)',
	warningBg:         'rgba(239,68,68,0.1)',
	warningBgFallback: '#241414',
	warningBorder:     'rgba(239,68,68,0.3)',
} as const

const PREHEADER_PAD = '&nbsp;&zwnj;'.repeat(40)

function escapeHtml(value: unknown): string {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

function heading(html: string): string {
	return `<h2 style="margin:0 0 16px 0;font-family:${FONT_STACK};font-size:22px;font-weight:700;color:${COLORS.white};">
		${html}
	</h2>`
}

function paragraph(html: string): string {
	return `<p style="margin:0 0 12px 0;font-family:${FONT_STACK};font-size:14px;line-height:1.7;color:${COLORS.muted};">
		${html}
	</p>`
}

function infoRow(label: string, value: string, opts: { highlight?: boolean; color?: string } = {}): string {
	const cell = `padding:8px 0;border-bottom:1px solid ${COLORS.borderRow};font-family:${FONT_STACK};font-size:14px;`
	const valueStyle = opts.highlight
		? `color:${COLORS.gold};font-weight:700;font-size:22px;`
		: `color:${opts.color ?? COLORS.text};font-weight:${opts.color ? 700 : 500};`

	return `<tr>
		<td align="left" style="${cell}color:${COLORS.muted};">
			${escapeHtml(label)}
		</td>
		<td align="right" style="${cell}${valueStyle}">
			${value}
		</td>
	</tr>`
}

function carCard(title: string | null, rowsHtml: string): string {
	const titleRow = title
		? `<tr><td colspan="2" style="padding:0 0 8px 0;font-family:${FONT_STACK};font-size:20px;font-weight:700;color:${COLORS.white};">${escapeHtml(title)}</td></tr>`
		: ''

	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.card}" style="background-color:${COLORS.card};border:1px solid ${COLORS.borderCard};border-radius:8px;margin:20px 0;">
		<tr>
			<td style="padding:20px;">
				<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
					${titleRow}
					${rowsHtml}
				</table>
			</td>
		</tr>
	</table>`
}

function emailButton(href: string, label: string, variant: 'solid' | 'outline' = 'solid'): string {
	const safeHref  = escapeHtml(href)
	const safeLabel = escapeHtml(label)
	const linkBase  = `display:inline-block;mso-line-height-rule:exactly;line-height:100%;font-family:${FONT_STACK};font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;`

	if (variant === 'outline') {
		return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;margin:16px 8px 16px 0;">
			<tr>
				<td align="center" style="border-radius:8px;border:1.5px solid ${COLORS.gold};">
					<a href="${safeHref}" target="_blank" style="${linkBase}padding:12.5px 26px;color:${COLORS.gold};">${safeLabel}</a>
				</td>
			</tr>
		</table>`
	}

	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="mso-table-lspace:0pt;mso-table-rspace:0pt;margin:16px 8px 16px 0;">
		<tr>
			<td align="center" bgcolor="${COLORS.gold}" style="border-radius:8px;background:linear-gradient(135deg,${COLORS.gold},${COLORS.goldDark});">
				<a href="${safeHref}" target="_blank" style="${linkBase}padding:14px 28px;color:${COLORS.bg};">${safeLabel}</a>
			</td>
		</tr>
	</table>`
}

function alertBox(html: string, variant: 'info' | 'warning' = 'info'): string {
	const isWarning = variant === 'warning'
	const bgFallback = isWarning ? COLORS.warningBgFallback : COLORS.alertBgFallback
	const bgCss       = isWarning ? COLORS.warningBg         : COLORS.alertBg
	const border      = isWarning ? COLORS.warningBorder     : COLORS.alertBorder
	const color        = isWarning ? COLORS.red               : COLORS.gold

	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${bgFallback}" style="background-color:${bgCss};border:1px solid ${border};border-radius:8px;margin:20px 0;">
		<tr>
			<td style="padding:16px;font-family:${FONT_STACK};font-size:14px;line-height:1.6;color:${color};">${html}</td>
		</tr>
	</table>`
}

function messageBox(html: string): string {
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.card}" style="background-color:${COLORS.card};border-radius:8px;margin-top:8px;">
		<tr>
			<td style="padding:16px;font-family:${FONT_STACK};font-size:14px;line-height:1.7;color:${COLORS.text};">${html}</td>
		</tr>
	</table>`
}

function wrap(content: string, preheader?: string): string {
	const preheaderHtml = preheader
		? `<span style="display:none;font-size:1px;line-height:1px;color:${COLORS.panel};max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}${PREHEADER_PAD}</span>`
		: ''

	return `<!DOCTYPE html>
	<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width,initial-scale=1">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="x-apple-disable-message-reformatting">
		<meta name="color-scheme" content="light dark">
		<meta name="supported-color-schemes" content="light dark">
		<title>LME Occasions</title>
		<!--[if mso]>
			<noscript>
				<xml>
					<o:OfficeDocumentSettings>
						<o:PixelsPerInch>96</o:PixelsPerInch>
					</o:OfficeDocumentSettings>
				</xml>
			</noscript>
		<![endif]-->
		<style>
			body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
			table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
			img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
			body { margin:0; padding:0; width:100% !important; height:100% !important; }
			a { text-decoration:none; }
			@media screen and (max-width:600px) {
				.email-container { width:100% !important; }
				.email-padding   { padding-left:20px !important; padding-right:20px !important; }
			}
		</style>
	</head>
	<body style="margin:0;padding:0;background-color:${COLORS.bg};">
		${preheaderHtml}
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${COLORS.bg}" style="background-color:${COLORS.bg};">
			<tr>
				<td align="center" style="padding:40px 20px;" class="email-padding">
					<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="email-container" style="width:600px;max-width:600px;">
						<tr>
							<td align="center" bgcolor="${COLORS.headerFallback}" style="background:linear-gradient(135deg,${COLORS.headerFrom} 0%,${COLORS.headerTo} 100%);border:1px solid ${COLORS.borderCard};border-radius:12px 12px 0 0;padding:32px;">
								<p style="margin:0;font-family:${FONT_STACK};font-size:28px;font-weight:800;letter-spacing:2px;color:${COLORS.gold};">LME OCCASIONS</p>
								<p style="margin:4px 0 0 0;font-family:${FONT_STACK};font-size:13px;color:${COLORS.muted};letter-spacing:1px;">Premium Automobile</p>
							</td>
						</tr>
						<tr>
							<td bgcolor="${COLORS.panel}" style="background-color:${COLORS.panel};border:1px solid ${COLORS.borderPanel};border-top:none;padding:32px;" class="email-padding">
								${content}
							</td>
						</tr>
						<tr>
							<td align="center" bgcolor="${COLORS.bg}" style="background-color:${COLORS.bg};border:1px solid ${COLORS.borderFooter};border-top:none;border-radius:0 0 12px 12px;padding:24px;">
								<p style="margin:0;font-family:${FONT_STACK};font-size:12px;color:${COLORS.footerText};">© ${new Date().getFullYear()} LME Occasions. Tous droits réservés.</p>
								<p style="margin:8px 0 0 0;font-family:${FONT_STACK};font-size:12px;color:${COLORS.footerText};">
									<a href="${APP_URL}/cgv" style="color:${COLORS.gold};text-decoration:none;">CGV</a>&nbsp;·&nbsp;
									<a href="${APP_URL}/confidentialite" style="color:${COLORS.gold};text-decoration:none;">Confidentialité</a>&nbsp;·&nbsp;
									<a href="${APP_URL}/contact" style="color:${COLORS.gold};text-decoration:none;">Contact</a>
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
		weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
	})
	const balance = data.totalPrice - data.depositAmount

	const rows = [
		infoRow(`Référence réservation`, `#${data.reservationId.slice(-8).toUpperCase()}`),
		infoRow(`Véhicule`, `${escapeHtml(data.carBrand)} ${escapeHtml(data.carModel)} ${data.carYear}`),
		infoRow(`Prix total du véhicule`, `${data.totalPrice.toLocaleString('fr-FR')} €`, { highlight: true }),
		infoRow(`Acompte versé (30%)`, `${data.depositAmount.toLocaleString('fr-FR')} €`, { color: COLORS.green }),
		infoRow(`Solde restant`, `${balance.toLocaleString('fr-FR')} €`),
	].join('')

	const content = `
		${heading(`Votre paiement a bien été reçu !`)}
		${paragraph(`Bonjour <strong>${escapeHtml(data.clientName)}</strong>, votre acompte a bien été encaissé. Voici le récapitulatif de votre réservation :`)}
		${carCard(data.carTitle, rows)}
		${data.invoiceUrl ? emailButton(data.invoiceUrl, `📄 Télécharger la facture d'acompte (PDF)`, 'outline') : ''}
		${alertBox(`<strong>Important :</strong> Votre réservation n'est pas encore définitive. Vous avez jusqu'au <strong>${expiryStr}</strong> pour vous présenter en agence afin qu'un membre de notre équipe confirme votre réservation et organise le règlement du solde.`)}
		${heading(`Prochaines étapes`)}
		${paragraph(`1. Présentez-vous à notre agence avec une pièce d'identité valide.`)}
		${paragraph(`2. Notre équipe confirme votre réservation sur place.`)}
		${paragraph(`3. Réglez le solde de <strong>${balance.toLocaleString('fr-FR')} €</strong> (comptant ou en plusieurs fois selon votre choix), signez le contrat de vente et repartez avec votre véhicule !`)}
		${alertBox(`<strong>Délai de 5 jours :</strong> En cas de non-présentation avant le ${expiryStr}, la réservation expirera automatiquement et l'acompte versé ne sera pas remboursé. Pour toute question, contactez-nous immédiatement.`, 'warning')}
		${emailButton(`${APP_URL}/contact`, `Nous contacter`)}
	`

	const preheader = `Acompte de ${data.depositAmount.toLocaleString('fr-FR')} € reçu pour ${data.carTitle}. Présentez-vous en agence avant le ${expiryStr} pour confirmer votre réservation.`

	return sendEmail({
		to:      data.clientEmail,
		subject: `Paiement reçu — finalisez votre réservation en agence — ${data.carTitle}`,
		html:    wrap(content, preheader),
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
	const balance      = Math.max(0, data.totalPrice - data.depositAmount)
	const isPaidInFull = balance <= 0

	const installmentLabel: Record<string, string> = {
		FULL:        `le règlement comptant du solde restant (${balance.toLocaleString('fr-FR')} €)`,
		THREE_TIMES: `le règlement du solde en 3 fois (soit environ ${(balance / 3).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} € par échéance)`,
		FOUR_TIMES:  `le règlement du solde en 4 fois (soit environ ${(balance / 4).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} € par échéance)`,
	}
	const nextStep           = installmentLabel[data.installmentType ?? 'FULL']
	const invoiceButtonLabel = isPaidInFull ? `📄 Télécharger la facture (PDF)` : `📄 Télécharger la facture d'acompte (PDF)`

	const rows = [
		infoRow(`Référence réservation`, `#${data.reservationId.slice(-8).toUpperCase()}`),
		infoRow(`Véhicule`, `${escapeHtml(data.carBrand)} ${escapeHtml(data.carModel)} ${data.carYear}`),
		infoRow(`Prix total du véhicule`, `${data.totalPrice.toLocaleString('fr-FR')} €`, { highlight: true }),
		infoRow(`Acompte versé`, `${data.depositAmount.toLocaleString('fr-FR')} €`, { color: COLORS.green }),
		infoRow(`Solde restant`, `${balance.toLocaleString('fr-FR')} €`),
	].join('')

	const content = `
		${heading(`Votre réservation est confirmée !`)}
		${paragraph(`Bonjour <strong>${escapeHtml(data.clientName)}</strong>, votre réservation a été confirmée par notre équipe. Voici le récapitulatif :`)}
		${carCard(data.carTitle, rows)}
		${data.invoiceUrl ? emailButton(data.invoiceUrl, invoiceButtonLabel, 'outline') : ''}
		${isPaidInFull
			? alertBox(`<strong>Véhicule réglé intégralement !</strong> Votre acompte couvre la totalité du prix de vente. Notre équipe vous contactera pour organiser la remise des clés et les démarches administratives.`)
			: alertBox(`<strong>Prochaine étape :</strong> ${nextStep}. Notre équipe reste à votre disposition en agence pour organiser ce règlement.`)}
		${emailButton(`${APP_URL}/contact`, `Nous contacter`)}
	`

	const preheader = isPaidInFull
		? `Votre véhicule ${data.carTitle} est réglé intégralement.`
		: `Votre réservation pour ${data.carTitle} est confirmée — solde restant : ${balance.toLocaleString('fr-FR')} €.`

	return sendEmail({
		to:      data.clientEmail,
		subject: `Réservation confirmée — ${data.carTitle}`,
		html:    wrap(content, preheader),
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
	balanceAmount: number
	totalPrice: number
	reservationId: string
	invoiceUrl?: string | null
}) {
	const rows = [
		infoRow(`Référence réservation`, `#${data.reservationId.slice(-8).toUpperCase()}`),
		infoRow(`Véhicule`, `${escapeHtml(data.carBrand)} ${escapeHtml(data.carModel)} ${data.carYear}`),
		infoRow(`Acompte versé`, `${data.depositAmount.toLocaleString('fr-FR')} €`),
		infoRow(`Solde réglé`, `${data.balanceAmount.toLocaleString('fr-FR')} €`, { color: COLORS.green }),
		infoRow(`Total encaissé`, `${data.totalPrice.toLocaleString('fr-FR')} €`, { highlight: true }),
	].join('')

	const content = `
		${heading(`Votre véhicule est intégralement payé !`)}
		${paragraph(`Bonjour <strong>${escapeHtml(data.clientName)}</strong>, nous vous confirmons la bonne réception du solde restant. Votre véhicule est désormais réglé intégralement. Voici le récapitulatif :`)}
		${carCard(data.carTitle, rows)}
		${data.invoiceUrl ? emailButton(data.invoiceUrl, `📄 Télécharger la facture (PDF)`, 'outline') : ''}
		${alertBox(`<strong>Félicitations !</strong> Le paiement de votre véhicule est complet. Notre équipe vous contactera prochainement pour organiser la remise des clés et finaliser les démarches administratives.`)}
		${paragraph(`Merci pour votre confiance, et à très bientôt au volant de votre nouveau véhicule !`)}
		${emailButton(`${APP_URL}/contact`, `Nous contacter`)}
	`

	const preheader = `Le solde de ${data.balanceAmount.toLocaleString('fr-FR')} € a bien été reçu — ${data.carTitle} est désormais payé intégralement.`

	return sendEmail({
		to:      data.clientEmail,
		subject: `Solde réglé — Facture disponible — ${data.carTitle}`,
		html:    wrap(content, preheader),
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
	const rows = [
		infoRow(`Client`, escapeHtml(data.clientName)),
		infoRow(`Email`, escapeHtml(data.clientEmail)),
		infoRow(`Téléphone`, escapeHtml(data.clientPhone)),
		infoRow(`Véhicule`, escapeHtml(data.carTitle)),
		infoRow(`Acompte reçu`, `${data.depositAmount.toLocaleString('fr-FR')} €`, { highlight: true }),
		infoRow(`Prix total`, `${data.totalPrice.toLocaleString('fr-FR')} €`),
		infoRow(`Expire le`, data.expiresAt.toLocaleDateString('fr-FR')),
	].join('')

	const content = `
		${heading(`Nouvelle réservation reçue !`)}
		${paragraph(`Une nouvelle réservation a été effectuée sur le site LME Occasions.`)}
		${carCard(`Réservation #${data.reservationId.slice(-8).toUpperCase()}`, rows)}
		${emailButton(`${APP_URL}/admin/reservations`, `Voir dans l'admin`)}
	`

	const preheader = `${data.clientName} — acompte de ${data.depositAmount.toLocaleString('fr-FR')} € — ${data.carTitle}`

	return sendEmail({
		to:      ADMIN_TO,
		subject: `Nouvelle réservation — ${data.carTitle} — ${data.clientName}`,
		html:    wrap(content, preheader),
	})
}

export async function sendReservationExpiredToClient(data: {
	clientName: string
	clientEmail: string
	carTitle: string
	depositAmount: number
}) {
	const content = `
		${heading(`Réservation expirée`)}
		${paragraph(`Bonjour <strong>${escapeHtml(data.clientName)}</strong>,`)}
		${paragraph(`Nous vous informons que votre réservation pour le véhicule <strong>${escapeHtml(data.carTitle)}</strong> a expiré, le délai de 5 jours ayant été dépassé.`)}
		${alertBox(`Le véhicule est de nouveau disponible à la vente.<br/>L'acompte de <strong>${data.depositAmount.toLocaleString('fr-FR')} €</strong> versé ne peut pas être remboursé conformément à nos conditions générales de vente.`, 'warning')}
		${paragraph(`Si vous pensez qu'il s'agit d'une erreur ou souhaitez contester cette décision, contactez-nous dans les plus brefs délais.`)}
		${emailButton(`${APP_URL}/contact`, `Contacter l'agence`)}
	`

	const preheader = `Votre réservation pour ${data.carTitle} a expiré.`

	return sendEmail({
		to:      data.clientEmail,
		subject: `Réservation expirée — ${data.carTitle}`,
		html:    wrap(content, preheader),
	})
}

export async function sendReservationExpiredToAdmin(data: {
	clientName: string
	clientEmail: string
	carTitle: string
	reservationId: string
}) {
	const rows = [
		infoRow(`Réservation`, `#${data.reservationId.slice(-8).toUpperCase()}`),
		infoRow(`Client`, `${escapeHtml(data.clientName)} (${escapeHtml(data.clientEmail)})`),
		infoRow(`Véhicule`, escapeHtml(data.carTitle)),
	].join('')

	const content = `
		${heading(`Réservation expirée automatiquement`)}
		${paragraph(`La réservation suivante a expiré après 5 jours sans finalisation :`)}
		${carCard(null, rows)}
		${paragraph(`Le véhicule est automatiquement repassé en statut <strong>Disponible</strong>.`)}
		${emailButton(`${APP_URL}/admin/reservations`, `Voir les réservations`)}
	`

	const preheader = `Réservation de ${data.clientName} expirée automatiquement — ${data.carTitle}.`

	return sendEmail({
		to:      ADMIN_TO,
		subject: `Réservation expirée — ${data.carTitle}`,
		html:    wrap(content, preheader),
	})
}

export async function sendContactEmail(data: {
	name: string
	email: string
	phone?: string
	subject?: string
	message: string
}) {
	const rows = [
		infoRow(`Nom`, escapeHtml(data.name)),
		infoRow(`Email`, escapeHtml(data.email)),
		...(data.phone   ? [infoRow(`Téléphone`, escapeHtml(data.phone))]   : []),
		...(data.subject ? [infoRow(`Sujet`,     escapeHtml(data.subject))] : []),
	].join('')

	const content = `
		${heading(`Nouveau message de contact`)}
		${carCard(null, rows)}
		${paragraph(`<strong>Message :</strong>`)}
		${messageBox(escapeHtml(data.message).replace(/\n/g, '<br/>'))}
		${emailButton(`mailto:${data.email}`, `Répondre`)}
	`

	const preheader = `Nouveau message de ${data.name}${data.subject ? ` — ${data.subject}` : ''}`

	return sendEmail({
		to:      ADMIN_TO,
		replyTo: data.email,
		subject: `Contact — ${data.subject ?? data.name}`,
		html:    wrap(content, preheader),
	})
}
