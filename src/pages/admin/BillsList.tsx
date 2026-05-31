// src/pages/admin/BillsList.tsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, Bill, Settings, formatCurrency, formatDate } from '../../lib/api'
import { createBillPDF } from '../../lib/pdf-export'
import {
  Plus, Search, Eye, Edit, Trash2, Printer,
  Loader2, CheckCircle2, Circle, IndianRupee,
  CalendarDays, Receipt, TrendingUp, PrinterCheck,
} from 'lucide-react'

export default function BillsList() {
  const [date, setDate]                   = useState(new Date().toISOString().split('T')[0])
  const [bills, setBills]                 = useState<Bill[]>([])
  const [loading, setLoading]             = useState(true)
  const [search, setSearch]               = useState('')
  const [deleting, setDeleting]           = useState<number | null>(null)
  const [togglingPaidId, setTogglingPaidId]       = useState<number | null>(null)
  const [togglingPrintedId, setTogglingPrintedId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds]     = useState<number[]>([])
  const [settings, setSettings]           = useState<Settings | null>(null)
  const [shareStatus, setShareStatus]     = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    api.getBills(date).then(setBills).finally(() => setLoading(false))
    api.getSettings().then(setSettings).catch(() => setSettings(null))
  }, [date])

  const filtered = bills.filter(b =>
    b.patti_name.toLowerCase().includes(search.toLowerCase())
  )

  // ── Payment summary ───────────────────────────────────────────────────────
  const paidBills    = filtered.filter(b => Number(b.is_paid) === 1)
  const unpaidBills  = filtered.filter(b => Number(b.is_paid) !== 1)
  const paidAmount   = paidBills.reduce((s, b) => s + Number(b.net_amount), 0)
  const unpaidAmount = unpaidBills.reduce((s, b) => s + Number(b.net_amount), 0)

  // ── Selection ─────────────────────────────────────────────────────────────
  const anySelected = selectedIds.length > 0
  const allSelected = filtered.length > 0 && filtered.every(b => selectedIds.includes(b.id))

  const toggleSelect    = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? [] : filtered.map(b => b.id))

  // ── Paid toggle ───────────────────────────────────────────────────────────
  async function handleTogglePaid(bill: Bill) {
    setTogglingPaidId(bill.id)
    try {
      const newPaid = Number(bill.is_paid) !== 1
      await api.toggleBillPaid(bill.id, newPaid)
      setBills(prev =>
        prev.map(b => b.id === bill.id ? { ...b, is_paid: newPaid ? 1 : 0 } : b)
      )
    } finally {
      setTogglingPaidId(null)
    }
  }

  // ── Printed toggle ────────────────────────────────────────────────────────
  async function handleTogglePrinted(bill: Bill) {
    setTogglingPrintedId(bill.id)
    try {
      const newPrinted = Number(bill.is_printed) !== 1
      await api.toggleBillPrinted(bill.id, newPrinted)
      setBills(prev =>
        prev.map(b => b.id === bill.id ? { ...b, is_printed: newPrinted ? 1 : 0 } : b)
      )
    } finally {
      setTogglingPrintedId(null)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id: number) {
    if (!confirm('Delete this bill?')) return
    setDeleting(id)
    try {
      await api.deleteBill(id)
      setBills(bills.filter(b => b.id !== id))
      setSelectedIds(prev => prev.filter(x => x !== id))
    } finally {
      setDeleting(null)
    }
  }

  async function handleDeleteSelected() {
    if (!anySelected || !confirm(`Delete ${selectedIds.length} selected bill(s)?`)) return
    setLoading(true)
    try {
      await Promise.all(selectedIds.map(id => api.deleteBill(id)))
      setBills(bills.filter(b => !selectedIds.includes(b.id)))
      setSelectedIds([])
    } finally {
      setLoading(false)
    }
  }

  // ── WhatsApp share ────────────────────────────────────────────────────────
  const whatsappMessage = (bill: Bill) =>
    encodeURIComponent(
      `NKV Bill: ${serialLabel(bill)}\nPatti: ${bill.patti_name}\nDate: ${formatDate(bill.date)}\nTotal: ${formatCurrency(bill.total_amount)}\nNet: ${formatCurrency(bill.net_amount)}\nPrint: ${window.location.origin}/admin/bills/${bill.id}/print`
    )

  async function handleShareBillWhatsapp(bill: Bill) {
    if (!settings) { setShareStatus('Settings not loaded.'); return }
    setShareStatus('Generating invoice PDF...')
    try {
      const blob = await createBillPDF(bill, settings)
      const file = new File([blob], `nkv-bill-${serialLabel(bill)}.pdf`, { type: 'application/pdf' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: `NKV Bill ${serialLabel(bill)}`, text: `Bill ${serialLabel(bill)}`, files: [file] })
        setShareStatus('PDF shared via system share.')
      } else {
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href = url; a.download = `nkv-bill-${serialLabel(bill)}.pdf`
        document.body.appendChild(a); a.click()
        document.body.removeChild(a); URL.revokeObjectURL(url)
        window.open(`https://wa.me/?text=${whatsappMessage(bill)}`, '_blank')
        setShareStatus('PDF downloaded; WhatsApp Web opened.')
      }
    } catch (error: any) {
      setShareStatus('Share failed: ' + (error?.message ?? 'Unknown error'))
    }
  }

  const serialLabel = (b: Bill) => {
    const d = b.date.replace(/-/g, '').slice(2)
    return `${d}-${String(b.serial_number).padStart(3, '0')}`
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-forest flex items-center gap-2">
            <Receipt size={22} className="text-forest/70" />
            Bills
          </h1>
          <p className="text-forest/50 text-sm mt-0.5">
            {filtered.length} bill{filtered.length !== 1 ? 's' : ''} &mdash; {date}
          </p>
        </div>
        <Link to="/admin/bills/new" className="btn-primary gap-2">
          <Plus size={16} /> New Bill
        </Link>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="card flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={15} className="text-forest/40 shrink-0" />
          <input
            className="input flex-1"
            placeholder="Search patti name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-forest/40 shrink-0" />
          <input
            type="date"
            className="input w-auto"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="card relative overflow-hidden py-5 border border-forest/10">
            <div className="absolute inset-0 bg-gradient-to-br from-forest/5 to-transparent pointer-events-none rounded-xl" />
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-forest/10 flex items-center justify-center shrink-0">
                <TrendingUp size={18} className="text-forest" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-forest/40 uppercase tracking-widest mb-0.5">Total Bills</p>
                <p className="text-xl font-bold text-forest leading-none">{filtered.length}</p>
                <p className="text-xs text-forest/60 font-semibold mt-1 tabular-nums">
                  {formatCurrency(paidAmount + unpaidAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="card relative overflow-hidden py-5 border-l-4 border-l-emerald-400 border border-emerald-100">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 to-transparent pointer-events-none rounded-xl" />
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-emerald-600/60 uppercase tracking-widest mb-0.5">Paid</p>
                <p className="text-xl font-bold text-emerald-700 leading-none">
                  {paidBills.length}<span className="text-sm font-medium text-emerald-600/70 ml-1">bills</span>
                </p>
                <p className="text-xs font-semibold text-emerald-600 mt-1 tabular-nums">{formatCurrency(paidAmount)}</p>
              </div>
            </div>
          </div>

          <div className="card relative overflow-hidden py-5 border-l-4 border-l-red-400 border border-red-100">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50/60 to-transparent pointer-events-none rounded-xl" />
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Circle size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-red-500/60 uppercase tracking-widest mb-0.5">Unpaid</p>
                <p className="text-xl font-bold text-red-600 leading-none">
                  {unpaidBills.length}<span className="text-sm font-medium text-red-500/70 ml-1">bills</span>
                </p>
                <p className="text-xs font-semibold text-red-500 mt-1 tabular-nums">{formatCurrency(unpaidAmount)}</p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── Bulk actions ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={handleDeleteSelected}
          disabled={!anySelected}
          className="btn-danger text-sm gap-1.5"
        >
          <Trash2 size={14} /> Delete selected
        </button>
        {anySelected && (
          <span className="text-sm text-forest/60 font-medium">{selectedIds.length} selected</span>
        )}
        {shareStatus && (
          <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full font-medium">
            {shareStatus}
          </span>
        )}
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-forest/40">
          <Loader2 className="animate-spin" size={30} />
          <p className="text-sm font-medium">Loading bills…</p>
        </div>

      ) : filtered.length === 0 ? (
        <div className="card text-center py-20 border border-dashed border-forest/20">
          <div className="w-14 h-14 rounded-2xl bg-forest/8 flex items-center justify-center mx-auto mb-4">
            <Receipt size={24} className="text-forest/30" />
          </div>
          <p className="text-lg font-semibold text-forest/40 mb-1">No bills found</p>
          <p className="text-sm text-forest/30 mb-5">
            {search ? 'Try a different search term' : 'Create your first bill for this date'}
          </p>
          <Link to="/admin/bills/new" className="btn-primary inline-flex gap-2">
            <Plus size={16} /> Create First Bill
          </Link>
        </div>

      ) : (
        <div className="card overflow-x-auto p-0 border border-forest/8 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-forest/5 border-b border-forest/8">
                <th className="py-3 px-4 text-left w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="accent-forest rounded"
                  />
                </th>
                {['#', 'Serial', 'Patti Name', 'Bags', 'Gross Amount', 'Net Amount', 'Payment', 'Print', 'Actions'].map(h => (
                  <th
                    key={h}
                    className="text-left py-3 px-4 text-[11px] font-semibold text-forest/50 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-forest/5">
              {filtered.map((bill, i) => {
                const paid        = Number(bill.is_paid)    === 1
                const printed     = Number(bill.is_printed) === 1
                const isTogPaid   = togglingPaidId    === bill.id
                const isTogPrint  = togglingPrintedId === bill.id
                const isSelected  = selectedIds.includes(bill.id)

                return (
                  <tr
                    key={bill.id}
                    className={`transition-colors duration-150 ${
                      isSelected
                        ? 'bg-forest/5'
                        : paid
                          ? 'bg-emerald-50/30 hover:bg-emerald-50/50'
                          : 'hover:bg-forest/[0.03]'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(bill.id)}
                        className="accent-forest rounded"
                      />
                    </td>

                    {/* Row # */}
                    <td className="py-3 px-4 text-forest/30 text-xs font-medium w-8">{i + 1}</td>

                    {/* Serial */}
                    <td className="py-3 px-4">
                      <span className="inline-block font-mono text-[11px] font-bold tracking-wide
                        bg-lemon/20 text-forest border border-lemon/40 rounded-md px-2 py-0.5">
                        {serialLabel(bill)}
                      </span>
                    </td>

                    {/* Patti Name */}
                    <td className="py-3 px-4 font-semibold text-forest">{bill.patti_name}</td>

                    {/* Bags */}
                    <td className="py-3 px-4 text-forest/60 tabular-nums">{bill.total_bags}</td>

                    {/* Gross */}
                    <td className="py-3 px-4 font-semibold text-forest tabular-nums">
                      {formatCurrency(bill.total_amount)}
                    </td>

                    {/* Net */}
                    <td className="py-3 px-4 font-bold text-emerald-700 tabular-nums">
                      {formatCurrency(bill.net_amount)}
                    </td>

                    {/* ── Paid toggle ── */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleTogglePaid(bill)}
                        disabled={isTogPaid}
                        title={paid ? 'Mark as Unpaid' : 'Mark as Paid'}
                        className={`
                          inline-flex items-center justify-center gap-1.5
                          w-[82px] px-3 py-1.5 rounded-full text-xs font-bold
                          transition-all duration-200 select-none
                          disabled:opacity-60 disabled:cursor-not-allowed
                          ${paid
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 ring-1 ring-emerald-300'
                            : 'bg-red-50 text-red-500 hover:bg-red-100 ring-1 ring-red-200'
                          }
                        `}
                      >
                        {isTogPaid
                          ? <Loader2 size={11} className="animate-spin shrink-0" />
                          : paid
                            ? <CheckCircle2 size={11} className="shrink-0" />
                            : <Circle size={11} className="shrink-0" />
                        }
                        <span>{paid ? 'Paid' : 'Unpaid'}</span>
                      </button>
                    </td>

                    {/* ── Printed toggle ── */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleTogglePrinted(bill)}
                        disabled={isTogPrint}
                        title={printed ? 'Mark as Not Printed' : 'Mark as Printed'}
                        className={`
                          inline-flex items-center justify-center gap-1.5
                          w-[96px] px-3 py-1.5 rounded-full text-xs font-bold
                          transition-all duration-200 select-none
                          disabled:opacity-60 disabled:cursor-not-allowed
                          ${printed
                            ? 'bg-sky-100 text-sky-700 hover:bg-sky-200 ring-1 ring-sky-300'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 ring-1 ring-slate-300'
                          }
                        `}
                      >
                        {isTogPrint
                          ? <Loader2 size={11} className="animate-spin shrink-0" />
                          : <Printer size={11} className="shrink-0" />
                        }
                        <span>{printed ? 'Printed' : 'Not Printed'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-0.5">
                        <Link
                          to={`/admin/bills/${bill.id}`}
                          className="p-1.5 rounded-lg hover:bg-forest/10 text-forest/40 hover:text-forest transition-colors"
                          title="View"
                        ><Eye size={15} /></Link>
                        <Link
                          to={`/admin/bills/${bill.id}/edit`}
                          className="p-1.5 rounded-lg hover:bg-forest/10 text-forest/40 hover:text-forest transition-colors"
                          title="Edit"
                        ><Edit size={15} /></Link>
                        <Link
                          to={`/admin/bills/${bill.id}/print`}
                          target="_blank"
                          className="p-1.5 rounded-lg hover:bg-forest/10 text-forest/40 hover:text-forest transition-colors"
                          title="Print"
                        ><Printer size={15} /></Link>
                        <button
                          onClick={() => handleDelete(bill.id)}
                          disabled={deleting === bill.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-forest/30 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          {deleting === bill.id
                            ? <Loader2 size={15} className="animate-spin" />
                            : <Trash2 size={15} />
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>

            {/* ── Footer totals ──────────────────────────────────────────────── */}
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-forest/10 bg-forest/[0.04]">
                  <td colSpan={5} className="py-3 px-4">
                    <span className="text-[11px] font-semibold text-forest/40 uppercase tracking-wider">
                      Total &mdash; {filtered.length} bill{filtered.length !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-forest tabular-nums">
                    {formatCurrency(filtered.reduce((s, b) => s + Number(b.total_amount), 0))}
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-700 tabular-nums">
                    {formatCurrency(filtered.reduce((s, b) => s + Number(b.net_amount), 0))}
                  </td>
                  <td className="py-3 px-4" colSpan={3}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold">
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 size={11} />
                        <span className="tabular-nums">{formatCurrency(paidAmount)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-red-500">
                        <Circle size={11} />
                        <span className="tabular-nums">{formatCurrency(unpaidAmount)}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-sky-600">
                        <Printer size={11} />
                        <span className="tabular-nums">
                          {filtered.filter(b => Number(b.is_printed) === 1).length} printed
                        </span>
                      </span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}