// src/pages/admin/BuyerLedger.tsx
import { useState, useEffect, useCallback } from 'react'
import { api, BuyerLedgerEntry, BuyerPayment, formatCurrency } from '../../lib/api'
import {
  Loader2, Plus, Trash2, Edit2, Check, X,
  TrendingDown, TrendingUp, Scale,
} from 'lucide-react'

function fmtDate(d?: string): string {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}-${m}-${y}`
}

interface PaymentForm {
  id?: number
  buyer_name: string
  date: string
  credit_amount: string
  hamali: string
  description: string
}

const emptyForm = (buyer = '', today = ''): PaymentForm => ({
  buyer_name: buyer,
  date: today,
  credit_amount: '',
  hamali: '',
  description: '',
})

export default function BuyerLedger() {
  const today = new Date().toISOString().split('T')[0]

  // Filters
  const [buyer, setBuyer]   = useState('')
  const [from,  setFrom]    = useState('')
  const [to,    setTo]      = useState('')
  const [buyers, setBuyers] = useState<string[]>([])

  // Ledger data
  const [entries,      setEntries]      = useState<BuyerLedgerEntry[]>([])
  const [totalDebit,   setTotalDebit]   = useState(0)
  const [totalCredit,  setTotalCredit]  = useState(0)
  const [balance,      setBalance]      = useState(0)
  const [prevBalance,  setPrevBalance]  = useState(0)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  // Payments
  const [payments,     setPayments]     = useState<BuyerPayment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  // Payment form
  const [form,         setForm]         = useState<PaymentForm>(emptyForm('', today))
  const [editingId,    setEditingId]    = useState<number | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [deletingId,   setDeletingId]   = useState<number | null>(null)
  const [showForm,     setShowForm]     = useState(false)

  // Load ledger
  const loadLedger = useCallback(() => {
    setLoading(true)
    setError(null)
    api.getBuyerLedger({ buyer, from, to })
      .then(res => {
        setEntries(res.entries)
        setTotalDebit(res.total_debit)
        setTotalCredit(res.total_credit)
        setBalance(res.balance)
        setPrevBalance(res.prev_balance)
        setBuyers(res.buyers)
      })
      .catch(e => setError(e?.message ?? 'Failed to load ledger'))
      .finally(() => setLoading(false))
  }, [buyer, from, to])

  // Load payments for selected buyer
  const loadPayments = useCallback(() => {
    if (!buyer) { setPayments([]); return }
    setPaymentsLoading(true)
    api.getBuyerPayments({ buyer, from, to })
      .then(setPayments)
      .catch(() => setPayments([]))
      .finally(() => setPaymentsLoading(false))
  }, [buyer, from, to])

  useEffect(() => { loadLedger(); loadPayments() }, [loadLedger, loadPayments])

  // ── Form Handlers ──────────────────────────────────────────────────────
  const handleFormChange = (field: keyof PaymentForm, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  const handleAddNew = () => {
    setEditingId(null)
    setForm(emptyForm(buyer, today))
    setShowForm(true)
  }

  const handleEdit = (p: BuyerPayment) => {
    setEditingId(p.id)
    setForm({
      id: p.id,
      buyer_name: p.buyer_name,
      date: p.date,
      credit_amount: String(p.credit_amount),
      hamali: String(p.hamali),
      description: p.description,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.buyer_name.trim()) return alert('Buyer name is required')
    const creditAmount = parseFloat(form.credit_amount) || 0
    if (creditAmount <= 0) return alert('Credit amount must be greater than 0')

    setSaving(true)
    try {
      const payload = {
        buyer_name:    form.buyer_name.trim(),
        date:          form.date,
        credit_amount: creditAmount,
        hamali:        parseFloat(form.hamali) || 0,
        description:   form.description.trim(),
      }
      if (editingId) {
        await api.updateBuyerPayment(editingId, payload)
      } else {
        await api.createBuyerPayment(payload)
      }
      setShowForm(false)
      setEditingId(null)
      loadLedger()
      loadPayments()
    } catch (e: any) {
      alert(e?.message ?? 'Failed to save payment')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this payment entry?')) return
    setDeletingId(id)
    try {
      await api.deleteBuyerPayment(id)
      loadLedger()
      loadPayments()
    } catch {
      alert('Failed to delete payment')
    } finally {
      setDeletingId(null)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
  }

  // ── Tab state ─────────────────────────────────────────────────────────
  const [tab, setTab] = useState<'ledger' | 'payments'>('ledger')

  return (
    <div className="space-y-5">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Buyer Ledger</h1>
        <button
          onClick={handleAddNew}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus size={16} /> Add Payment
        </button>
      </div>

      {/* ── FILTERS ──────────────────────────────────────────────────────────── */}
      <div className="card flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Buyer Name</label>
          <input
            list="buyer-list"
            className="input w-full"
            placeholder="Select or type buyer name…"
            value={buyer}
            onChange={e => setBuyer(e.target.value)}
          />
          <datalist id="buyer-list">
            {buyers.map(b => <option key={b} value={b} />)}
          </datalist>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button
          onClick={() => { setFrom(''); setTo(''); setBuyer('') }}
          className="btn-secondary text-sm"
        >
          Clear
        </button>
      </div>

      {/* ── PAYMENT FORM ─────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="card border-2 border-forest/30 space-y-4">
          <h2 className="font-bold text-forest text-base">
            {editingId ? 'Edit Payment' : 'New Payment Entry'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Buyer Name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Buyer Name *</label>
              <input
                list="buyer-list-form"
                className="input w-full"
                placeholder="Buyer name"
                value={form.buyer_name}
                onChange={e => handleFormChange('buyer_name', e.target.value)}
              />
              <datalist id="buyer-list-form">
                {buyers.map(b => <option key={b} value={b} />)}
              </datalist>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
              <input
                type="date"
                className="input w-full"
                value={form.date}
                onChange={e => handleFormChange('date', e.target.value)}
              />
            </div>

            {/* Credit Amount */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Credit Amount (Payment) *
              </label>
              <input
                type="number"
                className="input w-full"
                placeholder="0"
                value={form.credit_amount}
                onChange={e => handleFormChange('credit_amount', e.target.value)}
              />
            </div>

            {/* Hamali */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Hamali <span className="text-gray-400 font-normal">(does not affect ledger)</span>
              </label>
              <input
                type="number"
                className="input w-full"
                placeholder="0"
                value={form.hamali}
                onChange={e => handleFormChange('hamali', e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                className="input w-full"
                placeholder="e.g. Cash Received, Online Transfer, Advance Payment"
                value={form.description}
                onChange={e => handleFormChange('description', e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {editingId ? 'Update' : 'Save Payment'}
            </button>
            <button onClick={handleCancel} className="btn-secondary text-sm flex items-center gap-2">
              <X size={15} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── SUMMARY CARDS ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card text-center space-y-1">
          <TrendingDown size={20} className="mx-auto text-red-500" />
          <div className="text-xs text-gray-500">Total Debit</div>
          <div className="font-bold text-red-600">{formatCurrency(totalDebit)}</div>
        </div>
        <div className="card text-center space-y-1">
          <TrendingUp size={20} className="mx-auto text-green-500" />
          <div className="text-xs text-gray-500">Total Credit</div>
          <div className="font-bold text-green-600">{formatCurrency(totalCredit)}</div>
        </div>
        <div className="card text-center space-y-1">
          <Scale size={20} className="mx-auto text-forest" />
          <div className="text-xs text-gray-500">Balance Due</div>
          <div className={`font-bold text-lg ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(balance)}
          </div>
        </div>
        {(from || to) && buyer && (
          <div className="card text-center space-y-1">
            <div className="text-xs text-gray-500">Prev Balance</div>
            <div className={`font-bold ${prevBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {formatCurrency(prevBalance)}
            </div>
          </div>
        )}
      </div>

      {/* ── TABS ─────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['ledger', 'payments'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-forest text-forest'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'ledger' ? 'Ledger Entries' : 'Payments'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-forest" size={28} />
        </div>
      ) : error ? (
        <div className="card text-red-500 text-sm">{error}</div>
      ) : tab === 'ledger' ? (

        /* ── LEDGER TABLE ───────────────────────────────────────────────── */
        <div className="card overflow-hidden p-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">
              {buyer ? `Ledger — ${buyer}` : 'All Entries'}
            </h2>
          </div>

          {entries.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              No ledger entries found.{!buyer && ' Select a buyer to view their ledger.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-forest/10 text-forest text-xs uppercase tracking-wide">
                  <tr>
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Description</th>
                    {!buyer && <th className="py-3 px-4 text-left">Buyer</th>}
                    <th className="py-3 px-4 text-right">Debit</th>
                    <th className="py-3 px-4 text-right">Credit</th>
                    <th className="py-3 px-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} className="border-t hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${e.type === 'debit' ? 'text-gray-800' : 'text-green-700'}`}>
                          {e.description}
                        </span>
                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${
                          e.ref_type === 'patti'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-green-50 text-green-600'
                        }`}>
                          {e.ref_type === 'patti' ? 'Patti' : 'Payment'}
                        </span>
                      </td>
                      {!buyer && <td className="py-3 px-4 text-gray-600">{e.buyer_name}</td>}
                      <td className="py-3 px-4 text-right text-red-600 font-medium">
                        {e.type === 'debit' ? formatCurrency(e.amount) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">
                        {e.type === 'credit' ? formatCurrency(e.amount) : '—'}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${
                        (e.running_balance ?? 0) > 0 ? 'text-red-700' : 'text-green-700'
                      }`}>
                        {formatCurrency(Math.abs(e.running_balance ?? 0))}
                        {(e.running_balance ?? 0) < 0 && (
                          <span className="text-[10px] text-green-600 ml-1">CR</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-forest/10 font-bold">
                    <td colSpan={buyer ? 2 : 3} className="py-3 px-4 text-gray-700">Total</td>
                    <td className="py-3 px-4 text-right text-red-700">{formatCurrency(totalDebit)}</td>
                    <td className="py-3 px-4 text-right text-green-700">{formatCurrency(totalCredit)}</td>
                    <td className={`py-3 px-4 text-right text-lg ${balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {formatCurrency(balance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

      ) : (

        /* ── PAYMENTS TABLE ─────────────────────────────────────────────── */
        <div className="card overflow-hidden p-0">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-700">
              Payment Entries {buyer && `— ${buyer}`}
            </h2>
            <span className="text-xs text-gray-400">{payments.length} entries</span>
          </div>

          {paymentsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-forest" size={22} />
            </div>
          ) : payments.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              No payment entries found.{!buyer && ' Select a buyer to view their payments.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-forest/10 text-forest text-xs uppercase tracking-wide">
                  <tr>
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Buyer</th>
                    <th className="py-3 px-4 text-left">Description</th>
                    <th className="py-3 px-4 text-right">Credit Amt</th>
                    <th className="py-3 px-4 text-right">Hamali</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-t hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{fmtDate(p.date)}</td>
                      <td className="py-3 px-4 font-medium text-forest">{p.buyer_name}</td>
                      <td className="py-3 px-4 text-gray-600">{p.description || '—'}</td>
                      <td className="py-3 px-4 text-right text-green-700 font-medium">
                        {formatCurrency(p.credit_amount)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500">
                        {Number(p.hamali) > 0 ? formatCurrency(p.hamali) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                            title="Delete"
                          >
                            {deletingId === p.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Trash2 size={14} />
                            }
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
