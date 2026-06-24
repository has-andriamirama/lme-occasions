// src/components/admin/settings/ChangePasswordButton.tsx
'use client'
import { useState } from 'react'
import ChangePasswordForm from './ChangePasswordForm'

export default function ChangePasswordButton() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<button onClick={() => setOpen(true)} className="btn-secondary text-xs px-4 py-2 shrink-0">
				Changer le mot de passe
			</button>
			<ChangePasswordForm open={open} onClose={() => setOpen(false)} />
		</>
	)
}
