// src/lib/balance.ts
import type { PrismaClient } from '@prisma/client'

type TransactionClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0]

export function computeBalanceExpectedAmount(totalPrice: number, depositAmount: number): number {
	return Math.max(0, Math.round((totalPrice - depositAmount) * 100) / 100)
}

export function isFullyCoveredByDeposit(depositAmount: number, totalPrice: number): boolean {
	if (totalPrice <= 0) return false
	return Math.round(depositAmount * 100) >= Math.round(totalPrice * 100)
}

export async function createBalancePayment(
	tx:            TransactionClient,
	reservationId: string,
	totalPrice:    number,
	depositAmount: number,
) {
	const expectedAmount = computeBalanceExpectedAmount(totalPrice, depositAmount)
	if (expectedAmount <= 0) return

	await tx.balancePayment.create({
		data: { reservationId, expectedAmount },
	})
}

export async function recreateBalancePayment(
	tx:            TransactionClient,
	reservationId: string,
	totalPrice:    number,
	depositAmount: number,
) {
	await tx.balancePayment.deleteMany({ where: { reservationId } })
	await createBalancePayment(tx, reservationId, totalPrice, depositAmount)
}

export function calculateUpdatedExpectedAmount(
	currentPaidAmount: number | null,
	totalPrice:        number,
	depositAmount:     number,
): number | null {
	if (currentPaidAmount !== null) return null
	return computeBalanceExpectedAmount(totalPrice, depositAmount)
}

export function isEditableReservationStatus(
	status:            string,
	hasBalancePayment: boolean,
): boolean {
	if (['PENDING', 'PAID', 'CONFIRMED'].includes(status)) return true
	return status === 'COMPLETED' && !hasBalancePayment
}
