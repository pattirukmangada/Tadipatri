// src/pages/GeneralLedger.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { formatCurrency, formatDate } from '../../lib/api'
import {
  BookOpen, Plus, Trash2, Edit2, X, Check,
  TrendingUp, TrendingDown, Scale, RefreshCw,
  FileDown, Share2, User,
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logo from '../../assets/logo.png'

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface LedgerEntry {
  id: number
  date: string
  description: string
  agent: string
  type: 'credit' | 'debit'
  amount: number
  created_at: string
}

interface LedgerSummary {
  entries: LedgerEntry[]
  total_credit: number
  total_debit: number
  balance: number
  agents: string[]
}

interface EntryForm {
  date: string
  description: string
  agent: string
  type: 'credit' | 'debit'
  amount: string
}

const today = () => new Date().toISOString().slice(0, 10)

const emptyForm = (): EntryForm => ({
  date: today(),
  description: '',
  agent: '',
  type: 'credit',
  amount: '',
})

/* ─── API helpers ───────────────────────────────────────────────────────── */

const BASE = (import.meta.env.VITE_API_BASE as string) || '/api'

function getToken() { return localStorage.getItem('admin_token') }

async function ledgerRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data as T
}

const ledgerApi = {
  getEntries: (params: { from?: string; to?: string; type?: string; agent?: string } = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v)) as Record<string, string>
    ).toString()
    return ledgerRequest<LedgerSummary>(`/ledger${q ? `?${q}` : ''}`)
  },
  createEntry: (data: Omit<EntryForm, 'amount'> & { amount: number }) =>
    ledgerRequest<LedgerEntry>('/ledger', { method: 'POST', body: JSON.stringify(data) }),
  updateEntry: (id: number, data: Omit<EntryForm, 'amount'> & { amount: number }) =>
    ledgerRequest<LedgerEntry>(`/ledger/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEntry: (id: number) =>
    ledgerRequest<{ success: boolean }>(`/ledger/${id}`, { method: 'DELETE' }),
}

/* ─── Logo loader ───────────────────────────────────────────────────────── */

async function loadImageBase64(url: string): Promise<string> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

/* ─── PDF Export ────────────────────────────────────────────────────────── */

async function exportPDF(
  summary: LedgerSummary,
  runningBalances: number[],
  filterFrom: string,
  filterTo: string,
  filterType: string,
  filterAgent: string
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const PAGE_W = 297
  const CENTER = PAGE_W / 2

  const logoBase64 = await loadImageBase64(logo)

  const fmtAmt = (n: number) =>
    'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  /* ── 1. Green header band (0 → 32 mm) ─────────────────────────────────── */
  doc.setFillColor(22, 101, 52)
  doc.rect(0, 0, PAGE_W, 32, 'F')

  // Left block — SONU
  doc.setTextColor(255, 220, 80)          // gold/yellow for names
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('SONU', 10, 10)

  doc.setTextColor(255, 220, 80)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text('7013285158', 10, 16)
  doc.text('7893287215', 10, 22)

  // Right block — BUJJI
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 220, 80)
  doc.text('BUJJI', PAGE_W - 10, 10, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text('8639826163', PAGE_W - 10, 16, { align: 'right' })

  // Logo — centred, top of band
  doc.addImage(logoBase64, 'PNG', CENTER - 9, 2, 18, 18)

  // Company name — white, bold
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('NKV Bombay Lemon Traders', CENTER, 24, { align: 'center' })

  // Address — white, normal
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(
    'Agricultural Market Yard, Tadipatri, Andhra Pradesh, India.',
    CENTER, 29, { align: 'center' }
  )

  /* ── 2. Sub-header (white area, y = 34 → 50) ──────────────────────────── */
  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('General Ledger', CENTER, 38, { align: 'center' })

  // Agent badge (if filtered)
  if (filterAgent) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(22, 101, 52)
    doc.text(`Party: ${filterAgent}`, CENTER, 43, { align: 'center' })
  }

  // Period / filter info
  const parts: string[] = []
  if (filterFrom) parts.push(`From: ${filterFrom}`)
  if (filterTo)   parts.push(`To: ${filterTo}`)
  if (filterType) parts.push(`Type: ${filterType.charAt(0).toUpperCase() + filterType.slice(1)}`)

  const metaY = filterAgent ? 48 : 43
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  if (parts.length) {
    doc.text(parts.join('   |   '), CENTER, metaY, { align: 'center' })
  }
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, CENTER, metaY + 5, { align: 'center' })

  /* ── 3. Summary box ────────────────────────────────────────────────────── */
  const sx = 14
  const sy = metaY + 10
  const boxH = 18

  doc.setFillColor(245, 247, 250)
  doc.setDrawColor(220, 220, 220)
  doc.roundedRect(sx, sy, PAGE_W - sx * 2, boxH, 2, 2, 'FD')

  const summaryItems = [
    { label: 'Total Credit', value: fmtAmt(summary.total_credit), color: [22, 120, 60] as [number,number,number] },
    { label: 'Total Debit',  value: fmtAmt(summary.total_debit),  color: [180, 40, 40] as [number,number,number] },
    { label: 'Balance',      value: fmtAmt(summary.balance),      color: (summary.balance >= 0 ? [30, 100, 200] : [200, 80, 30]) as [number,number,number] },
    { label: 'Entries',      value: String(summary.entries.length), color: [50, 50, 50] as [number,number,number] },
  ]

  const colW = (PAGE_W - sx * 2) / summaryItems.length
  summaryItems.forEach((item, i) => {
    const cx = sx + colW * i + 8
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 100, 100)
    doc.text(item.label, cx, sy + 7)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...item.color)
    doc.text(item.value, cx, sy + 15)
  })

  /* ── 4. Data table ─────────────────────────────────────────────────────── */
  doc.setTextColor(0, 0, 0)

  const rows = summary.entries.map((e, i) => [
    String(i + 1),
    formatDate(e.date),
    e.description,
    e.agent || '—',
    e.type === 'credit' ? fmtAmt(e.amount) : '—',
    e.type === 'debit'  ? fmtAmt(e.amount) : '—',
    fmtAmt(runningBalances[i]),
  ])

  // Totals row
  rows.push([
    '', '', 'TOTALS', '',
    fmtAmt(summary.total_credit),
    fmtAmt(summary.total_debit),
    fmtAmt(summary.balance),
  ])

  autoTable(doc, {
    startY: sy + boxH + 4,
    head: [['#', 'Date', 'Description', 'Party', 'Credit (Rs.)', 'Debit (Rs.)', 'Balance']],
    body: rows,
    theme: 'striped',
    styles: { fontSize: 8, font: 'helvetica', textColor: [30, 30, 30] },
    headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 25 },
      2: { cellWidth: 76 },
      3: { cellWidth: 45 },
      4: { cellWidth: 35, halign: 'center' },
      5: { cellWidth: 35, halign: 'center' },
      6: { cellWidth: 38, halign: 'right' },
    },
    didParseCell(data) {
      // Bold totals row
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = [235, 240, 235]
      }
      // Credit column — green
      if (data.column.index === 4 && data.row.index < rows.length - 1) {
        const entry = summary.entries[data.row.index]
        if (entry?.type === 'credit') data.cell.styles.textColor = [16, 120, 60]
      }
      // Debit column — red
      if (data.column.index === 5 && data.row.index < rows.length - 1) {
        const entry = summary.entries[data.row.index]
        if (entry?.type === 'debit') data.cell.styles.textColor = [180, 30, 30]
      }
    },
  })

  /* ── 5. Page footer ────────────────────────────────────────────────────── */
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text(
      `Page ${i} of ${pageCount}   |   Developed By RukmanWebSolutions   |   Generated: ${new Date().toLocaleString('en-IN')}`,
      CENTER,
      doc.internal.pageSize.height - 5,
      { align: 'center' }
    )
  }

  const dateStr = today().replace(/-/g, '')
  const agentStr = filterAgent ? `_${filterAgent.replace(/\s+/g, '_')}` : ''
  doc.save(`NKV_Ledger${agentStr}_${dateStr}.pdf`)
}

/* ─── WhatsApp Share ────────────────────────────────────────────────────── */

function shareWhatsApp(
  summary: LedgerSummary,
  filterFrom: string,
  filterTo: string,
  filterAgent: string
) {
  const fmtAmt = (n: number) => 'Rs.' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })

  let text = '*NKV — General Ledger*\n'
  if (filterAgent) text += `*Agent: ${filterAgent}*\n`
  if (filterFrom || filterTo) {
    text += `_${filterFrom || '…'} to ${filterTo || '…'}_\n`
  }
  text += '\n'

  text += `✅ *Total Credit:* ${fmtAmt(summary.total_credit)}\n`
  text += `❌ *Total Debit:*  ${fmtAmt(summary.total_debit)}\n`
  text += `💰 *Balance:*      ${fmtAmt(summary.balance)}\n`
  text += '\n*Entries:*\n'

  summary.entries.forEach((e, i) => {
    if (i > 19) return
    const sign = e.type === 'credit' ? '➕' : '➖'
    const agentTag = e.agent ? ` [${e.agent}]` : ''
    text += `${sign} ${formatDate(e.date)}${agentTag} — ${e.description}: ${fmtAmt(e.amount)}\n`
    if (i === 19 && summary.entries.length > 20) {
      text += `_…and ${summary.entries.length - 20} more entries_\n`
    }
  })

  const encoded = encodeURIComponent(text)

  if (navigator.share) {
    navigator.share({ title: 'NKV General Ledger', text }).catch(() => {})
  } else {
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }
}

/* ─── Agent Autocomplete Input ──────────────────────────────────────────── */

function AgentInput({
  value,
  onChange,
  agents,
  placeholder = 'e.g. Raju, Suresh…',
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  agents: string[]
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const suggestions = agents.filter(
    (a) => a.toLowerCase().includes(value.toLowerCase()) && a !== value
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`pl-8 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30 ${className}`}
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 top-full mt-1 left-0 w-full bg-white border border-gray-200 rounded-lg shadow-md max-h-40 overflow-y-auto">
          {suggestions.map((a) => (
            <li
              key={a}
              onMouseDown={() => { onChange(a); setOpen(false) }}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-forest/10 cursor-pointer"
            >
              {a}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function GeneralLedger() {
  const [summary, setSummary] = useState<LedgerSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState<EntryForm>(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EntryForm>(emptyForm())

  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterAgent, setFilterAgent] = useState('')

  const agents = summary?.agents ?? []

  const previewAmount = parseFloat(form.amount) || 0
  const previewCredit = form.type === 'credit' ? previewAmount : 0
  const previewDebit  = form.type === 'debit'  ? previewAmount : 0

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await ledgerApi.getEntries({
        from:  filterFrom  || undefined,
        to:    filterTo    || undefined,
        type:  filterType  || undefined,
        agent: filterAgent || undefined,
      })
      setSummary(data)
    } catch (e: any) {
      setError(e.message || 'Failed to load ledger')
    } finally {
      setLoading(false)
    }
  }, [filterFrom, filterTo, filterType, filterAgent])

  useEffect(() => { load() }, [load])

  async function handleSubmit() {
    setFormError('')
    const amt = parseFloat(form.amount)
    if (!form.description.trim()) { setFormError('Description is required'); return }
    if (!amt || amt <= 0)         { setFormError('Enter a valid amount'); return }
    setSubmitting(true)
    try {
      await ledgerApi.createEntry({ ...form, amount: amt })
      setForm(emptyForm())
      await load()
    } catch (e: any) {
      setFormError(e.message || 'Failed to save entry')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this entry?')) return
    try {
      await ledgerApi.deleteEntry(id)
      await load()
    } catch (e: any) {
      alert(e.message || 'Delete failed')
    }
  }

  function startEdit(entry: LedgerEntry) {
    setEditingId(entry.id)
    setEditForm({
      date: entry.date,
      description: entry.description,
      agent: entry.agent ?? '',
      type: entry.type,
      amount: String(entry.amount),
    })
  }

  async function saveEdit(id: number) {
    const amt = parseFloat(editForm.amount)
    if (!editForm.description.trim() || !amt || amt <= 0) return
    try {
      await ledgerApi.updateEntry(id, { ...editForm, amount: amt })
      setEditingId(null)
      await load()
    } catch (e: any) {
      alert(e.message || 'Update failed')
    }
  }

  function computeRunningBalance(entries: LedgerEntry[]) {
    let bal = 0
    return entries.map((e) => {
      if (e.type === 'credit') bal += Number(e.amount)
      else                     bal -= Number(e.amount)
      return bal
    })
  }

  const runningBalances = summary ? computeRunningBalance(summary.entries) : []

  const currentCredit  = summary?.total_credit ?? 0
  const currentDebit   = summary?.total_debit  ?? 0
  const currentBalance = summary?.balance       ?? 0

  const previewTotalCredit  = currentCredit  + previewCredit
  const previewTotalDebit   = currentDebit   + previewDebit
  const previewTotalBalance = previewTotalCredit - previewTotalDebit

  const hasFilters = filterFrom || filterTo || filterType || filterAgent

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-forest/10 rounded-xl flex items-center justify-center">
            <BookOpen size={20} className="text-forest" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">General Ledger</h1>
            <p className="text-sm text-gray-500">
              {filterAgent
                ? `Showing entries for agent: ${filterAgent}`
                : 'Track all financial credits and debits'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {summary && summary.entries.length > 0 && (
            <button
              onClick={() => shareWhatsApp(summary, filterFrom, filterTo, filterAgent)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium"
            >
              <Share2 size={15} />
              WhatsApp
            </button>
          )}

          {summary && summary.entries.length > 0 && (
            <button
              onClick={() => exportPDF(summary, runningBalances, filterFrom, filterTo, filterType, filterAgent)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium"
            >
              <FileDown size={15} />
              PDF
            </button>
          )}

          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Agent quick-filter pills ─────────────────────────────────────── */}
      {agents.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500 font-medium">Agents:</span>
          <button
            onClick={() => setFilterAgent('')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              !filterAgent
                ? 'bg-forest text-white border-forest'
                : 'bg-white text-gray-600 border-gray-200 hover:border-forest hover:text-forest'
            }`}
          >
            All
          </button>
          {agents.map((a) => (
            <button
              key={a}
              onClick={() => setFilterAgent(filterAgent === a ? '' : a)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                filterAgent === a
                  ? 'bg-forest text-white border-forest'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-forest hover:text-forest'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      {/* ── Summary cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label="Total Credit"
          value={previewTotalCredit}
          icon={<TrendingUp size={18} />}
          color="emerald"
          preview={previewCredit > 0}
        />
        <SummaryCard
          label="Total Debit"
          value={previewTotalDebit}
          icon={<TrendingDown size={18} />}
          color="red"
          preview={previewDebit > 0}
        />
        <SummaryCard
          label="Balance"
          value={previewTotalBalance}
          icon={<Scale size={18} />}
          color={previewTotalBalance >= 0 ? 'blue' : 'orange'}
          preview={previewAmount > 0}
          bold
        />
      </div>

      {/* ── Entry Form ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Plus size={16} className="text-forest" />
          Add New Entry
        </h2>

        {/* Row 1: Date + Description + Agent */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Market expense, Commission received…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Agent (optional)</label>
            <AgentInput
              value={form.agent}
              onChange={(v) => setForm({ ...form, agent: v })}
              agents={agents}
              className="w-full"
            />
          </div>
        </div>

        {/* Row 2: Type + Amount + Add button */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <div className="flex gap-2">
              {(['credit', 'debit'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, type: t })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                    form.type === t
                      ? t === 'credit'
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-forest text-white rounded-lg text-sm font-medium hover:bg-forest/90 disabled:opacity-50 flex items-center gap-1"
              >
                {submitting ? '…' : <><Plus size={15} /> Add</>}
              </button>
            </div>
          </div>
        </div>

        {formError && (
          <p className="mt-3 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
        )}

        {previewAmount > 0 && (
          <div className={`mt-3 text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${
            form.type === 'credit' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
            {form.type === 'credit' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            Adding {form.type}{form.agent ? ` for ${form.agent}` : ''} of{' '}
            <strong>{formatCurrency(previewAmount)}</strong>
            &nbsp;→ balance will be <strong>{formatCurrency(previewTotalBalance)}</strong>
          </div>
        )}
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Agent</label>
            <AgentInput
              value={filterAgent}
              onChange={setFilterAgent}
              agents={agents}
              placeholder="Filter by agent…"
              className="w-40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest/30"
            >
              <option value="">All</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>
          {hasFilters && (
            <button
              onClick={() => { setFilterFrom(''); setFilterTo(''); setFilterType(''); setFilterAgent('') }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500"
            >
              <X size={13} /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* ── Ledger Table ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Ledger Entries
            {filterAgent && (
              <span className="ml-2 text-xs font-normal bg-forest/10 text-forest px-2 py-0.5 rounded-full">
                {filterAgent}
              </span>
            )}
          </h2>
          <span className="text-xs text-gray-400">{summary?.entries.length ?? 0} entries</span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 text-sm">{error}</div>
        ) : !summary?.entries.length ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            {filterAgent
              ? `No entries found for agent "${filterAgent}".`
              : 'No entries yet. Add your first entry above.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Agent</th>
                  <th className="px-4 py-3 text-right">Credit (₹)</th>
                  <th className="px-4 py-3 text-right">Debit (₹)</th>
                  <th className="px-4 py-3 text-right">Running Balance</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.entries.map((entry, idx) => {
                  const runBal = runningBalances[idx]
                  const isEditing = editingId === entry.id

                  if (isEditing) {
                    return (
                      <tr key={entry.id} className="bg-amber-50">
                        <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            value={editForm.date}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            className="border rounded px-2 py-1 text-xs w-32"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="border rounded px-2 py-1 text-xs w-full min-w-[120px]"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <AgentInput
                            value={editForm.agent}
                            onChange={(v) => setEditForm({ ...editForm, agent: v })}
                            agents={agents}
                            placeholder="Agent"
                            className="w-28 text-xs py-1"
                          />
                        </td>
                        <td className="px-4 py-2" colSpan={2}>
                          <div className="flex gap-2 items-center">
                            <select
                              value={editForm.type}
                              onChange={(e) => setEditForm({ ...editForm, type: e.target.value as 'credit' | 'debit' })}
                              className="border rounded px-2 py-1 text-xs"
                            >
                              <option value="credit">Credit</option>
                              <option value="debit">Debit</option>
                            </select>
                            <input
                              type="number"
                              value={editForm.amount}
                              onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                              className="border rounded px-2 py-1 text-xs w-28"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2" />
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => saveEdit(entry.id)}
                              className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                              title="Save"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                              title="Cancel"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(entry.date)}</td>
                      <td className="px-4 py-3 text-gray-800">{entry.description}</td>
                      <td className="px-4 py-3">
                        {entry.agent ? (
                          <button
                            onClick={() => setFilterAgent(entry.agent)}
                            className="inline-flex items-center gap-1 text-xs bg-forest/10 text-forest px-2 py-0.5 rounded-full hover:bg-forest/20 transition-colors"
                            title={`Filter by ${entry.agent}`}
                          >
                            <User size={10} />
                            {entry.agent}
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-emerald-600">
                        {entry.type === 'credit' ? formatCurrency(entry.amount) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-red-500">
                        {entry.type === 'debit' ? formatCurrency(entry.amount) : '—'}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${runBal >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>
                        {formatCurrency(runBal)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEdit(entry)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-gray-700">
                    Totals
                    {filterAgent && <span className="ml-2 font-normal text-xs text-gray-400">({filterAgent})</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(currentCredit)}</td>
                  <td className="px-4 py-3 text-right text-red-500">{formatCurrency(currentDebit)}</td>
                  <td className={`px-4 py-3 text-right ${currentBalance >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
                    {formatCurrency(currentBalance)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Summary Card ────────────────────────────────────────────────────────── */

const colorMap = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  red:     'bg-red-50 text-red-600 border-red-100',
  blue:    'bg-blue-50 text-blue-700 border-blue-100',
  orange:  'bg-orange-50 text-orange-600 border-orange-100',
}

function SummaryCard({
  label, value, icon, color, preview, bold,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: keyof typeof colorMap
  preview?: boolean
  bold?: boolean
}) {
  return (
    <div className={`rounded-2xl border p-4 ${colorMap[color]} transition-all ${preview ? 'ring-2 ring-offset-1 ring-current/20' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium opacity-70">{label}</span>
        <span className="opacity-60">{icon}</span>
      </div>
      <div className={`text-xl ${bold ? 'font-bold' : 'font-semibold'}`}>
        {formatCurrency(value)}
      </div>
      {preview && (
        <div className="text-[10px] mt-1 opacity-60 italic">preview with new entry</div>
      )}
    </div>
  )
}

