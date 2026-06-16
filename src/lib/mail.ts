// src/lib/mail.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM     = process.env.EMAIL_FROM          ?? 'LME Occasions <onboarding@resend.dev>'
const ADMIN_TO = process.env.ADMIN_EMAIL         ?? 'hasandriamirama@hotmail.com'
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── Shared HTML wrapper ──────────────────────────────────────────────────────
function wrap(content: string): string {
	return `<!DOCTYPE html>
		<html lang="fr">
		<head>
			<meta charset="UTF-8"/>
			<meta name="viewport" content="width=device-width,initial-scale=1"/>
			<style>
				* { margin:0; padding:0; box-sizing:border-box; }
				body { background:#0A0A0B; font-family:'Segoe UI',sans-serif; color:#E4E4E6; }
				.container { max-width:600px; margin:0 auto; padding:40px 20px; }
				.header { background:linear-gradient(135deg,#141418 0%,#1E1E26 100%);
									border:1px solid rgba(212,175,55,0.3); border-radius:12px 12px 0 0;
									padding:32px; text-align:center; }
				.logo    { font-size:28px; font-weight:800; letter-spacing:2px;
									 background:linear-gradient(135deg,#D4AF37,#F0CA47);
									 -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
				.tagline { color:#9C9CA3; font-size:13px; margin-top:4px; letter-spacing:1px; }
				.body    { background:#141418; border:1px solid rgba(255,255,255,0.06);
									 border-top:none; padding:32px; }
				.car-card{ background:#1E1E26; border:1px solid rgba(212,175,55,0.2);
									 border-radius:8px; padding:20px; margin:20px 0; }
				.car-title { font-size:20px; font-weight:700; color:#fff; margin-bottom:8px; }
				.info-row  { display:flex; justify-content:space-between; padding:8px 0;
										 border-bottom:1px solid rgba(255,255,255,0.05); font-size:14px; }
				.info-label { color:#9C9CA3; }
				.info-value { color:#E4E4E6; font-weight:500; }
				.highlight  { color:#D4AF37; font-weight:700; font-size:22px; }
				.btn { display:inline-block; background:linear-gradient(135deg,#D4AF37,#B8962B);
							 color:#0A0A0B; font-weight:700; padding:14px 28px; border-radius:8px;
							 text-decoration:none; margin:16px 0; }
				.alert { background:rgba(212,175,55,0.1); border:1px solid rgba(212,175,55,0.3);
								 border-radius:8px; padding:16px; margin:20px 0; color:#D4AF37; font-size:14px; }
				.warning { background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3);
									 border-radius:8px; padding:16px; margin:20px 0; color:#F87171; font-size:14px; }
				.footer { background:#0A0A0B; border:1px solid rgba(255,255,255,0.04);
									border-top:none; border-radius:0 0 12px 12px;
									padding:24px; text-align:center; color:#555560; font-size:12px; }
				.footer a { color:#D4AF37; text-decoration:none; }
				h2 { font-size:22px; color:#fff; margin-bottom:16px; }
				p  { line-height:1.7; color:#9C9CA3; margin-bottom:12px; font-size:14px; }
			</style>
		</head>
		<body>
			<div class="container">
				<div class="header">
					<div class="logo">LME OCCASIONS</div>
					<div class="tagline">Premium Automobile</div>
				</div>
				<div class="body">${content}</div>
				<div class="footer">
					<p>© ${new Date().getFullYear()} LME Occasions. Tous droits réservés.</p>
					<p style="margin-top:8px;">
						<a href="${APP_URL}/cgv">CGV</a> &nbsp;·&nbsp;
						<a href="${APP_URL}/confidentialite">Confidentialité</a> &nbsp;·&nbsp;
						<a href="${APP_URL}/contact">Contact</a>
					</p>
				</div>
			</div>
		</body>
		</html>`
}

// ── Centralized sending helper ────────────────────────────────────────────────
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

