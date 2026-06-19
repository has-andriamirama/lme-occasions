// src/components/providers.tsx
'use client'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
	return (
		<SessionProvider>
			{children}
			<Toaster
				position="top-right"
				toastOptions={{
					duration: 4000,
					style: {
						background: '#1A1A22',
						color: '#F0F0F2',
						border: '1px solid rgba(255,255,255,0.08)',
						borderRadius: '10px',
						fontFamily: 'var(--font-outfit)',
						fontSize: '14px',
					},
					success: { iconTheme: { primary: '#D4AF37', secondary: '#0A0A0B' } },
					error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
				}}
			/>
		</SessionProvider>
	)
}
