// src/components/admin/shared/ActionIconButton.tsx
import Link from 'next/link'

type Variant = 'default' | 'edit' | 'danger' | 'warning' | 'success'

const hoverCls: Record<Variant, string> = {
	default: 'hover:text-white hover:bg-dark-700',
	edit:    'hover:text-brand-400 hover:bg-dark-700',
	danger:  'hover:text-red-400 hover:bg-red-500/10',
	warning: 'hover:text-amber-400 hover:bg-amber-500/10',
	success: 'hover:text-emerald-400 hover:bg-dark-700',
}

const BASE     = 'p-1.5 rounded-lg transition-all text-dark-400'
const DISABLED = 'p-1.5 rounded-lg text-dark-600 cursor-not-allowed'

interface CommonProps {
	variant?:  Variant
	title?:    string
	children:  React.ReactNode
	extraCls?: string
}

interface AsButton extends CommonProps {
	as:        'button'
	onClick?:  () => void
	disabled?: boolean
	disabledCls?: string
}

interface AsLink extends CommonProps {
	as:      'link'
	href:    string
	target?: string
}

export type ActionIconButtonProps = AsButton | AsLink

export default function ActionIconButton(props: ActionIconButtonProps) {
	const { variant = 'default', title, children, extraCls = '' } = props

	if (props.as === 'link') {
		return (
			<Link
				href={props.href}
				target={props.target}
				title={title}
				className={`${BASE} ${hoverCls[variant]} ${extraCls}`}
			>
				{children}
			</Link>
		)
	}

	if (props.disabled) {
		return (
			<button disabled title={title} className={`${DISABLED} ${extraCls}`}>
				{children}
			</button>
		)
	}

	return (
		<button
			onClick={props.onClick}
			title={title}
			className={`${BASE} ${hoverCls[variant]} ${props.disabledCls ?? ''} ${extraCls}`}
		>
			{children}
		</button>
	)
}
