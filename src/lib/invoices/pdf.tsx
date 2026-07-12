// src/lib/invoices/pdf.tsx
import path from 'path'
import fs from 'fs'
import {
	Document,
	Page,
	View,
	Text,
	StyleSheet,
	Font,
	renderToBuffer,
} from '@react-pdf/renderer'
import type { InvoiceContext } from './types'

const FONT_DIR = path.join(process.cwd(), 'src', 'lib', 'invoices', 'fonts')
const FONT_FILES = {
	regular:  path.join(FONT_DIR, 'Poppins-Regular.ttf'),
	medium:   path.join(FONT_DIR, 'Poppins-Medium.ttf'),
	semibold: path.join(FONT_DIR, 'Poppins-SemiBold.ttf'),
	bold:     path.join(FONT_DIR, 'Poppins-Bold.ttf'),
}

function registerInvoiceFont(): string {
	try {
		const allPresent = Object.values(FONT_FILES).every((p) => fs.existsSync(p))
		if (!allPresent) throw new Error('Fichiers de police Poppins introuvables sur le disque')

		Font.register({
			family: 'Poppins',
			fonts: [
				{ src: FONT_FILES.regular,  fontWeight: 400 },
				{ src: FONT_FILES.medium,   fontWeight: 500 },
				{ src: FONT_FILES.semibold, fontWeight: 600 },
				{ src: FONT_FILES.bold,     fontWeight: 700 },
			],
		})
		return 'Poppins'
	} catch (err) {
		console.error('[invoices/pdf] Police Poppins indisponible, repli sur Helvetica :', err)
		return 'Helvetica'
	}
}

const FONT_FAMILY = registerInvoiceFont()

const COMPANY = {
	name:         process.env.COMPANY_NAME     ?? 'LME Occasions',
	tagline:      process.env.COMPANY_TAGLINE  ?? "Véhicules d'occasion premium",
	addressLine1: process.env.COMPANY_ADDRESS_LINE1 ?? '',
	addressLine2: process.env.COMPANY_ADDRESS_LINE2 ?? '',
	email:        process.env.COMPANY_EMAIL    ?? '',
	phone:        process.env.COMPANY_PHONE    ?? '',
	siret:        process.env.COMPANY_SIRET    ?? '',
	legalMention: process.env.INVOICE_LEGAL_MENTION ?? '',
}

const COLOR = {
	gold:        '#B8962B',
	goldLight:   '#D4AF37',
	goldPale:    '#FDF8E7',
	goldBorder:  '#F0CA47',
	dark:        '#141418',
	gray:        '#55556A',
	grayLight:   '#9C9CA3',
	border:      '#E4E4E6',
	bgSoft:      '#FAFAF8',
	white:       '#FFFFFF',
	successText: '#0F7A4E',
	successBg:   '#ECFDF5',
	successBrd:  '#A7E8CB',
}

