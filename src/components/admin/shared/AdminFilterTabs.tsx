// src/components/admin/shared/AdminFilterTabs.tsx
import Link from 'next/link'

export interface FilterTab {
	label:  string
	href:   string
	active: boolean
}

interface Props {
	tabs: FilterTab[]
}

export default function AdminFilterTabs({ tabs }: Props) {
	return (
		<div className="flex flex-wrap gap-2">
			{tabs.map(({ label, href, active }) => (
				<Link
					key={href}
					href={href}
					className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border
						${active
							? 'bg-brand-500/10 text-brand-400 border-brand-500/30'
							: 'bg-dark-800 text-dark-400 border-dark-700 hover:text-white hover:border-dark-600'}`}
				>
					{label}
				</Link>
			))}
		</div>
	)
}
