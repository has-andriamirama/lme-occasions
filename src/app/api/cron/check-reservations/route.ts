// src/app/api/cron/check-reservations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { broadcastCarUpdated, broadcastReservationUpdated } from '@/lib/pusher'
import {
	sendReservationExpiredToAdmin,
	sendReservationExpiredToClient,
} from '@/lib/mail'

export async function GET(req: NextRequest) {
	const authHeader = req.headers.get('authorization')
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	try {
		const now = new Date()

		const expired = await prisma.reservation.findMany({
			where: {
				status: 'PAID',
				expiresAt: { lte: now },
				expiredEmailSent: false,
			},
			include: { car: true },
		})

		let processed = 0

		for (const reservation of expired) {
			try {
				await prisma.$transaction(async (tx) => {
					await tx.reservation.update({
						where: { id: reservation.id },
						data: {
							status: 'EXPIRED',
							expiredAt: now,
							expiredEmailSent: true,
						},
					})

					await tx.car.updateMany({
						where: { id: reservation.carId, status: 'RESERVED' },
						data:  { status: 'AVAILABLE' },
					})
				})

				await broadcastCarUpdated({
					id:     reservation.carId,
					status: 'AVAILABLE',
					title:  reservation.car.title,
				}).catch(console.error)

				await broadcastReservationUpdated({
					id:              reservation.id,
					carId:           reservation.carId,
					clientName:      reservation.clientName,
					clientEmail:     reservation.clientEmail,
					clientPhone:     reservation.clientPhone,
					depositAmount:   reservation.depositAmount,
					totalPrice:      reservation.totalPrice,
					installmentType: reservation.installmentType,
					status:          'EXPIRED',
					reservedAt:      reservation.reservedAt,
					expiresAt:       reservation.expiresAt,
					paidAt:          reservation.paidAt,
					expiredAt:       now,
					notes:           reservation.notes,
				}).catch(console.error)

				await Promise.all([
					sendReservationExpiredToClient({
						clientName:    reservation.clientName,
						clientEmail:   reservation.clientEmail,
						carTitle:      reservation.car.title,
						depositAmount: reservation.depositAmount,
					}),
					sendReservationExpiredToAdmin({
						clientName:    reservation.clientName,
						clientEmail:   reservation.clientEmail,
						carTitle:      reservation.car.title,
						reservationId: reservation.id,
					}),
				]).catch(console.error)

				processed++
			} catch (err) {
				console.error(`[Cron] Failed to expire reservation ${reservation.id}:`, err)
			}
		}

		const summary = { checked: expired.length, processed, timestamp: now.toISOString() }
		console.log('[Cron] check-reservations:', summary)
		return NextResponse.json({ success: true, ...summary })
	} catch (err) {
		console.error('[Cron] Fatal error:', err)
		return NextResponse.json({ success: false, error: 'Cron error' }, { status: 500 })
	}
}
