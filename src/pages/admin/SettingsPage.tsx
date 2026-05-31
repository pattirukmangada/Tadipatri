import { useState, useEffect } from 'react'
import { api, Settings } from '../../lib/api'
import { Save, Loader2, CheckCircle, KeyRound, Eye, EyeOff } from 'lucide-react'

export default function SettingsPage() {
  // ── Company settings ─────────────────────────────────────────────────
  const [form, setForm] = useState<Settings>({
    company_name: '', phone: '', address: '',
    commission_rate: 100, cooli_per_bag: 0, chariti_per_bag: 0,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.getSettings().then(s => setForm(s)).finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSaved(false)
    try {
      await api.updateSettings(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // ── Change credentials ───────────────────────────────────────────────
  const [creds, setCreds] = useState({
    current_password: '', new_username: '', new_password: '', confirm_password: '',
  })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [credSaving, setCredSaving]   = useState(false)
  const [credSaved, setCredSaved]     = useState(false)
  const [credError, setCredError]     = useState('')

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setCredSaving(true); setCredError(''); setCredSaved(false)

    if (!creds.new_username && !creds.new_password) {
      setCredError('Enter a new username or new password to update.')
      setCredSaving(false); return
    }
    if (creds.new_password && creds.new_password !== creds.confirm_password) {
      setCredError('New password and confirm password do not match.')
      setCredSaving(false); return
    }
    if (creds.new_password && creds.new_password.length < 6) {
      setCredError('New password must be at least 6 characters.')
      setCredSaving(false); return
    }

    try {
      await api.changePassword({
        current_password: creds.current_password,
        new_username:     creds.new_username     || undefined,
        new_password:     creds.new_password     || undefined,
        confirm_password: creds.confirm_password || undefined,
      })
      setCredSaved(true)
      setCreds({ current_password: '', new_username: '', new_password: '', confirm_password: '' })
      setTimeout(() => setCredSaved(false), 3000)
    } catch (err: any) {
      setCredError(err.message || 'Failed to update credentials')
    } finally {
      setCredSaving(false)
    }
  }

  // helper: display 0 as empty in number inputs
  const n = (v: number) => v === 0 ? '' : v

  if (loading) return (
    <div className="flex justify-center py-24">
      <Loader2 className="animate-spin text-forest" size={28} />
    </div>
  )

  return (
    <div className="max-w-xl animate-fade-in space-y-8">

      <div>
        <h1 className="text-2xl font-display font-bold text-forest">Settings</h1>
        <p className="text-forest/50 text-sm">Company configuration, billing rates and login credentials</p>
      </div>

      {/* ── Company & Billing settings ── */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle size={16} /> Settings saved successfully!
          </div>
        )}

        <div className="card space-y-4">
          <h3 className="font-semibold text-forest">Company Details</h3>
          <div>
            <label className="label">Company Name</label>
            <input
              className="input"
              value={form.company_name}
              onChange={e => setForm({ ...form, company_name: e.target.value })}
              required placeholder="Company Name"
            />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input
              className="input"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              required placeholder="Phone Number"
            />
          </div>
          <div>
            <label className="label">Address</label>
            <textarea
              className="input min-h-[80px] resize-none"
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              required placeholder="Address"
            />
          </div>
        </div>

        <div className="card space-y-4">
          <h3 className="font-semibold text-forest">Billing Rates</h3>

          <div>
            <label className="label">Commission Rate (₹ per ₹1000)</label>
            <input
              className="input"
              type="number" min={0} step="0.01"
              value={n(form.commission_rate)}
              onChange={e => setForm({ ...form, commission_rate: Number(e.target.value) || 0 })}
              placeholder="e.g. 100"
            />
            <p className="text-xs text-forest/40 mt-1">Commission = floor(Gross × rate ÷ 1000)</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cooli per Bag (₹)</label>
              <input
                className="input"
                type="number" min={0} step="0.01"
                value={n(form.cooli_per_bag)}
                onChange={e => setForm({ ...form, cooli_per_bag: Number(e.target.value) || 0 })}
                placeholder="e.g. 5"
              />
              <p className="text-xs text-forest/40 mt-1">Auto-filled in bill form</p>
            </div>
            <div>
              <label className="label">Chariti per Bag (₹)</label>
              <input
                className="input"
                type="number" min={0} step="0.01"
                value={n(form.chariti_per_bag)}
                onChange={e => setForm({ ...form, chariti_per_bag: Number(e.target.value) || 0 })}
                placeholder="e.g. 5"
              />
              <p className="text-xs text-forest/40 mt-1">Auto-filled in bill form</p>
            </div>
          </div>
        </div>

        <div className="card bg-forest/5 text-sm text-forest/60 space-y-1">
          <div className="font-medium text-forest mb-2">Formula Preview</div>
          <div>Commission = floor(Gross × {form.commission_rate} ÷ 1000)</div>
          <div>Cooli = Bags × ₹{form.cooli_per_bag} &nbsp;(editable per bill)</div>
          <div>Chariti = Bags × ₹{form.chariti_per_bag} &nbsp;(editable per bill)</div>
          <div>Transport = flat amount per bill</div>
          <div>Net = Gross − Commission − Cooli − Chariti − Transport</div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-3">
          {saving
            ? <Loader2 className="animate-spin" size={18} />
            : <><Save size={16} /> Save Settings</>}
        </button>
      </form>

      {/* ── Change credentials ── */}
      <form onSubmit={handleCredentials} className="space-y-5">
        {credError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">{credError}</div>
        )}
        {credSaved && (
          <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle size={16} /> Login credentials updated!
          </div>
        )}

        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-forest" />
            <h3 className="font-semibold text-forest">Change Login Credentials</h3>
          </div>
          <p className="text-xs text-forest/50">
            Fill only the fields you want to change. Current password is always required.
          </p>

          <div>
            <label className="label">Current Password <span className="text-red-400">*</span></label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showCurrent ? 'text' : 'password'}
                value={creds.current_password}
                onChange={e => setCreds({ ...creds, current_password: e.target.value })}
                required placeholder="Enter current password"
              />
              <button type="button" tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/40 hover:text-forest"
                onClick={() => setShowCurrent(v => !v)}>
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="label">New Username <span className="text-forest/40 text-xs">(optional)</span></label>
            <input
              className="input" type="text"
              value={creds.new_username}
              onChange={e => setCreds({ ...creds, new_username: e.target.value })}
              placeholder="Leave blank to keep current" autoComplete="off"
            />
          </div>

          <div>
            <label className="label">New Password <span className="text-forest/40 text-xs">(optional, min 6 chars)</span></label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showNew ? 'text' : 'password'}
                value={creds.new_password}
                onChange={e => setCreds({ ...creds, new_password: e.target.value })}
                placeholder="Leave blank to keep current" autoComplete="new-password"
              />
              <button type="button" tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/40 hover:text-forest"
                onClick={() => setShowNew(v => !v)}>
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {creds.new_password && (
            <div>
              <label className="label">Confirm New Password</label>
              <div className="relative">
                <input
                  className={`input pr-10 ${
                    creds.confirm_password && creds.confirm_password !== creds.new_password
                      ? 'border-red-300 focus:ring-red-200'
                      : creds.confirm_password && creds.confirm_password === creds.new_password
                      ? 'border-green-300 focus:ring-green-200'
                      : ''
                  }`}
                  type={showConfirm ? 'text' : 'password'}
                  value={creds.confirm_password}
                  onChange={e => setCreds({ ...creds, confirm_password: e.target.value })}
                  placeholder="Re-enter new password" autoComplete="new-password"
                />
                <button type="button" tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-forest/40 hover:text-forest"
                  onClick={() => setShowConfirm(v => !v)}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {creds.confirm_password && creds.confirm_password !== creds.new_password && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
              {creds.confirm_password && creds.confirm_password === creds.new_password && (
                <p className="text-xs text-green-600 mt-1">Passwords match ✓</p>
              )}
            </div>
          )}
        </div>

        <button type="submit" disabled={credSaving} className="btn-primary w-full justify-center py-3">
          {credSaving
            ? <Loader2 className="animate-spin" size={18} />
            : <><KeyRound size={16} /> Update Credentials</>}
        </button>
      </form>
    </div>
  )
}