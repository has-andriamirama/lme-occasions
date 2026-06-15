// src/components/admin/contacts/ContactItem.tsx
'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp, Mail, Phone, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Contact {
  id: string; name: string; email: string; phone?: string | null;
  subject?: string | null; message: string; isRead: boolean; createdAt: Date
}

export default function ContactItem({ contact }: { contact: Contact }) {
  const router  = useRouter()
  const [open, setOpen]       = useState(!contact.isRead)
  const [read, setRead]       = useState(contact.isRead)
  const [marking, setMarking] = useState(false)

  async function markRead() {
    if (read) return
    setMarking(true)
    try {
      const res  = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ isRead: true }),
      })
      const data = await res.json()
      if (data.success) { setRead(true); router.refresh() }
    } catch {
      toast.error('Erreur')
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className={`card overflow-hidden transition-all duration-200 ${!read ? 'border-brand-500/20 bg-brand-500/[0.02]' : ''}`}>
      {/* Header */}
      <button
        onClick={() => { setOpen((v) => !v); if (!read) markRead() }}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-dark-700/30 transition-colors"
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-dark-700 flex items-center justify-center shrink-0 text-sm font-bold text-brand-400">
          {contact.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">{contact.name}</p>
            {!read && <span className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />}
          </div>
          <p className="text-xs text-dark-400 truncate">
            {contact.subject ?? contact.message.slice(0, 60)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-dark-500">{formatDateTime(contact.createdAt)}</p>
          {open ? <ChevronUp className="w-4 h-4 text-dark-500 mt-1 ml-auto" /> : <ChevronDown className="w-4 h-4 text-dark-500 mt-1 ml-auto" />}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="px-5 pb-5 border-t border-dark-700/50">
          <div className="flex flex-wrap gap-3 mt-4 mb-3">
            <a href={`mailto:${contact.email}`}
              className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors">
              <Mail className="w-3.5 h-3.5" />{contact.email}
            </a>
            {contact.phone && (
              <a href={`tel:${contact.phone}`}
                className="flex items-center gap-1.5 text-xs text-dark-400 hover:text-white transition-colors">
                <Phone className="w-3.5 h-3.5" />{contact.phone}
              </a>
            )}
          </div>
          {contact.subject && (
            <p className="text-xs text-dark-500 mb-2 font-medium">Sujet : {contact.subject}</p>
          )}
          <div className="bg-dark-900/60 rounded-lg p-4 text-sm text-dark-300 whitespace-pre-wrap leading-relaxed">
            {contact.message}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <a href={`mailto:${contact.email}?subject=Re: ${contact.subject ?? 'Votre message'}`}
              className="btn-primary text-xs px-4 py-2">
              Répondre
            </a>
            {!read && (
              <button onClick={markRead} disabled={marking}
                className="btn-ghost text-xs px-4 py-2 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />Marquer lu
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
