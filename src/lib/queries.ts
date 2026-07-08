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
	depositAmount:  number
	totalPrice:     number
	balancePayment: { paidAmount: number | null } | null
}

export function computePaymentSummary({
	depositAmount,
	totalPrice,
	balancePayment,
}: PaymentSummaryInput) {
	const totalPaid       = depositAmount + (balancePayment?.paidAmount ?? 0)
	const remaining       = Math.max(0, totalPrice - totalPaid)
	const isFullyPaid     = totalPaid >= totalPrice
	const isBalancePaid   = balancePayment?.paidAmount != null
	const hasBalance      = balancePayment !== null
	const progressPercent = Math.min(100, Math.round((totalPaid / totalPrice) * 100))

	return { totalPaid, remaining, isFullyPaid, isBalancePaid, hasBalance, progressPercent }
}