// ── 1. Reservation confirmed — CLIENT ────────────────────────────────────────
export async function sendReservationConfirmationToClient(data: {
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
		weekday:'long', day:'2-digit', month:'long', year:'numeric'
	})

	const html = wrap(`
		<h2>Votre réservation est confirmée !</h2>
		<p>Bonjour <strong>${data.clientName}</strong>, votre acompte a bien été reçu.
		Voici le récapitulatif de votre réservation :</p>

		<div class="car-card">
			<div class="car-title">${data.carTitle}</div>
			<div class="info-row"><span class="info-label">Référence réservation</span>
				<span class="info-value">#${data.reservationId.slice(-8).toUpperCase()}</span></div>
			<div class="info-row"><span class="info-label">Véhicule</span>
				<span class="info-value">${data.carBrand} ${data.carModel} ${data.carYear}</span></div>
			<div class="info-row"><span class="info-label">Prix total du véhicule</span>
				<span class="info-value highlight">${data.totalPrice.toLocaleString('fr-FR')} €</span></div>
			<div class="info-row"><span class="info-label">Acompte versé (30%)</span>
				<span class="info-value" style="color:#10B981;font-weight:700;">${data.depositAmount.toLocaleString('fr-FR')} €</span></div>
			<div class="info-row"><span class="info-label">Solde restant</span>
				<span class="info-value">${(data.totalPrice - data.depositAmount).toLocaleString('fr-FR')} €</span></div>
		</div>

		<div class="alert">
			<strong>Important :</strong> Vous avez jusqu'au <strong>${expiryStr}</strong>
			pour vous présenter en agence et régler le solde du véhicule.
		</div>

		<h2>Prochaines étapes</h2>
		<p>1. Présentez-vous à notre agence avec une pièce d'identité valide.</p>
		<p>2. Réglez le solde de <strong>${(data.totalPrice - data.depositAmount).toLocaleString('fr-FR')} €</strong>.</p>
		<p>3. Signez le contrat de vente et repartez avec votre véhicule !</p>

		<div class="warning">
			<strong>Délai de 5 jours :</strong> En cas de non-présentation avant le ${expiryStr},
			la réservation sera annulée et l'acompte versé ne sera pas remboursé.
			Pour toute question, contactez-nous immédiatement.
		</div>

		<a href="${APP_URL}/contact" class="btn">Nous contacter</a>
	`)

	return sendEmail({
		to:      data.clientEmail,
		subject: `Réservation confirmée — ${data.carTitle}`,
		html,
	})
}

