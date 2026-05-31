// src/pages/admin/ProfitLoss.tsx
import { useState, useEffect, useCallback } from 'react'
import { formatCurrency } from '../../lib/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logo from '../../assets/logo.png'

/* ─── Types ─────────────────────────────────────────────── */
interface PLRecord {
  id: number
  total_expense: number
  additional_amt: number
  advance_amount: number
  total_deductions: number
  income: number
  net_result: number
  status: 'profit' | 'loss'
  note: string | null
  party_name: string
  created_at: string
}

interface PLSummary {
  total_records: number
  total_profit: number
  total_loss: number
  overall_net: number
}

interface PLResponse {
  records: PLRecord[]
  summary: PLSummary
  party_list: string[]
}

interface PLForm {
  total_expense: string
  additional_amt: string
  advance_amount: string
  income: string
  note: string
  party_name: string
}

const EMPTY_FORM: PLForm = {
  total_expense: '',
  additional_amt: '',
  advance_amount: '',
  income: '',
  note: '',
  party_name: '',
}

/* ─── PDF helpers ────────────────────────────────────────── */
function pdfCurrency(n: number | string): string {
  return 'Rs. ' + Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatSafeDate(d: string): string {
  if (!d) return '—'
  const date = new Date(d.replace(' ', 'T'))
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ─── API helpers ────────────────────────────────────────── */
const BASE = (import.meta.env.VITE_API_BASE as string) || '/api'

function getToken(): string | null {
  return localStorage.getItem('admin_token')
}

async function plRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
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

async function loadImageBase64(url: string): Promise<string> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

/* ─── PDF Export ─────────────────────────────────────────── */
async function exportPDF(
  records: PLRecord[],
  summary: PLSummary | null,
  from: string,
  to: string,
  partyFilter: string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const PAGE_W = 297
  const CENTER = PAGE_W / 2
  const logoBase64 = await loadImageBase64(logo)

  doc.setFillColor(22, 101, 52)
  doc.rect(0, 0, PAGE_W, 32, 'F')

  doc.setTextColor(255, 215, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('SONU', 10, 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text('7013285158', 10, 16)
  doc.text('7893287215', 10, 22)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('BUJJI', PAGE_W - 10, 10, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text('8639826163', PAGE_W - 10, 16, { align: 'right' })

  doc.addImage(logoBase64, 'PNG', CENTER - 9, 3, 18, 18)

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('NKV Bombay Lemon Traders', CENTER, 24, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(
    'Agricultural market yard, Tadipatri, Andhra Pradesh.',
    CENTER, 29, { align: 'center' }
  )

  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Profit & Loss Report', CENTER, 38, { align: 'center' })

  const rangeLabel = from && to
    ? `${from}  to  ${to}`
    : from ? `From ${from}` : to ? `Up to ${to}` : 'All Records'
  const partyLabel = partyFilter ? `  |  Party: ${partyFilter}` : ''

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 100, 100)
  doc.text(`Period: ${rangeLabel}${partyLabel}`, CENTER, 44, { align: 'center' })
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, CENTER, 49, { align: 'center' })

  if (summary) {
    const sx = 14, sy = 53, boxH = 20
    doc.setFillColor(245, 247, 250)
    doc.setDrawColor(220, 220, 220)
    doc.roundedRect(sx, sy, PAGE_W - sx * 2, boxH, 2, 2, 'FD')

    const overallNet = Number(summary.overall_net)
    const cols = [
      { label: 'Total Records', value: String(summary.total_records), colorIdx: 0 },
      { label: 'Total Profit',  value: pdfCurrency(summary.total_profit), colorIdx: 1 },
      { label: 'Total Loss',    value: pdfCurrency(summary.total_loss),   colorIdx: 2 },
      { label: 'Overall Net',   value: (overallNet >= 0 ? 'Profit ' : 'Loss ') + pdfCurrency(Math.abs(overallNet)), colorIdx: 3 },
    ]

    const colW = (PAGE_W - sx * 2) / cols.length
    cols.forEach((col, i) => {
      const cx = sx + colW * i + 8
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(100, 100, 100)
      doc.text(col.label, cx, sy + 8)

      if (col.colorIdx === 1)      doc.setTextColor(22, 120, 60)
      else if (col.colorIdx === 2) doc.setTextColor(180, 40, 40)
      else if (col.colorIdx === 3) doc.setTextColor(
        overallNet >= 0 ? 22 : 180,
        overallNet >= 0 ? 120 : 40,
        overallNet >= 0 ? 60 : 40
      )
      else doc.setTextColor(30, 30, 30)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.text(col.value, cx, sy + 16)
    })

    const amtW = 25
    doc.setTextColor(0, 0, 0)
    autoTable(doc, {
      startY: sy + boxH + 4,
      head: [['#', 'Date', 'Note', 'Expense', 'Additional', 'Advance', 'Deductions', 'Income', 'Result', 'Net']],
      body: records.map((r, idx) => [
        idx + 1,
        formatSafeDate(r.created_at),
        r.note || '-',
        pdfCurrency(r.total_expense),
        pdfCurrency(r.additional_amt),
        pdfCurrency(r.advance_amount),
        pdfCurrency(r.total_deductions),
        pdfCurrency(r.income),
        r.status === 'profit' ? 'Profit' : 'Loss',
        (r.status === 'loss' ? '-' : '+') + pdfCurrency(Math.abs(r.net_result)),
      ]),
      styles: { fontSize: 7, cellPadding: 2, font: 'helvetica', textColor: [30, 30, 30] },
      headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { cellWidth: 20 },
        2: { cellWidth: 70 }, // Note (shifted)
        3: { halign: 'center', cellWidth: amtW },
        4: { halign: 'center', cellWidth: amtW },
        5: { halign: 'center', cellWidth: amtW },
        6: { halign: 'center', cellWidth: amtW },
        7: { halign: 'center', cellWidth: amtW },
        8: { halign: 'center', cellWidth: 18 },
        9: { halign: 'right',  cellWidth: amtW },
      },
      // columnStyles: {
      //   0:  { halign: 'center', cellWidth: 8 },
      //   1:  { cellWidth: 18 },
      //   2:  { cellWidth: 26 },
      //   3:  { cellWidth: 44 },
      //   4:  { halign: 'center', cellWidth: amtW },
      //   5:  { halign: 'center', cellWidth: amtW },
      //   6:  { halign: 'center', cellWidth: amtW },
      //   7:  { halign: 'center', cellWidth: amtW },
      //   8:  { halign: 'center', cellWidth: amtW },
      //   9:  { halign: 'center', cellWidth: 16 },
      //   10: { halign: 'right',  cellWidth: amtW },
      // },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell(data) {
        if (data.column.index === 9 && data.section === 'body') {
          data.cell.styles.textColor = String(data.cell.text).includes('Profit') ? [22, 120, 60] : [180, 40, 40]
          data.cell.styles.fontStyle = 'bold'
        }
        if (data.column.index === 10 && data.section === 'body') {
          data.cell.styles.textColor = String(data.cell.text).startsWith('+') ? [22, 120, 60] : [180, 40, 40]
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
  }

  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text(
      `Page ${i} of ${pageCount}  |  Developed By RukmanWebSolutions  |  Generated: ${new Date().toLocaleString('en-IN')}`,
      CENTER, doc.internal.pageSize.height - 5, { align: 'center' }
    )
  }

  const suffix = [from, to, partyFilter].filter(Boolean).join('_') || 'all'
  doc.save(`PL_Report_${suffix}.pdf`)
}

/* ─── Component ──────────────────────────────────────────── */
export default function ProfitLoss() {
  const [form, setForm]           = useState<PLForm>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [preview, setPreview]     = useState<{
    totalDeductions: number; netResult: number; status: 'profit' | 'loss' | null
  } | null>(null)
  const [records, setRecords]     = useState<PLRecord[]>([])
  const [summary, setSummary]     = useState<PLSummary | null>(null)
  const [partyList, setPartyList] = useState<string[]>([])
  const [saving, setSaving]       = useState(false)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  // Filter state
  const [filterFrom,  setFilterFrom]  = useState('')
  const [filterTo,    setFilterTo]    = useState('')
  const [filterParty, setFilterParty] = useState('')
  const [activeFrom,  setActiveFrom]  = useState('')
  const [activeTo,    setActiveTo]    = useState('')
  const [activeParty, setActiveParty] = useState('')

  /* Live preview */
  useEffect(() => {
    const expense    = parseFloat(form.total_expense)  || 0
    const additional = parseFloat(form.additional_amt) || 0
    const advance    = parseFloat(form.advance_amount) || 0
    const income     = parseFloat(form.income)         || 0
    const anyFilled  = form.total_expense || form.additional_amt || form.advance_amount || form.income

    if (!anyFilled) { setPreview(null); return }

    const totalDeductions = expense + additional + advance
    const netResult       = income - totalDeductions
    setPreview({ totalDeductions, netResult, status: income > 0 ? (netResult >= 0 ? 'profit' : 'loss') : null })
  }, [form])

  /* Fetch records */
  const fetchRecords = useCallback(async (from = '', to = '', party = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (from)  params.set('from',  from)
      if (to)    params.set('to',    to)
      if (party) params.set('party', party)
      const qs   = params.toString()
      const data = await plRequest<PLResponse>(`/profit-loss${qs ? `?${qs}` : ''}`)
      setRecords(data.records)
      setSummary(data.summary)
      setPartyList(data.party_list ?? [])
    } catch {
      setError('Failed to load records')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  function applyFilter() {
    setActiveFrom(filterFrom)
    setActiveTo(filterTo)
    setActiveParty(filterParty)
    fetchRecords(filterFrom, filterTo, filterParty)
  }

  function clearFilter() {
    setFilterFrom(''); setFilterTo(''); setFilterParty('')
    setActiveFrom(''); setActiveTo(''); setActiveParty('')
    fetchRecords('', '', '')
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  function handleEdit(r: PLRecord) {
    setEditingId(r.id)
    setForm({
      total_expense:  String(r.total_expense),
      additional_amt: String(r.additional_amt),
      advance_amount: String(r.advance_amount),
      income:         String(r.income),
      note:           r.note || '',
      party_name:     r.party_name || '',
    })
    setError(''); setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setPreview(null)
    setError(''); setSuccess('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')

    const income     = parseFloat(form.income)         || 0
    const expense    = parseFloat(form.total_expense)  || 0
    const additional = parseFloat(form.additional_amt) || 0
    const advance    = parseFloat(form.advance_amount) || 0

    if (income <= 0 && expense <= 0 && additional <= 0 && advance <= 0) {
      setError('Please enter at least one amount.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        total_expense:  expense,
        additional_amt: additional,
        advance_amount: advance,
        income,
        note:       form.note.trim() || null,
        party_name: form.party_name.trim(),
      }

      if (editingId !== null) {
        await plRequest(`/profit-loss/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
        setSuccess('Record updated successfully!')
        setEditingId(null)
      } else {
        await plRequest('/profit-loss', { method: 'POST', body: JSON.stringify(payload) })
        setSuccess('Record saved successfully!')
      }

      setForm(EMPTY_FORM)
      setPreview(null)
      fetchRecords(activeFrom, activeTo, activeParty)
    } catch (err: any) {
      setError(err.message || 'Failed to save record')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this record?')) return
    if (editingId === id) handleCancelEdit()
    try {
      await plRequest(`/profit-loss/${id}`, { method: 'DELETE' })
      fetchRecords(activeFrom, activeTo, activeParty)
    } catch {
      setError('Failed to delete record')
    }
  }

  const isFiltered  = activeFrom || activeTo || activeParty
  const filterLabel = (() => {
    const parts = []
    if (activeFrom && activeTo) parts.push(`${activeFrom} → ${activeTo}`)
    else if (activeFrom)        parts.push(`From ${activeFrom}`)
    else if (activeTo)          parts.push(`Up to ${activeTo}`)
    if (activeParty)            parts.push(`Party: ${activeParty}`)
    return parts.length ? parts.join('  |  ') : 'All Records'
  })()

  /* ─── Render ──────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profit &amp; Loss</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track income, expenses and net result per party</p>
          </div>
          <button
            onClick={() => exportPDF(records, summary, activeFrom, activeTo, activeParty)}
            disabled={records.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
            </svg>
            Download PDF
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard label={isFiltered ? 'Records (Filtered)' : 'Total Records'} value={String(summary.total_records)} color="blue"  icon="📋" />
            <SummaryCard label="Total Profit"  value={formatCurrency(summary.total_profit)} color="green" icon="📈" />
            <SummaryCard label="Total Loss"    value={formatCurrency(summary.total_loss)}   color="red"   icon="📉" />
            <SummaryCard
              label="Overall Net"
              value={formatCurrency(Math.abs(Number(summary.overall_net)))}
              sub={Number(summary.overall_net) >= 0 ? 'Net Profit' : 'Net Loss'}
              color={Number(summary.overall_net) >= 0 ? 'green' : 'red'}
              icon={Number(summary.overall_net) >= 0 ? '✅' : '⚠️'}
            />
          </div>
        )}

        {/* ── Filter Bar ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Filter Records</p>
          <div className="flex flex-wrap items-end gap-3">
            {/* Date filters */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
              <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
              <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>

            {/* Party filter */}
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-gray-500 mb-1">Party Name</label>
              {partyList.length > 0 ? (
                <select
                  value={filterParty}
                  onChange={e => setFilterParty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
                >
                  <option value="">— All Parties —</option>
                  {partyList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={filterParty}
                  onChange={e => setFilterParty(e.target.value)}
                  placeholder="Enter party name..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              )}
            </div>

            <button onClick={applyFilter}
              className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded-lg transition-colors">
              Apply Filter
            </button>
            {isFiltered && (
              <button onClick={clearFilter}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium rounded-lg transition-colors">
                Clear
              </button>
            )}
            {isFiltered && (
              <span className="ml-auto text-xs text-green-700 font-medium bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                📅 {filterLabel}
              </span>
            )}
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── Form Panel ── */}
          <div className="lg:col-span-2">
            <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-colors ${
              editingId !== null ? 'border-amber-300' : 'border-gray-100'
            }`}>
              {/* Form header */}
              <div className={`px-6 py-4 border-b flex items-center justify-between ${
                editingId !== null ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'
              }`}>
                <div className="flex items-center gap-2">
                  {editingId !== null ? (
                    <span className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-sm">✏️</span>
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-sm">＋</span>
                  )}
                  <div>
                    <h2 className="text-sm font-semibold text-gray-800">
                      {editingId !== null ? `Editing Record #${editingId}` : 'New Entry'}
                    </h2>
                    {editingId !== null && (
                      <p className="text-xs text-amber-600 font-medium">Changes will overwrite existing record</p>
                    )}
                  </div>
                </div>
                {editingId !== null && (
                  <button onClick={handleCancelEdit}
                    className="text-xs text-gray-500 hover:text-gray-800 bg-white border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors font-medium">
                    ✕ Cancel
                  </button>
                )}
              </div>

              <div className="p-6">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
                    <span className="mt-0.5">⚠️</span> {error}
                  </div>
                )}
                {success && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm flex items-start gap-2">
                    <span className="mt-0.5">✅</span> {success}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">

                  {/* Party Name */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <span>🏪</span> Party Name
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Party / Business Name
                        <span className="text-gray-400 font-normal ml-1">(required)</span>
                      </label>
                      {partyList.length > 0 ? (
                        <>
                          <select
                            name="party_name"
                            value={form.party_name}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white mb-2"
                          >
                            <option value="">— Select Existing Party —</option>
                            {partyList.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                            <span className="flex-1 border-t border-gray-200" />
                            or type new
                            <span className="flex-1 border-t border-gray-200" />
                          </div>
                        </>
                      ) : null}
                      <input
                        type="text"
                        name="party_name"
                        value={form.party_name}
                        onChange={handleChange}
                        placeholder="e.g. Raju Traders, Lemon Market"
                        required
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      />
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="bg-red-50 rounded-xl p-4 space-y-3 border border-red-100">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
                      <span>📤</span> Deductions
                    </p>
                    <FormField label="Total Expense"    name="total_expense"  value={form.total_expense}  onChange={handleChange} placeholder="0.00" />
                    <FormField label="Additional Amount" name="additional_amt" value={form.additional_amt} onChange={handleChange} placeholder="0.00" />
                    <FormField label="Advance Amount"   name="advance_amount" value={form.advance_amount} onChange={handleChange} placeholder="0.00" />
                    {preview && (
                      <div className="flex justify-between text-sm font-semibold text-red-700 border-t border-red-200 pt-3 mt-1">
                        <span>Total Deductions</span>
                        <span>{formatCurrency(preview.totalDeductions)}</span>
                      </div>
                    )}
                  </div>

                  {/* Income */}
                  <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3 flex items-center gap-1">
                      <span>📥</span> Income
                    </p>
                    <FormField label="Income Amount" name="income" value={form.income} onChange={handleChange} placeholder="0.00" />
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Note <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea name="note" value={form.note} onChange={handleChange} rows={2}
                      placeholder="e.g. Month of April expenses"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
                  </div>

                  {/* Live Preview Badge */}
                  {preview && preview.status && (
                    <ResultBadge status={preview.status} amount={Math.abs(preview.netResult)} label="Preview" />
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    {editingId !== null && (
                      <button type="button" onClick={handleCancelEdit}
                        className="flex-1 py-2.5 px-4 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold rounded-xl text-sm transition-colors">
                        Cancel
                      </button>
                    )}
                    <button type="submit" disabled={saving}
                      className={`flex-1 py-2.5 px-4 font-semibold rounded-xl text-sm transition-colors text-white disabled:opacity-60 ${
                        editingId !== null ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-700 hover:bg-green-800'
                      }`}>
                      {saving
                        ? (editingId !== null ? 'Updating…' : 'Saving…')
                        : (editingId !== null ? '✓ Update Record' : '+ Save Record')
                      }
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* ── Records Table ── */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div>
                  <h2 className="text-sm font-semibold text-gray-800">History</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{filterLabel}</p>
                </div>
                {summary && (
                  <span className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                    {summary.total_records} record{Number(summary.total_records) !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="p-12 text-center text-gray-400 text-sm">
                  <div className="animate-spin text-3xl mb-3">⏳</div>
                  Loading records…
                </div>
              ) : records.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-sm">
                  <div className="text-4xl mb-3">📭</div>
                  {isFiltered ? 'No records found for the selected filters.' : 'No records yet. Add your first entry.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                        <th className="px-4 py-3 text-left">Date / Note</th>
                        <th className="px-4 py-3 text-left">Party</th>
                        <th className="px-4 py-3 text-right">Deductions</th>
                        <th className="px-4 py-3 text-right">Income</th>
                        <th className="px-4 py-3 text-center">Result</th>
                        <th className="px-4 py-3 text-right">Net</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {records.map(r => {
                        const isEditing = editingId === r.id
                        return (
                          <tr key={r.id}
                            className={`transition-colors ${
                              isEditing
                                ? 'bg-amber-50 border-l-4 border-amber-400'
                                : 'hover:bg-gray-50'
                            }`}>
                            <td className="px-4 py-3 text-gray-700">
                              <div className="font-medium">{formatSafeDate(r.created_at)}</div>
                              {r.note && (
                                <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[120px]" title={r.note}>
                                  {r.note}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {r.party_name ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 max-w-[120px] truncate" title={r.party_name}>
                                  🏪 {r.party_name}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600 font-medium">
                              {formatCurrency(r.total_deductions)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600 font-medium">
                              {formatCurrency(r.income)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                r.status === 'profit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {r.status === 'profit' ? '▲ Profit' : '▼ Loss'}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-right font-bold ${
                              r.status === 'profit' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {r.status === 'loss' ? '−' : '+'}
                              {formatCurrency(Math.abs(r.net_result))}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleEdit(r)}
                                  disabled={isEditing}
                                  title="Edit record"
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                    isEditing
                                      ? 'bg-amber-100 text-amber-500 cursor-default'
                                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                  }`}>
                                  ✏️ {isEditing ? 'Editing' : 'Edit'}
                                </button>
                                <button
                                  onClick={() => handleDelete(r.id)}
                                  title="Delete record"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                                  🗑
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>

                    {/* Totals footer */}
                    {records.length > 1 && summary && (
                      <tfoot>
                        <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
                          <td colSpan={2} className="px-4 py-3 text-gray-500 text-xs uppercase tracking-wider">
                            Total ({summary.total_records})
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {formatCurrency(records.reduce((s, r) => s + Number(r.total_deductions), 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            {formatCurrency(records.reduce((s, r) => s + Number(r.income), 0))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              Number(summary.overall_net) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {Number(summary.overall_net) >= 0 ? '▲ Net Profit' : '▼ Net Loss'}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-right font-bold text-base ${
                            Number(summary.overall_net) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {Number(summary.overall_net) < 0 ? '−' : '+'}
                            {formatCurrency(Math.abs(Number(summary.overall_net)))}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

/* ─── Sub-components ─────────────────────────────────────── */
function FormField({ label, name, value, onChange, placeholder }: {
  label: string; name: string; value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium select-none">₹</span>
        <input
          type="number" name={name} value={value} onChange={onChange}
          placeholder={placeholder} min="0" step="0.01"
          className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
        />
      </div>
    </div>
  )
}

function ResultBadge({ status, amount, label }: { status: 'profit' | 'loss'; amount: number; label?: string }) {
  const isProfit = status === 'profit'
  return (
    <div className={`rounded-xl p-4 flex items-center justify-between ${
      isProfit ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
    }`}>
      <div>
        {label && <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-0.5">{label}</p>}
        <p className={`text-lg font-bold ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
          {isProfit ? '▲ Profit' : '▼ Loss'}
        </p>
      </div>
      <p className={`text-xl font-extrabold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
        {formatCurrency(amount)}
      </p>
    </div>
  )
}

function SummaryCard({ label, value, sub, color, icon }: {
  label: string; value: string; sub?: string; color: 'blue' | 'green' | 'red'; icon: string
}) {
  const colors = {
    blue:  'bg-blue-50  border-blue-100  text-blue-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    red:   'bg-red-50   border-red-100   text-red-700',
  }
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]} shadow-sm`}>
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-xs font-medium opacity-70 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}
