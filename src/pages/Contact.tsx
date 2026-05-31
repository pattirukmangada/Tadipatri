// src/pages/Contact.tsx
import { useState } from 'react'
import { api } from '../lib/api'
import { Phone, MapPin, Clock, Send, CheckCircle } from 'lucide-react'
import { content } from 'html2canvas/dist/types/css/property-descriptors/content'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.submitContact(form)
      setSent(true)
      setForm({ name: '', email: '', phone: '', message: '' })
    } catch (err: any) {
      setError(err.message || 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-14">
      <h1 className="text-4xl font-display font-bold text-forest mb-2">Contact Us</h1>
      <p className="text-forest/50 mb-10">Get in touch with NKV Bombay Lemon Traders</p>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Info */}
        <div className="space-y-4">
          {[
            { icon: Phone, title: 'Phone', content: '+91 7013285158',content2: '+91 7893287215',content3: '+91 8639826163', sub: 'Call Any Time, 6AM–9PM' },
            { icon: MapPin, title: 'Address', content: 'Agriculture Market Yard, Tadipatri, Andhra Pradesh', sub: 'Andhra Pradesh' },
            { icon: Clock, title: 'Hours', content: 'Monday – Saturday', sub: '6:00 AM – 9:00 PM' },
          ].map(({ icon: Icon, title, content, content2, content3, sub }) => (
            <div key={title} className="card flex items-start gap-4">
              <div className="w-10 h-10 bg-forest rounded-lg flex items-center justify-center shrink-0">
                <Icon size={18} className="text-lemon" />
              </div>
              <div>
                <div className="font-semibold text-forest">{title}</div>
                <div className="text-sm text-forest/70 mt-0.5">{content}</div>
                <div className="text-sm text-forest/70 mt-0.5">{content2}</div>
                <div className="text-sm text-forest/70 mt-0.5">{content3}</div>
                <div className="text-xs text-forest/40">{sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="card">
          {sent ? (
            <div className="text-center py-8">
              <CheckCircle className="text-green-500 mx-auto mb-3" size={40} />
              <h3 className="font-semibold text-forest text-lg mb-1">Message Sent!</h3>
              <p className="text-forest/50 text-sm">We'll get back to you soon.</p>
              <button onClick={() => setSent(false)} className="mt-4 btn-ghost text-sm">Send Another</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="font-display font-bold text-xl text-forest mb-4">Send a Message</h2>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">{error}</div>}
              <div>
                <label className="label">Name *</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Your name" />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="your@email.com" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Your phone number" />
              </div>
              <div>
                <label className="label">Message *</label>
                <textarea className="input min-h-[100px] resize-none" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required placeholder="How can we help?" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                {loading ? 'Sending...' : <><Send size={16} /> Send Message</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
