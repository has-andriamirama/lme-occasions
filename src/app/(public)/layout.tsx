// src/app/(public)/layout.tsx
import PublicNavbar     from '@/components/public/layout/PublicNavbar'
import PublicFooter     from '@/components/public/layout/PublicFooter'
import NewsletterPopup  from '@/components/public/layout/NewsletterPopup'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNavbar />
      <main className="min-h-screen">
        {children}
      </main>
      <PublicFooter />
      <NewsletterPopup />
    </>
  )
}