// ── 2. Reservation confirmed — ADMIN ─────────────────────────────────────────
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
		<h2>Nouvelle réservation reçue !</h2>
		<p>Une nouvelle réservation a été effectuée sur le site LME Occasions.</p>

		<div class="car-card">
			<div class="car-title">Réservation #${data.reservationId.slice(-8).toUpperCase()}</div>
			<div class="info-row"><span class="info-label">Client</span>
				<span class="info-value">${data.clientName}</span></div>
			<div class="info-row"><span class="info-label">Email</span>
				<span class="info-value">${data.clientEmail}</span></div>
			<div class="info-row"><span class="info-label">Téléphone</span>
				<span class="info-value">${data.clientPhone}</span></div>
			<div class="info-row"><span class="info-label">Véhicule</span>
				<span class="info-value">${data.carTitle}</span></div>
			<div class="info-row"><span class="info-label">Acompte reçu</span>
				<span class="info-value highlight">${data.depositAmount.toLocaleString('fr-FR')} €</span></div>
			<div class="info-row"><span class="info-label">Prix total</span>
				<span class="info-value">${data.totalPrice.toLocaleString('fr-FR')} €</span></div>
			<div class="info-row"><span class="info-label">Expire le</span>
				<span class="info-value">${data.expiresAt.toLocaleDateString('fr-FR')}</span></div>
		</div>

		<a href="${APP_URL}/admin/reservations" class="btn">Voir dans l'admin</a>
	`)

	return sendEmail({
		to:      ADMIN_TO,
		subject: `Nouvelle réservation — ${data.carTitle} — ${data.clientName}`,
		html,
	})
}

// ── 3. Reservation expired — CLIENT ──────────────────────────────────────────
export async function sendReservationExpiredToClient(data: {
	clientName: string
	clientEmail: string
	carTitle: string
	depositAmount: number
}) {
	const html = wrap(`
		<h2>Réservation expirée</h2>
		<p>Bonjour <strong>${data.clientName}</strong>,</p>
		<p>Nous vous informons que votre réservation pour le véhicule
		<strong>${data.carTitle}</strong> a expiré, le délai de 5 jours ayant été dépassé.</p>

		<div class="warning">
			Le véhicule est de nouveau disponible à la vente.<br/>
			L'acompte de <strong>${data.depositAmount.toLocaleString('fr-FR')} €</strong> versé
			ne peut pas être remboursé conformément à nos conditions générales de vente.
		</div>

		<p>Si vous pensez qu'il s'agit d'une erreur ou souhaitez contester cette décision,
		contactez-nous dans les plus brefs délais.</p>

		<a href="${APP_URL}/contact" class="btn">Contacter l'agence</a>
	`)

	return sendEmail({
		to:      data.clientEmail,
		subject: `Réservation expirée — ${data.carTitle}`,
		html,
	})
}

// ── 4. Reservation expired — ADMIN ───────────────────────────────────────────
export async function sendReservationExpiredToAdmin(data: {
	clientName: string
	clientEmail: string
	carTitle: string
	reservationId: string
}) {
	const html = wrap(`
		<h2>Réservation expirée automatiquement</h2>
		<p>La réservation suivante a expiré après 5 jours sans finalisation :</p>

		<div class="car-card">
			<div class="info-row"><span class="info-label">Réservation</span>
				<span class="info-value">#${data.reservationId.slice(-8).toUpperCase()}</span></div>
			<div class="info-row"><span class="info-label">Client</span>
				<span class="info-value">${data.clientName} (${data.clientEmail})</span></div>
			<div class="info-row"><span class="info-label">Véhicule</span>
				<span class="info-value">${data.carTitle}</span></div>
		</div>
		<p>Le véhicule est automatiquement repassé en statut <strong>Disponible</strong>.</p>
		<a href="${APP_URL}/admin/reservations" class="btn">Voir les réservations</a>
	`)

	return sendEmail({
		to:      ADMIN_TO,
		subject: `Réservation expirée — ${data.carTitle}`,
		html,
	})
}

// ── 5. Contact form ───────────────────────────────────────────────────────────
export async function sendContactEmail(data: {
	name: string
	email: string
	phone?: string
	subject?: string
	message: string
}) {
	const html = wrap(`
		<h2>Nouveau message de contact</h2>
		<div class="car-card">
			<div class="info-row"><span class="info-label">Nom</span>
				<span class="info-value">${data.name}</span></div>
			<div class="info-row"><span class="info-label">Email</span>
				<span class="info-value">${data.email}</span></div>
			${data.phone ? `<div class="info-row"><span class="info-label">Téléphone</span>
				<span class="info-value">${data.phone}</span></div>` : ''}
			${data.subject ? `<div class="info-row"><span class="info-label">Sujet</span>
				<span class="info-value">${data.subject}</span></div>` : ''}
		</div>
		<p><strong>Message :</strong></p>
		<div style="background:#1E1E26;border-radius:8px;padding:16px;margin-top:8px;">
			<p style="color:#E4E4E6;">${data.message.replace(/\n/g, '<br/>')}</p>
		</div>
		<a href="mailto:${data.email}" class="btn" style="margin-top:20px;">Répondre</a>
	`)

	return sendEmail({
		to:      ADMIN_TO,
		replyTo: data.email,
		subject: `Contact — ${data.subject ?? data.name}`,
		html,
	})
}
