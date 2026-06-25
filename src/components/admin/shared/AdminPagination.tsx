// src/components/admin/shared/AdminPagination.tsx
import Link from 'next/link'

interface Props {
	page:       number
	totalPages: number
	buildHref:  (page: number) => string
	maxButtons?: number
}

export default function AdminPagination({ page, totalPages, buildHref, maxButtons }: Props) {
	if (totalPages <= 1) return null

	const count = maxButtons ? Math.min(totalPages, maxButtons) : totalPages
	const pages = Array.from({ length: count }, (_, i) => i + 1)

	return (
		<div className="flex items-center justify-center gap-2">
			{pages.map((p) => (
				<Link
					key={p}
					href={buildHref(p)}
					className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-all
						${p === page
							? 'bg-brand-500 text-dark-950'
							: 'bg-dark-800 text-dark-400 hover:text-white hover:bg-dark-700'}`}
				>
					{p}
				</Link>
			))}
		</div>
	)
}
