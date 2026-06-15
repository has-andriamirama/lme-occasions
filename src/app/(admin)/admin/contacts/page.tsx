// src/app/(admin)/admin/contacts/page.tsx
import type { Metadata } from 'next'
import prisma from '@/lib/db'
import { formatDateTime } from '@/lib/utils'
import ContactItem from '@/components/admin/contacts/ContactItem'
import Link from 'next/link'

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
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Messages</h1>
          <p className="text-dark-400 text-sm mt-0.5">
            {unreadCount} non lu{unreadCount !== 1 ? 's' : ''} · {total} total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { label: 'Tous',      href: '/admin/contacts' },
          { label: 'Non lus',   href: '/admin/contacts?read=false' },
          { label: 'Lus',       href: '/admin/contacts?read=true' },
        ].map(({ label, href }) => {
          const active = (filter === undefined && href === '/admin/contacts') ||
                         (filter === 'false' && href.includes('false')) ||
                         (filter === 'true'  && href.includes('true'))
          return (
            <Link key={href} href={href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border
                ${active
                  ? 'bg-brand-500/10 text-brand-400 border-brand-500/30'
                  : 'bg-dark-800 text-dark-400 border-dark-700 hover:text-white hover:border-dark-600'}`}>
              {label}
            </Link>
          )
        })}
      </div>

      {/* List */}
      <div className="space-y-2">
        {contacts.length === 0 ? (
          <div className="card py-16 text-center text-dark-400">Aucun message</div>
        ) : contacts.map((c) => (
          <ContactItem key={c.id} contact={c} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={`/admin/contacts?page=${p}${filter ? `&read=${filter}` : ''}`}
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
