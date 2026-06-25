// src/components/admin/shared/AdminPageHeader.tsx
interface Props {
	title:     string
	subtitle?: string
	action?:   React.ReactNode
}

export default function AdminPageHeader({ title, subtitle, action }: Props) {
	return (
		<div className="flex items-center justify-between gap-4">
			<div>
				<h1 className="text-2xl font-display font-bold text-white">{title}</h1>
				{subtitle && (
					<p className="text-dark-400 text-sm mt-0.5">{subtitle}</p>
				)}
			</div>
			{action}
		</div>
	)
}
