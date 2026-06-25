// src/app/(admin)/admin/contacts/page.tsx
import type { Metadata } from 'next'
import prisma from '@/lib/db'
import ContactItem from '@/components/admin/contacts/ContactItem'
import AdminPageHeader from '@/components/admin/shared/AdminPageHeader'
import AdminFilterTabs from '@/components/admin/shared/AdminFilterTabs'
import AdminPagination from '@/components/admin/shared/AdminPagination'

export const metadata: Metadata = { title: 'Messages' }

export default async function ContactsPage({
	searchParams,
}: {
	searchParams: { read?: string; page?: string }
}) {
	const page   = Math.max(1, Number(searchParams.page ?? 1))
	const limit  = 20
	const filter = searchParams.read

	const where: Record<string, unknown> = {}
	if (filter === 'true')  where.isRead = true
	if (filter === 'false') where.isRead = false

	const [contacts, total, unreadCount] = await Promise.all([
		prisma.contact.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			skip:    (page - 1) * limit,
			take:    limit,
		}),
		prisma.contact.count({ where }),
		prisma.contact.count({ where: { isRead: false } }),
	])
	const totalPages = Math.ceil(total / limit)

	return (
		<div className="space-y-6 min-w-0">
			<AdminPageHeader
				title="Messages"
				subtitle={`${unreadCount} non lu${unreadCount !== 1 ? 's' : ''} · ${total} total`}
			/>

			<AdminFilterTabs tabs={[
				{ label: 'Tous',    href: '/admin/contacts',            active: filter === undefined },
				{ label: 'Non lus', href: '/admin/contacts?read=false', active: filter === 'false' },
				{ label: 'Lus',     href: '/admin/contacts?read=true',  active: filter === 'true' },
			]} />

			<div className="space-y-2">
				{contacts.length === 0 ? (
					<div className="card py-16 text-center text-dark-400">Aucun message</div>
				) : contacts.map((c) => (
					<ContactItem key={c.id} contact={c} />
				))}
			</div>

			<AdminPagination
				page={page}
				totalPages={totalPages}
				buildHref={(p) => `/admin/contacts?page=${p}${filter ? `&read=${filter}` : ''}`}
			/>
		</div>
	)
}