const styles = StyleSheet.create({
	page: {
		fontFamily:      FONT_FAMILY,
		fontSize:        9.5,
		color:           COLOR.dark,
		paddingTop:      42,
		paddingBottom:   56,
		paddingHorizontal: 44,
	},

	// Header
	headerRow: {
		flexDirection:  'row',
		justifyContent: 'space-between',
		alignItems:     'flex-start',
		marginBottom:   22,
	},
	brand:     { fontSize: 19, fontWeight: 700, color: COLOR.dark, letterSpacing: 0.4 },
	brandGold: { color: COLOR.gold },
	tagline: {
		fontSize:       7.5,
		color:          COLOR.grayLight,
		marginTop:      3,
		letterSpacing:  1.1,
		textTransform:  'uppercase',
	},
	companyBlock: { marginTop: 10, fontSize: 8, color: COLOR.gray, lineHeight: 1.5 },

	invoiceTitleBlock: { alignItems: 'flex-end' },
	invoiceTitle:      { fontSize: 15, fontWeight: 700, color: COLOR.dark, marginBottom: 8 },
	metaRow:           { flexDirection: 'row', marginBottom: 2 },
	metaLabel:         { fontSize: 8, color: COLOR.grayLight, marginRight: 10, width: 62, textAlign: 'right' },
	metaValue:         { fontSize: 8, color: COLOR.dark, fontWeight: 500, width: 90, textAlign: 'right' },

	divider: { borderBottomWidth: 1.5, borderBottomColor: COLOR.gold, marginBottom: 22 },

	// Parties
	partiesRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
	partyBlock:  { width: '47%' },
	partyLabel:  {
		fontSize: 7.5, color: COLOR.gold, fontWeight: 600,
		textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
	},
	partyName: { fontSize: 10.5, fontWeight: 600, color: COLOR.dark, marginBottom: 3 },
	partyLine: { fontSize: 8.5, color: COLOR.gray, lineHeight: 1.5 },

	// Table
	tableHeader: {
		flexDirection: 'row', backgroundColor: COLOR.dark,
		paddingVertical: 8, paddingHorizontal: 10,
	},
	tableHeaderCell: {
		fontSize: 7.5, fontWeight: 600, color: COLOR.white,
		textTransform: 'uppercase', letterSpacing: 0.6,
	},
	tableRow: {
		flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 10,
		borderBottomWidth: 1, borderBottomColor: COLOR.border, backgroundColor: COLOR.bgSoft,
	},
	colDesc:   { width: '58%' },
	colQty:    { width: '12%', textAlign: 'center' },
	colAmount: { width: '30%', textAlign: 'right' },
	cellTitle: { fontSize: 9, fontWeight: 500, color: COLOR.dark },
	cellSub:   { fontSize: 7.5, color: COLOR.grayLight, marginTop: 2 },
	cellAmount:{ fontSize: 9.5, fontWeight: 600, color: COLOR.dark },

	// Totals
	totalsBlock: { marginTop: 18, alignItems: 'flex-end' },
	totalsInner: { width: '58%' },
	totalsRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
	totalsLabel: { fontSize: 8.5, color: COLOR.gray },
	totalsValue: { fontSize: 8.5, color: COLOR.dark, fontWeight: 500 },
	totalsDivider: { borderBottomWidth: 1, borderBottomColor: COLOR.border, marginVertical: 4 },

	grandTotalRow: {
		flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLOR.dark,
		paddingVertical: 10, paddingHorizontal: 12, marginTop: 6,
	},
	grandTotalLabel: { fontSize: 10, fontWeight: 600, color: COLOR.white },
	grandTotalValue: { fontSize: 12, fontWeight: 700, color: COLOR.goldLight },

	dueRow: {
		flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, paddingHorizontal: 12,
		marginTop: 8, backgroundColor: COLOR.goldPale, borderWidth: 1, borderColor: COLOR.goldBorder,
	},
	dueLabel: { fontSize: 9, fontWeight: 600, color: '#8E731E' },
	dueValue: { fontSize: 10.5, fontWeight: 700, color: '#8E731E' },

	settledRow: {
		flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
		paddingVertical: 9, paddingHorizontal: 12,
		marginTop: 8, backgroundColor: COLOR.successBg, borderWidth: 1, borderColor: COLOR.successBrd,
	},
	settledText: { fontSize: 9, fontWeight: 700, color: COLOR.successText, textAlign: 'center' },

	// Payment method
	paymentBlock: { marginTop: 22 },
	paymentTitle: {
		fontSize: 7.5, color: COLOR.gold, fontWeight: 600,
		textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5,
	},
	paymentLine: { fontSize: 8.5, color: COLOR.gray, lineHeight: 1.6 },

	// Legal notice
	noteBlock: { marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLOR.border },
	noteText:  { fontSize: 7.5, color: COLOR.grayLight, lineHeight: 1.6 },

	footer: {
		position: 'absolute', bottom: 26, left: 44, right: 44,
		textAlign: 'center', fontSize: 7, color: COLOR.grayLight,
		borderTopWidth: 0.5, borderTopColor: COLOR.border, paddingTop: 8,
	},
})

function formatAmount(n: number): string {
	const negative = n < 0
	const [intPart, decPart = '00'] = Math.abs(n).toFixed(2).split('.')
	const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
	return `${negative ? '-' : ''}${grouped},${decPart}`
}

