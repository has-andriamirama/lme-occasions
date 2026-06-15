// src/app/login/page.tsx
'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        username: username.trim(),
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        router.push('/admin/dashboard')
        router.refresh()
      }
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-700/5 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-block">
            <div className="text-3xl font-display font-black tracking-widest text-brand-gradient mb-1">
              LME OCCASIONS
            </div>
            <div className="text-xs text-dark-400 tracking-[0.3em] uppercase font-medium">Administration</div>
          </div>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-card-lg">
          <h1 className="text-xl font-display font-bold text-white mb-6">Connexion administrateur</h1>

          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="text-sm font-medium text-dark-300 mb-2 block">
                Identifiant
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className={cn('input-base pl-10', error && 'border-red-500/50')}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-dark-300 mb-2 block">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={cn('input-base pl-10 pr-10', error && 'border-red-500/50')}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-dark-900/30 border-t-dark-900 rounded-full animate-spin" />
                  Connexion…
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        </div>

        {/* Security note */}
        <p className="text-center text-xs text-dark-500 mt-6">
          Accès réservé aux administrateurs · Connexion sécurisée SSL
        </p>
      </div>
    </div>
  )
}
