// src/app/(admin)/admin/settings/audit/page.tsx
import type { Metadata } from 'next'
import prisma from '@/lib/db'
import { formatDateTime } from '@/lib/utils'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Journal d\'audit' }

const ACTION_COLORS: Record<string, string> = {
	CREATE:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
	UPDATE:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
	DELETE:   'bg-red-500/10 text-red-400 border-red-500/20',
	CONFIRM:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
	COMPLETE: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
	CANCEL:   'bg-dark-600/30 text-dark-400 border-dark-600/20',
}

export default async function AuditPage({ searchParams }: { searchParams: { page?: string } }) {
	const page  = Math.max(1, Number(searchParams.page ?? 1))
	const limit = 30

	const [logs, total] = await Promise.all([
		prisma.auditLog.findMany({
			include: { admin: { select: { username: true } } },
			orderBy: { createdAt: 'desc' },
			skip:    (page - 1) * limit,
			take:    limit,
		}),
		prisma.auditLog.count(),
	])
	const totalPages = Math.ceil(total / limit)

	return (
		<div className="space-y-6 min-w-0">
			<div className="flex items-center gap-3">
				<Link href="/admin/settings" className="btn-ghost p-2"><ChevronLeft className="w-5 h-5" /></Link>
				<div>
					<h1 className="text-2xl font-display font-bold text-white">Journal d'audit</h1>
					<p className="text-dark-400 text-sm mt-0.5">{total} action{total !== 1 ? 's' : ''} enregistrée{total !== 1 ? 's' : ''}</p>
				</div>
			</div>

			<div className="card overflow-hidden">
				<table className="w-full">
					<thead>
						<tr className="border-b border-dark-700 text-xs text-dark-400 uppercase tracking-wider">
							<th className="text-left px-4 py-3 font-medium">Admin</th>
							<th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Action</th>
							<th className="text-left px-4 py-3 font-medium">Entité</th>
							<th className="text-right px-4 py-3 font-medium hidden md:table-cell">Date</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-dark-800">
						{logs.map((log) => (
							<tr key={log.id} className="hover:bg-dark-800/30 transition-colors text-sm">
								<td className="px-4 py-3">
									<span className="text-white font-medium">{log.admin?.username ?? 'Système'}</span>
								</td>
								<td className="px-4 py-3 hidden sm:table-cell">
									<span className={`badge ${ACTION_COLORS[log.action] ?? ACTION_COLORS.UPDATE}`}>
										{log.action}
									</span>
								</td>
								<td className="px-4 py-3">
									<span className="text-dark-300">{log.entity}</span>
									{log.entityId && (
										<span className="text-dark-600 text-xs ml-1">#{log.entityId.slice(-6)}</span>
									)}
								</td>
								<td className="px-4 py-3 text-right hidden md:table-cell">
									<span className="text-dark-400 text-xs">{formatDateTime(log.createdAt)}</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{totalPages > 1 && (
				<div className="flex items-center justify-center gap-2">
					{Array.from({ length: Math.min(totalPages, 8) }, (_, i) => i + 1).map((p) => (
						<Link key={p} href={`/admin/settings/audit?page=${p}`}
							className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all
								${p === page ? 'bg-brand-500 text-dark-950' : 'bg-dark-800 text-dark-400 hover:text-white'}`}>
							{p}
						</Link>
					))}
				</div>
			)}
		</div>
	)
}
