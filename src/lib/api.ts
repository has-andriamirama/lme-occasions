// src/lib/api.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function requireSession() {
	const session = await getServerSession(authOptions)
	return session?.user ? session : null
}

export async function requireSuperAdmin() {
	const session = await getServerSession(authOptions)
	if (!session?.user)                    return null
	if (session.user.role !== 'SUPER_ADMIN') return null
	return session
}

// ── Responses ─────────────────────────────────────────────────────────────────

export function apiError(message: string, status = 500) {
	return NextResponse.json({ success: false, error: message }, { status })
}

export function validationError(details: unknown) {
	return NextResponse.json(
		{ success: false, error: 'Données invalides', details },
		{ status: 400 }
	)
}

// ── Pagination ────────────────────────────────────────────────────────────────

interface PaginationOptions {
	defaultLimit?: number
	maxLimit?:     number
}

export function parsePagination(
	searchParams: URLSearchParams,
	{ defaultLimit = 12, maxLimit = 24 }: PaginationOptions = {}
) {
	const page  = Math.max(1, Number(searchParams.get('page') ?? 1))
	const limit = Math.min(maxLimit, Math.max(1, Number(searchParams.get('limit') ?? defaultLimit)))
	const skip  = (page - 1) * limit
	return { page, limit, skip }
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export function createAuditLog(
	adminId:  string,
	action:   string,
	entity:   string,
	entityId: string,
	details?: Record<string, unknown>
) {
	return prisma.auditLog.create({
		data: { adminId, action, entity, entityId, ...(details ? { details } : {}) },
	})
}

// ── Pusher ────────────────────────────────────────────────────────────────────

export async function safePusher<T>(
	fn:      () => Promise<T>,
	context: string
): Promise<T | undefined> {
	try {
		return await fn()
	} catch (err) {
		console.error(`[${context}] Pusher broadcast échoué (non-critique) :`, err)
		return undefined
	}
}
