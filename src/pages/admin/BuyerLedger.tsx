// src/pages/admin/BuyerLedger.tsx
import { useState, useEffect, useCallback } from 'react'
import { api, BuyerLedgerEntry, BuyerPayment, formatCurrency } from '../../lib/api'
import { exportBuyerLedgerPDF } from '../../lib/pdf-buyer-ledger'
import {
  Loader2, Plus, Trash2, Edit2, Check, X,
  TrendingDown, TrendingUp, Scale, ArrowDownCircle, ArrowUpCircle, FileDown,
} from 'lucide-react'

function fmtDate(d?: string): string {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}-${m}-${y}`
}

interface EntryForm {
  id?: number
  buyer_name: string
  date: string
  entry_type: 'credit' | 'debit'
  amount: string
  description: string
}

const emptyForm = (buyer = '', today = ''): EntryForm => ({
  buyer_name: buyer,
  date: today,
  entry_type: 'credit',
  amount: '',
  description: '',
})

export default function BuyerLedger() {
  const today = new Date().toISOString().split('T')[0]

  // ── Filters ──────────────────────────────────────────────────────────────
  const [buyer,  setBuyer]  = useState('')
  const [from,   setFrom]   = useState('')
  const [to,     setTo]     = useState('')
  const [buyers, setBuyers] = useState<string[]>([])

  // ── Ledger state ──────────────────────────────────────────────────────────
  const [entries,     setEntries]     = useState<BuyerLedgerEntry[]>([])
  const [totalDebit,  setTotalDebit]  = useState(0)
  const [totalCredit, setTotalCredit] = useState(0)
  const [balance,     setBalance]     = useState(0)
  const [prevBalance, setPrevBalance] = useState(0)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  // ── Manual entries (payments / debits) ───────────────────────────────────
  const [payments,        setPayments]        = useState<BuyerPayment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  // ── Entry form ───────────────────────────────────────────────────────────
  const [form,      setForm]      = useState<EntryForm>(emptyForm('', today))
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [deletingId,setDeletingId]= useState<number | null>(null)
  const [showForm,  setShowForm]  = useState(false)

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<'ledger' | 'entries'>('ledger')

  // ── Load ledger ───────────────────────────────────────────────────────────
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

  // ── Load manual entries ───────────────────────────────────────────────────
  const loadPayments = useCallback(() => {
    if (!buyer) { setPayments([]); return }
    setPaymentsLoading(true)
    // Load ALL payments for this buyer (no date filter) so Edit works from Ledger tab
    api.getBuyerPayments({ buyer })
      .then(setPayments)
      .catch(() => setPayments([]))
      .finally(() => setPaymentsLoading(false))
  }, [buyer])

  useEffect(() => { loadLedger(); loadPayments() }, [loadLedger, loadPayments])

  // ── Form handlers ─────────────────────────────────────────────────────────
  const handleFormChange = (field: keyof EntryForm, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  const handleAddNew = () => {
    setEditingId(null)
    setForm(emptyForm(buyer, today))
    setShowForm(true)
  }

  const handleEdit = (p: BuyerPayment) => {
    setEditingId(p.id)
    setForm({
      id:         p.id,
      buyer_name: p.buyer_name,
      date:       p.date,
      entry_type: p.entry_type,
      amount:     String(p.amount),
      description:p.description,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.buyer_name.trim()) return alert('Buyer name is required')
    const amt = parseFloat(form.amount) || 0
    if (amt <= 0) return alert('Amount must be greater than 0')

    setSaving(true)
    try {
      const payload = {
        buyer_name:  form.buyer_name.trim(),
        date:        form.date,
        entry_type:  form.entry_type,
        amount:      amt,
        hamali:      0,           // hamali is not entered here anymore
        description: form.description.trim(),
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
      alert(e?.message ?? 'Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this entry?')) return
    setDeletingId(id)
    try {
      await api.deleteBuyerPayment(id)
      loadLedger()
      loadPayments()
    } catch {
      alert('Failed to delete entry')
    } finally {
      setDeletingId(null)
    }
  }

  const handleCancel = () => { setShowForm(false); setEditingId(null) }

  const handleExportPDF = async () => {
    if (entries.length === 0) return alert('No entries to export')
    await exportBuyerLedgerPDF(
      entries.map(e => ({
        date:            e.date,
        description:     e.description,
        type:            e.type,
        amount:          e.amount,
        ref_type:        e.ref_type,
        running_balance: e.running_balance,
      })),
      { buyer, from, to, totalDebit, totalCredit, balance }
    )
  }

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Buyer Ledger</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            disabled={entries.length === 0}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <FileDown size={16} /> PDF
          </button>
          <button onClick={handleAddNew} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Add Entry
          </button>
        </div>
      </div>

      {/* FILTERS */}
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
        <button onClick={() => { setFrom(''); setTo(''); setBuyer('') }} className="btn-secondary text-sm">
          Clear
        </button>
      </div>

      {/* ENTRY FORM */}
      {showForm && (
        <div className="card border-2 border-forest/30 space-y-4">
          <h2 className="font-bold text-forest text-base">
            {editingId ? 'Edit Entry' : 'New Entry'}
          </h2>

          {/* Credit / Debit Toggle */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Entry Type *</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleFormChange('entry_type', 'credit')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all ${
                  form.entry_type === 'credit'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <ArrowUpCircle size={16} />
                Credit
                <span className="text-xs font-normal opacity-70">(Payment Received)</span>
              </button>
              <button
                onClick={() => handleFormChange('entry_type', 'debit')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all ${
                  form.entry_type === 'debit'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <ArrowDownCircle size={16} />
                Debit
                <span className="text-xs font-normal opacity-70">(Amount Owed)</span>
              </button>
            </div>
          </div>

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

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {form.entry_type === 'credit' ? 'Credit Amount *' : 'Debit Amount *'}
              </label>
              <input
                type="number"
                className={`input w-full font-semibold ${
                  form.entry_type === 'credit' ? 'border-green-300 focus:border-green-500' : 'border-red-300 focus:border-red-500'
                }`}
                placeholder="0"
                value={form.amount}
                onChange={e => handleFormChange('amount', e.target.value)}
              />
              {/* Live preview */}
              {parseFloat(form.amount) > 0 && (
                <div className={`text-xs mt-1 font-medium ${form.entry_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                  {form.entry_type === 'credit' ? '+ ' : '− '}
                  {formatCurrency(parseFloat(form.amount))}
                  {form.entry_type === 'debit' && balance > 0 && (
                    <span className="ml-2 text-gray-500 font-normal">
                      → New balance: {formatCurrency(balance + parseFloat(form.amount))}
                    </span>
                  )}
                  {form.entry_type === 'credit' && balance > 0 && (
                    <span className="ml-2 text-gray-500 font-normal">
                      → New balance: {formatCurrency(Math.max(0, balance - parseFloat(form.amount)))}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                className="input w-full"
                placeholder={
                  form.entry_type === 'credit'
                    ? 'e.g. Cash Received, Online Transfer'
                    : 'e.g. Additional Charge, Adjustment'
                }
                value={form.description}
                onChange={e => handleFormChange('description', e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                form.entry_type === 'credit'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {editingId ? 'Update Entry' : `Save ${form.entry_type === 'credit' ? 'Credit' : 'Debit'}`}
            </button>
            <button onClick={handleCancel} className="btn-secondary text-sm flex items-center gap-2">
              <X size={15} /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card text-center space-y-1">
          <TrendingDown size={20} className="mx-auto text-red-500" />
          <div className="text-xs text-gray-500">Total Debit</div>
          <div className="font-bold text-red-600 tabular-nums">{formatCurrency(totalDebit)}</div>
        </div>
        <div className="card text-center space-y-1">
          <TrendingUp size={20} className="mx-auto text-green-500" />
          <div className="text-xs text-gray-500">Total Credit</div>
          <div className="font-bold text-green-600 tabular-nums">{formatCurrency(totalCredit)}</div>
        </div>
        <div className="card text-center space-y-1">
          <Scale size={20} className="mx-auto text-forest" />
          <div className="text-xs text-gray-500">Balance Due</div>
          <div className={`font-bold text-lg tabular-nums ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(Math.abs(balance))}
            {balance < 0 && <span className="text-xs ml-1 text-green-500">CR</span>}
          </div>
        </div>
        {(from || to) && buyer && (
          <div className="card text-center space-y-1">
            <div className="text-xs text-gray-500">Prev Balance</div>
            <div className={`font-bold tabular-nums ${prevBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {formatCurrency(Math.abs(prevBalance))}
              {prevBalance < 0 && <span className="text-xs ml-1 text-green-500">CR</span>}
            </div>
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['ledger', 'entries'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-forest text-forest'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'ledger' ? 'Ledger' : 'Manual Entries'}
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

        /* ── LEDGER TABLE ─────────────────────────────────────────────────── */
        <div className="card overflow-hidden p-0">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">
              {buyer ? `Ledger — ${buyer}` : 'All Entries (select a buyer to filter)'}
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
                    <th className="py-3 px-4 text-center">Actions</th>
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
                            : e.type === 'credit'
                              ? 'bg-green-50 text-green-600'
                              : 'bg-red-50 text-red-500'
                        }`}>
                          {e.ref_type === 'patti' ? 'Patti' : e.type === 'credit' ? 'Credit' : 'Debit'}
                        </span>
                      </td>
                      {!buyer && <td className="py-3 px-4 text-gray-600">{e.buyer_name}</td>}
                      <td className="py-3 px-4 text-right text-red-600 font-medium tabular-nums">
                        {e.type === 'debit' ? formatCurrency(e.amount) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium tabular-nums">
                        {e.type === 'credit' ? formatCurrency(e.amount) : '—'}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold tabular-nums ${
                        (e.running_balance ?? 0) > 0 ? 'text-red-700' : 'text-green-700'
                      }`}>
                        {formatCurrency(Math.abs(e.running_balance ?? 0))}
                        {(e.running_balance ?? 0) < 0 && (
                          <span className="text-[10px] text-green-600 ml-1">CR</span>
                        )}
                      </td>
                      {/* Actions — edit/delete only for manual payment entries */}
                      <td className="py-3 px-4 text-center">
                        {e.ref_type === 'payment' ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                const p = payments.find(p => p.id === e.ref_id)
                                if (p) handleEdit(p)
                              }}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(e.ref_id)}
                              disabled={deletingId === e.ref_id}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                              title="Delete"
                            >
                              {deletingId === e.ref_id
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Trash2 size={14} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-forest/10 font-bold">
                    <td colSpan={buyer ? 2 : 3} className="py-3 px-4 text-gray-700">Total</td>
                    <td className="py-3 px-4 text-right text-red-700 tabular-nums">{formatCurrency(totalDebit)}</td>
                    <td className="py-3 px-4 text-right text-green-700 tabular-nums">{formatCurrency(totalCredit)}</td>
                    <td className={`py-3 px-4 text-right text-base tabular-nums ${balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {formatCurrency(Math.abs(balance))}
                      {balance < 0 && <span className="text-xs ml-1 text-green-500">CR</span>}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

      ) : (

        /* ── MANUAL ENTRIES TABLE ─────────────────────────────────────────── */
        <div className="card overflow-hidden p-0">
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-gray-700">
              Manual Entries {buyer && `— ${buyer}`}
            </h2>
            <span className="text-xs text-gray-400">{payments.length} entries</span>
          </div>

          {paymentsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-forest" size={22} />
            </div>
          ) : payments.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              No manual entries found.{!buyer && ' Select a buyer to view their entries.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-forest/10 text-forest text-xs uppercase tracking-wide">
                  <tr>
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Buyer</th>
                    <th className="py-3 px-4 text-left">Type</th>
                    <th className="py-3 px-4 text-left">Description</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-t hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{fmtDate(p.date)}</td>
                      <td className="py-3 px-4 font-medium text-forest">{p.buyer_name}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          p.entry_type === 'credit'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {p.entry_type === 'credit'
                            ? <ArrowUpCircle size={11} />
                            : <ArrowDownCircle size={11} />}
                          {p.entry_type === 'credit' ? 'Credit' : 'Debit'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{p.description || '—'}</td>
                      <td className={`py-3 px-4 text-right font-semibold tabular-nums ${
                        p.entry_type === 'credit' ? 'text-green-700' : 'text-red-600'
                      }`}>
                        {p.entry_type === 'credit' ? '+' : '−'} {formatCurrency(p.amount)}
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
                              : <Trash2 size={14} />}
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
