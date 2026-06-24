// src/middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
	function middleware(req) {
		const { pathname } = req.nextUrl
		const token = req.nextauth.token

		if (pathname === '/login' && token) {
			return NextResponse.redirect(new URL('/admin/dashboard', req.url))
		}

		if (
			token?.mustChangePassword &&
			pathname.startsWith('/admin') &&
			pathname !== '/admin/dashboard'
		) {
			return NextResponse.redirect(
				new URL('/admin/dashboard', req.url)
			)
		}

		const superAdminRoutes = ['/admin/admins']
		if (superAdminRoutes.some((r) => pathname.startsWith(r))) {
			if (token?.role !== 'SUPER_ADMIN') {
				return NextResponse.redirect(new URL('/admin/dashboard', req.url))
			}
		}

		return NextResponse.next()
	},
	{
		callbacks: {
			authorized: ({ token, req }) => {
				const { pathname } = req.nextUrl
				if (pathname.startsWith('/admin')) {
					return !!token
				}
				return true
			},
		},
	}
)

export const config = {
	matcher: ['/admin/:path*', '/login'],
}
