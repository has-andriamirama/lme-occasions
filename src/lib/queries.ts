// src/lib/queries.ts
export function getActiveOfferFilter() {
	const now = new Date()
	return {
		isActive:  true,
		startDate: { lte: now },
		endDate:   { gte: now },
	}
}

export function getActiveOffersInclude() {
	return {
		include: { offer: true },
		where:   { offer: getActiveOfferFilter() },
	}
}

interface PaymentSummaryInput {
	depositAmount: number
	totalPrice:    number
	installments:  { paidAmount: number | null }[]
}

export function computePaymentSummary({
	depositAmount,
	totalPrice,
	installments,
}: PaymentSummaryInput) {
	const totalFromInstallments = installments.reduce(
		(sum, i) => sum + (i.paidAmount ?? 0),
		0
	)
	const totalPaid       = depositAmount + totalFromInstallments
	const remaining       = Math.max(0, totalPrice - totalPaid)
	const isFullyPaid     = totalPaid >= totalPrice
	const paidCount       = installments.filter((i) => i.paidAmount !== null).length
	const totalCount      = installments.length
	const progressPercent = Math.min(100, Math.round((totalPaid / totalPrice) * 100))

	return { totalPaid, remaining, isFullyPaid, paidCount, totalCount, progressPercent }
}
