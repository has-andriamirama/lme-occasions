// src/lib/installments.ts
import type { PrismaClient } from '@prisma/client'

type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

export function getInstallmentCount(type: string): number {
	switch (type) {
		case 'THREE_TIMES': return 3
		case 'FOUR_TIMES':  return 4
		default:            return 1 // FULL
	}
}

export async function createInstallments(
	tx:              TransactionClient,
	reservationId:   string,
	totalPrice:      number,
	depositAmount:   number,
	installmentType: string,
) {
	const count          = getInstallmentCount(installmentType)
	const balance        = totalPrice - depositAmount
	const expectedAmount = Math.round((balance / count) * 100) / 100

	await tx.paymentInstallment.createMany({
		data: Array.from({ length: count }, (_, i) => ({
			reservationId,
			installmentNumber: i + 1,
			expectedAmount,
		})),
	})
}

export async function recreateInstallments(
	tx:              TransactionClient,
	reservationId:   string,
	totalPrice:      number,
	depositAmount:   number,
	installmentType: string,
) {
	await tx.paymentInstallment.deleteMany({ where: { reservationId } })
	await createInstallments(tx, reservationId, totalPrice, depositAmount, installmentType)
}

export function calculateRemainingExpectedAmount(
	installments:  { paidAmount: number | null }[],
	totalPrice:    number,
	depositAmount: number,
): number | null {
	const paidOnInstallments = installments.reduce((sum, i) => sum + (i.paidAmount ?? 0), 0)
	const unpaidCount        = installments.filter((i) => i.paidAmount === null).length

	if (unpaidCount === 0) return null

	const remainingBalance = Math.max(0, totalPrice - depositAmount - paidOnInstallments)
	return Math.round((remainingBalance / unpaidCount) * 100) / 100
}
