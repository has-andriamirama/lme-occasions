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

export interface InstallmentLike {
	id?:               string
	installmentNumber: number
	paidAmount:        number | null
}

export function getLastPaidInstallmentNumber(installments: InstallmentLike[]): number {
	return installments.reduce(
		(max, i) => (i.paidAmount !== null ? Math.max(max, i.installmentNumber) : max),
		0,
	)
}

export interface InstallmentPermissions {
	isPaid: boolean
	isLastPaid: boolean
	isNextPayable: boolean
	canEnterOrEdit: boolean
	canReset: boolean
}

export function getInstallmentPermissions(
	installment:  InstallmentLike,
	installments: InstallmentLike[],
): InstallmentPermissions {
	const lastPaidNumber = getLastPaidInstallmentNumber(installments)
	const isPaid          = installment.paidAmount !== null
	const isLastPaid       = isPaid && installment.installmentNumber === lastPaidNumber
	const isNextPayable    = !isPaid && installment.installmentNumber === lastPaidNumber + 1

	return {
		isPaid,
		isLastPaid,
		isNextPayable,
		canEnterOrEdit: isLastPaid || isNextPayable,
		canReset:       isLastPaid,
	}
}

export function isFinalInstallment(
	installment: { installmentNumber: number },
	totalCount:  number,
): boolean {
	return installment.installmentNumber === totalCount
}

export function computeMaxAllowedForInstallment(
	targetId:      string | undefined,
	installments:  InstallmentLike[],
	totalPrice:    number,
	depositAmount: number,
): number {
	const othersPaid = installments
		.filter((i) => i.id !== targetId)
		.reduce((sum, i) => sum + (i.paidAmount ?? 0), 0)

	return Math.max(0, Math.round((totalPrice - depositAmount - othersPaid) * 100) / 100)
}

export function isFullyCoveredByDeposit(depositAmount: number, totalPrice: number): boolean {
	if (totalPrice <= 0) return false
	return Math.round(depositAmount * 100) >= Math.round(totalPrice * 100)
}

export function isEditableReservationStatus(
	status:            string,
	installmentsCount: number,
): boolean {
	if (['PENDING', 'PAID', 'CONFIRMED'].includes(status)) return true
	return status === 'COMPLETED' && installmentsCount === 0
}
