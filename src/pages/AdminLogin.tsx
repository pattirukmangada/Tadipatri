// src/pages/AdminLogin.tsx
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Lock, User, Loader2 } from 'lucide-react'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.login(form.username, form.password)
      navigate('/admin')
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-forest flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-lemon rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="font-display font-bold text-forest-dark text-2xl">N</span>
          </div>
          <h1 className="font-display text-white text-2xl font-bold">NKV Admin</h1>
          <p className="text-white/40 text-sm mt-1">Bombay Lemon Traders</p>
          <p className="text-white/40 text-sm mt-1">Agriculture Market Yard, Tadipatri, Andhra Pradesh</p>
        </div>

        <div className="bg-white rounded-2xl p-7 shadow-2xl">
          <h2 className="font-display font-bold text-forest text-xl mb-5">Sign In</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest/30" />
                <input
                  className="input pl-9"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  required
                  placeholder="admin"
                  autoComplete="username"
                />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest/30" />
                <input
                  className="input pl-9"
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><Lock size={16} /> Sign In</>}
            </button>
          </form>
          <div className="mt-3 text-center">
            <Link
              to="/"
              className="inline-block text-sm text-forest font-medium hover:underline"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