const eur = (n: number) => `${formatAmount(n)} €`

const dateFr = (d: Date) =>
	d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

interface InvoiceDocumentProps {
	ctx:    InvoiceContext
	number: string
	issuedAt: Date
}

function InvoiceDocument({ ctx, number, issuedAt }: InvoiceDocumentProps) {
	const isDeposit   = ctx.type === 'DEPOSIT'
	const balanceDue  = Math.max(0, ctx.totalPrice - ctx.depositAmount)
	const hadBalance  = balanceDue > 0.005 || !!ctx.paymentMethodBalance

	const title       = isDeposit ? "FACTURE D'ACOMPTE" : 'FACTURE'
	const lineTitle   = isDeposit
		? `Acompte véhicule — ${ctx.vehicle.brand} ${ctx.vehicle.model} ${ctx.vehicle.year}`
		: `Vente véhicule — ${ctx.vehicle.brand} ${ctx.vehicle.model} ${ctx.vehicle.year}`
	const lineAmount  = isDeposit ? ctx.depositAmount : ctx.totalPrice
	const paidNow     = isDeposit ? ctx.depositAmount : ctx.totalPrice

	const noteText = isDeposit
		? "Cette facture atteste du versement de l'acompte mentionné ci-dessus dans le cadre de la réservation du véhicule désigné. Le solde restant est exigible selon les conditions générales de vente en vigueur. Conformément à ces conditions, cet acompte reste acquis en cas de non-présentation dans le délai imparti."
		: "Cette facture atteste du règlement intégral du véhicule désigné ci-dessus et vaut preuve de paiement. Elle est délivrée dans le cadre de la vente réalisée par " + COMPANY.name + '.'

	return (
		<Document title={`${title} ${number}`} author={COMPANY.name} creator={COMPANY.name}>
			<Page size="A4" style={styles.page}>
				<View style={styles.headerRow}>
					<View>
						<Text style={styles.brand}>COMPANY.name</Text>
						<Text style={styles.tagline}>{COMPANY.tagline}</Text>
						{COMPANY.addressLine1 || COMPANY.email || COMPANY.phone ? (
							<View style={styles.companyBlock}>
								{COMPANY.addressLine1 ? <Text>{COMPANY.addressLine1}</Text> : null}
								{COMPANY.addressLine2 ? <Text>{COMPANY.addressLine2}</Text> : null}
								{COMPANY.email || COMPANY.phone ? (
									<Text>{[COMPANY.email, COMPANY.phone].filter(Boolean).join('  ·  ')}</Text>
								) : null}
							</View>
						) : null}
					</View>

					<View style={styles.invoiceTitleBlock}>
						<Text style={styles.invoiceTitle}>{title}</Text>
						<View style={styles.metaRow}>
							<Text style={styles.metaLabel}>N°</Text>
							<Text style={styles.metaValue}>{number}</Text>
						</View>
						<View style={styles.metaRow}>
							<Text style={styles.metaLabel}>Date</Text>
							<Text style={styles.metaValue}>{dateFr(issuedAt)}</Text>
						</View>
						<View style={styles.metaRow}>
							<Text style={styles.metaLabel}>Réservation</Text>
							<Text style={styles.metaValue}>#{ctx.reservationRef}</Text>
						</View>
					</View>
				</View>

				<View style={styles.divider} />

				<View style={styles.partiesRow}>
					<View style={styles.partyBlock}>
						<Text style={styles.partyLabel}>Vendeur</Text>
						<Text style={styles.partyName}>{COMPANY.name}</Text>
						{COMPANY.addressLine1 ? <Text style={styles.partyLine}>{COMPANY.addressLine1}</Text> : null}
						{COMPANY.addressLine2 ? <Text style={styles.partyLine}>{COMPANY.addressLine2}</Text> : null}
						{COMPANY.siret ? <Text style={styles.partyLine}>SIRET : {COMPANY.siret}</Text> : null}
					</View>
					<View style={styles.partyBlock}>
						<Text style={styles.partyLabel}>Facturé à</Text>
						<Text style={styles.partyName}>{ctx.client.name}</Text>
						<Text style={styles.partyLine}>{ctx.client.email}</Text>
						<Text style={styles.partyLine}>{ctx.client.phone}</Text>
					</View>
				</View>

				<View>
					<View style={styles.tableHeader}>
						<Text style={[styles.tableHeaderCell, styles.colDesc]}>Désignation</Text>
						<Text style={[styles.tableHeaderCell, styles.colQty]}>Qté</Text>
						<Text style={[styles.tableHeaderCell, styles.colAmount]}>Montant</Text>
					</View>
					<View style={styles.tableRow}>
						<View style={styles.colDesc}>
							<Text style={styles.cellTitle}>{lineTitle}</Text>
							<Text style={styles.cellSub}>{ctx.vehicle.title}</Text>
						</View>
						<Text style={[styles.cellTitle, styles.colQty]}>1</Text>
						<Text style={[styles.cellAmount, styles.colAmount]}>{eur(lineAmount)}</Text>
					</View>
				</View>

				<View style={styles.totalsBlock}>
					<View style={styles.totalsInner}>
						<View style={styles.totalsRow}>
							<Text style={styles.totalsLabel}>Prix total du véhicule</Text>
							<Text style={styles.totalsValue}>{eur(ctx.totalPrice)}</Text>
						</View>

						{isDeposit ? (
							<View style={styles.totalsRow}>
								<Text style={styles.totalsLabel}>Acompte réglé (cette facture)</Text>
								<Text style={styles.totalsValue}>{eur(ctx.depositAmount)}</Text>
							</View>
						) : (
							<>
								<View style={styles.totalsRow}>
									<Text style={styles.totalsLabel}>Acompte déjà réglé</Text>
									<Text style={styles.totalsValue}>{eur(ctx.depositAmount)}</Text>
								</View>
								{hadBalance ? (
									<View style={styles.totalsRow}>
										<Text style={styles.totalsLabel}>
											Solde réglé{ctx.balancePaidAt ? ` le ${dateFr(ctx.balancePaidAt)}` : ''}
										</Text>
										<Text style={styles.totalsValue}>{eur(balanceDue)}</Text>
									</View>
								) : null}
							</>
						)}

						<View style={styles.totalsDivider} />

						<View style={styles.grandTotalRow}>
							<Text style={styles.grandTotalLabel}>TOTAL RÉGLÉ</Text>
							<Text style={styles.grandTotalValue}>{eur(paidNow)}</Text>
						</View>

						{isDeposit ? (
							<View style={styles.dueRow}>
								<Text style={styles.dueLabel}>Solde restant dû</Text>
								<Text style={styles.dueValue}>{eur(balanceDue)}</Text>
							</View>
						) : (
							<View style={styles.settledRow}>
								<Text style={styles.settledText}>
									Facture intégralement réglée — aucun montant restant dû
								</Text>
							</View>
						)}
					</View>
				</View>

				<View style={styles.paymentBlock}>
					<Text style={styles.paymentTitle}>Mode de règlement</Text>
					<Text style={styles.paymentLine}>Acompte : {ctx.paymentMethodDeposit}</Text>
					{!isDeposit && hadBalance && ctx.paymentMethodBalance ? (
						<Text style={styles.paymentLine}>Solde : {ctx.paymentMethodBalance}</Text>
					) : null}
				</View>

				<View style={styles.noteBlock}>
					<Text style={styles.noteText}>{noteText}</Text>
					{COMPANY.legalMention ? <Text style={styles.noteText}>{COMPANY.legalMention}</Text> : null}
				</View>

				<Text style={styles.footer} fixed>
					{COMPANY.name} — Facture générée électroniquement le {dateFr(new Date())} — Document valant justificatif de paiement
				</Text>
			</Page>
		</Document>
	)
}

export async function renderInvoicePdf(
	ctx: InvoiceContext,
	number: string,
	issuedAt: Date = new Date(),
): Promise<Buffer> {
	return renderToBuffer(<InvoiceDocument ctx={ctx} number={number} issuedAt={issuedAt} />)
}
