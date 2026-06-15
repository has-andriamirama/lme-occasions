// src/components/admin/admins/AdminsClient.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Shield, ShieldCheck, Loader2, Eye, EyeOff } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface AdminUser {
  id: string; username: string; email: string; role: string;
  isActive: boolean; lastLoginAt: Date | null; createdAt: Date; mustChangePassword: boolean
}

interface Props {
  admins: AdminUser[]
  currentAdminId: string
}

const EMPTY_FORM = { username: '', email: '', password: '', role: 'ADMIN' }

export default function AdminsClient({ admins, currentAdminId }: Props) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [showPwd, setShowPwd]       = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch('/api/admins', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error ?? 'Erreur'); return }
      toast.success('Administrateur créé !')
      setShowCreate(false)
      setForm(EMPTY_FORM)
      router.refresh()
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admins/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) { toast.error(data.error); return }
      toast.success('Administrateur supprimé')
      setDeleteId(null)
      router.refresh()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Add button */}
      <button onClick={() => setShowCreate(true)} className="btn-primary">
        <Plus className="w-4 h-4" /> Ajouter un administrateur
      </button>

      {/* List */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700 text-xs text-dark-400 uppercase tracking-wider">
              <th className="text-left px-5 py-3 font-medium">Utilisateur</th>
              <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Rôle</th>
              <th className="text-left px-5 py-3 font-medium hidden md:table-cell">Dernière connexion</th>
              <th className="text-center px-5 py-3 font-medium w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800">
            {admins.map((a) => (
              <tr key={a.id} className="hover:bg-dark-800/30 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-black text-dark-950">
                      {a.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white flex items-center gap-2">
                        {a.username}
                        {a.id === currentAdminId && (
                          <span className="text-[10px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded">Vous</span>
                        )}
                        {a.mustChangePassword && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">MDP à changer</span>
                        )}
                      </p>
                      <p className="text-xs text-dark-400">{a.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 hidden sm:table-cell">
                  <span className={`flex items-center gap-1.5 text-xs font-medium w-fit ${
                    a.role === 'SUPER_ADMIN' ? 'text-brand-400' : 'text-dark-300'
                  }`}>
                    {a.role === 'SUPER_ADMIN'
                      ? <><ShieldCheck className="w-3.5 h-3.5" /> Super Admin</>
                      : <><Shield className="w-3.5 h-3.5" /> Admin</>}
                  </span>
                </td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <span className="text-xs text-dark-400">
                    {a.lastLoginAt ? formatDateTime(a.lastLoginAt) : 'Jamais'}
                  </span>
                </td>
                <td className="px-5 py-4 text-center">
                  {a.id !== currentAdminId && (
                    <button onClick={() => setDeleteId(a.id)}
                      className="p-1.5 text-dark-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-md shadow-card-lg animate-scale-in">
            <h3 className="font-display font-bold text-white text-lg mb-5">Nouvel administrateur</h3>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-sm text-red-400">{error}</div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">Identifiant</label>
                <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="john_doe" className="input-base" required minLength={3} />
              </div>
              <div>
                <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="john@example.com" className="input-base" required />
              </div>
              <div>
                <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">Mot de passe</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••" className="input-base pr-10" required minLength={8} />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-dark-500 mt-1">Min. 8 caractères, 1 majuscule, 1 chiffre, 1 caractère spécial</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-dark-300 uppercase tracking-wider block mb-1.5">Rôle</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-base">
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
                </button>
                <button type="button" onClick={() => { setShowCreate(false); setError('') }} className="btn-secondary flex-1">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 w-full max-w-sm shadow-card-lg animate-scale-in">
            <h3 className="font-display font-bold text-white text-lg mb-2">Supprimer cet admin ?</h3>
            <p className="text-sm text-dark-400 mb-6">Cette action est définitive.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)} disabled={loading} className="btn-danger flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Supprimer'}
              </button>
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
