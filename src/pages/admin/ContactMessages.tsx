// src/pages/admin/ContactMessages.tsx
import { useState, useEffect } from 'react'
import { api, Contact } from '../../lib/api'
import { Mail, Phone, Loader2, User } from 'lucide-react'

export default function ContactMessages() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getContacts().then(setContacts).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-forest">Contact Messages</h1>
        <p className="text-forest/50 text-sm">{contacts.length} message{contacts.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="animate-spin text-forest" size={28} /></div>
      ) : contacts.length === 0 ? (
        <div className="card text-center py-16 text-forest/30">No messages yet</div>
      ) : (
        <div className="space-y-3">
          {contacts.map(c => (
            <div key={c.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-forest/10 rounded-full flex items-center justify-center shrink-0">
                    <User size={16} className="text-forest" />
                  </div>
                  <div>
                    <div className="font-semibold text-forest">{c.name}</div>
                    <div className="flex flex-wrap gap-3 mt-1 text-sm text-forest/50">
                      {c.email && <span className="flex items-center gap-1"><Mail size={12} />{c.email}</span>}
                      {c.phone && <span className="flex items-center gap-1"><Phone size={12} />{c.phone}</span>}
                    </div>
                    <p className="mt-2 text-sm text-forest/70 leading-relaxed">{c.message}</p>
                  </div>
                </div>
                <div className="text-xs text-forest/30 shrink-0 whitespace-nowrap">
                  {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
