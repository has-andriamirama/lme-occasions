// src/middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token

    // Redirect to change-password if mustChangePassword
    if (
      token?.mustChangePassword &&
      pathname.startsWith('/admin') &&
      !pathname.startsWith('/admin/settings/change-password')
    ) {
      return NextResponse.redirect(
        new URL('/admin/settings/change-password', req.url)
      )
    }

    // Super admin only routes
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
  matcher: ['/admin/:path*'],
}
