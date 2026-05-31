// src/pages/admin/PattiReport.tsx
import { useState, useEffect, useCallback } from 'react'
import { api, PattiPurchase, formatCurrency, formatDate } from '../../lib/api'
import { Search, FileDown, Loader2, CalendarRange, X } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logos from '../../assets/logo.png'

function fmt(n: number | string) {
  const v = Number(n)
  return Number.isFinite(v)
    ? 'Rs ' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '-'
}

// ───────── CONVERT YYYY-MM-DD → DD/MM/YYYY ─────────
function fmtDateInput(d: string): string {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

// ───────── BASE64 LOADER ─────────
async function loadImageBase64(url: string): Promise<string> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

// ───────── HEADER HEIGHT CONSTANT ─────────
// Header band bottom = y:5 + 45 = y:50.
// Date line at y:46, filter line at y:55 (only page 1).
// All pages need table rows to start below y:52 at minimum.
const HEADER_BOTTOM = 52   // px — table top margin for page 2+
const PAGE1_START_NO_FILTER = 60
const PAGE1_START_WITH_FILTER = 65

async function generatePDF(
  rows: PattiPurchase[],
  f: { patti: string; from: string; to: string }
): Promise<Blob> {
  const doc = new jsPDF()
  const pageWidth  = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const logoB64 = await loadImageBase64(logos)

  // ── Helper: draw the repeating header band ──
  function drawHeader() {
    // Border frame
    doc.setDrawColor(26, 58, 42)
    doc.setLineWidth(0.8)
    doc.rect(5, 5, 200, 287)

    // Header background
    doc.setFillColor(26, 58, 42)
    doc.rect(5, 5, 200, 45, 'F')

    // Contacts
    doc.setFontSize(8)
    doc.setTextColor(220, 240, 230)
    doc.text('Sonu : 7013285158, 7893287215', 10, 12)
    doc.text('Bujji : 8639826163', pageWidth - 10, 12, { align: 'right' })

    // Logo
    doc.addImage(logoB64, 'PNG', (pageWidth - 26) / 2, 12, 26, 18)

    // Business name
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(255, 213, 0)
    doc.text('NKV \u2014 Bombay Lemon Traders', pageWidth / 2, 32, { align: 'center' })

    // Address
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(200, 230, 210)
    doc.text(
      'Agricultural Market Yard, Tadipatri, Andhra Pradesh, India.',
      pageWidth / 2, 37, { align: 'center' }
    )

    // Report title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text('Patti Date Range Report', pageWidth / 2, 43, { align: 'center' })

    // Print date
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(200, 230, 210)
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2, 48, { align: 'center' })
  }

  // ── Helper: draw watermark ──
  function drawWatermark() {
    try {
      const gState = new (doc as any).GState({ opacity: 0.05 })
      doc.setGState(gState)
      doc.addImage(logoB64, 'PNG', 55, 120, 100, 100)
      doc.setGState(new (doc as any).GState({ opacity: 1 }))
    } catch {}
  }

  // ── Draw first page header ──
  drawHeader()
  drawWatermark()

  // ── Filter line (page 1 only, below header) ──
  const parts: string[] = []
  if (f.patti) parts.push(`Patti: ${f.patti}`)
  if (f.from)  parts.push(`From: ${fmtDateInput(f.from)}`)   // ✅ DD/MM/YYYY
  if (f.to)    parts.push(`To: ${fmtDateInput(f.to)}`)       // ✅ DD/MM/YYYY

  if (parts.length) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(50, 50, 50)
    doc.text(parts.join('   |   '), pageWidth / 2, 57, { align: 'center' })
  }

  // ── Totals ──
  const totalBags   = rows.reduce((s, r) => s + Number(r.total_bags),   0)
  const totalAmount = rows.reduce((s, r) => s + Number(r.total_amount), 0)
  const totalNet    = rows.reduce((s, r) => s + Number(r.net_amount),   0)

  // ── Table ──
  autoTable(doc, {
    head: [['S.No', 'Patti Name', 'Date', 'Bags', 'Total Amount', 'Net Amount']],
    body: rows.map((r, i) => [
      i + 1,
      r.patti_name,
      new Date(r.date).toLocaleDateString('en-IN'),
      r.total_bags,
      fmt(r.total_amount),
      fmt(r.net_amount),
    ]),
    foot: [['', 'TOTAL', '', totalBags, fmt(totalAmount), fmt(totalNet)]],

    showFoot: 'lastPage',

    startY: parts.length ? PAGE1_START_WITH_FILTER : PAGE1_START_NO_FILTER,

    // ✅ FIX: top margin ensures rows on page 2+ start BELOW the redrawn header
    margin: { top: HEADER_BOTTOM, left: 20, right: 20 },

    styles: {
      fontSize: 9,
      cellPadding: 1.2,
      minCellHeight: 5,
      textColor: [40, 40, 40],
      lineColor: [200, 200, 200],
      lineWidth: 0.2,
      valign: 'middle',
    },

    headStyles: {
      fillColor: false,
      textColor: [26, 58, 42],
      fontStyle: 'bold',
      halign: 'center',
    },

    footStyles: {
      fillColor: false,
      textColor: [20, 60, 30],
      fontStyle: 'bold',
      halign: 'right',
    },

    alternateRowStyles: { fillColor: false },

    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { halign: 'left' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
    },

    // ✅ FIX: redraw header + watermark on every continuation page
    didDrawPage: (_data) => {
      drawWatermark()
      drawHeader()
    },
  })

  // ── Footer ──
  const pageCount = (doc as any).internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(150)
    doc.text(
      `Generated: ${new Date().toLocaleString('en-IN')}   |   Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    )
  }

  return doc.output('blob')
}


function buildWAText(rows: PattiPurchase[], f: { patti: string; from: string; to: string }): string {
  const totalBags   = rows.reduce((s, r) => s + Number(r.total_bags),   0)
  const totalAmount = rows.reduce((s, r) => s + Number(r.total_amount), 0)
  const totalNet    = rows.reduce((s, r) => s + Number(r.net_amount),   0)

  const lines = ['*NKV \u2014 Bombay Lemon Traders*', '*Custom Date Patti Report*']
  if (f.from && f.to) lines.push(`\uD83D\uDCC5 ${fmtDateInput(f.from)} \u2192 ${fmtDateInput(f.to)}`)
  else if (f.from)    lines.push(`\uD83D\uDCC5 From: ${fmtDateInput(f.from)}`)
  else if (f.to)      lines.push(`\uD83D\uDCC5 To: ${fmtDateInput(f.to)}`)
  if (f.patti)        lines.push(`\uD83D\uDD0D Patti: ${f.patti}`)
  lines.push('')
  rows.forEach((r, i) => {
    lines.push(
      `${i + 1}. *${r.patti_name}*\n` +
      `   \uD83D\uDDD3 ${new Date(r.date).toLocaleDateString('en-IN')}` +
      `  \uD83D\uDCE6 ${r.total_bags} bags` +
      `  \uD83D\uDCB0 Rs ${Number(r.net_amount).toLocaleString('en-IN')}`
    )
  })
  lines.push('', '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500')
  lines.push(`*Total Bags   : ${totalBags}*`)
  lines.push(`*Total Amount : Rs ${totalAmount.toLocaleString('en-IN')}*`)
  lines.push(`*Net Amount   : Rs ${totalNet.toLocaleString('en-IN')}*`)
  return lines.join('\n')
}

export default function PattiReport() {
  const [patti,   setPatti]   = useState('')
  const [from,    setFrom]    = useState('')
  const [to,      setTo]      = useState('')
  const [results, setResults] = useState<PattiPurchase[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const totalBags   = results.reduce((s, r) => s + Number(r.total_bags),   0)
  const totalAmount = results.reduce((s, r) => s + Number(r.total_amount), 0)
  const totalNet    = results.reduce((s, r) => s + Number(r.net_amount),   0)

  const doFetch = useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .getPattiPurchases({ patti, from, to })
      .then(data => {
  const sorted = [...data].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })
  setResults(sorted)
})
      .catch(err => {
        setResults([])
        setError(err?.message ?? 'Failed to load data')
      })
      .finally(() => setLoading(false))
  }, [patti, from, to])

  useEffect(() => {
    const t = setTimeout(doFetch, 350)
    return () => clearTimeout(t)
  }, [doFetch])

  async function handlePDF() {
    if (!results.length) return
    const blob = await generatePDF(results, { patti, from, to })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `nkv-patti${from ? '-' + fmtDateInput(from).replace(/\//g, '-') : ''}${to ? '-to-' + fmtDateInput(to).replace(/\//g, '-') : ''}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleWA() {
    if (!results.length || sharing) return
    setSharing(true)
    try {
      const blob = await generatePDF(results, { patti, from, to })
      const file = new File([blob], 'nkv-patti-report.pdf', { type: 'application/pdf' })
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'NKV Patti Report', files: [file] })
        return
      }
      window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(buildWAText(results, { patti, from, to }))}`, '_blank')
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(buildWAText(results, { patti, from, to }))}`, '_blank')
      }
    } finally {
      setSharing(false)
    }
  }

  const hasFilter = patti || from || to

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-forest flex items-center gap-2">
            <CalendarRange size={22} className="text-lemon" />
            Patti Report
          </h1>
          <p className="text-forest/50 text-sm mt-0.5">
            {loading ? 'Loading…' : `${results.length} record${results.length !== 1 ? 's' : ''}${hasFilter ? ' (filtered)' : ''}`}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handlePDF}
            disabled={!results.length || loading}
            className="btn-ghost text-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown size={15} /> PDF
          </button>

          <button
            onClick={handleWA}
            disabled={!results.length || loading || sharing}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg font-medium
                       bg-[#25D366] hover:bg-[#1fbe5e] text-white transition-colors
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sharing
              ? <Loader2 size={14} className="animate-spin" />
              : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              )
            }
            WhatsApp
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Search size={15} className="text-forest/40 shrink-0" />
          <input
            className="input flex-1"
            placeholder="Search patti name…"
            value={patti}
            onChange={e => setPatti(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-forest/50 uppercase tracking-wide shrink-0">From</label>
          <input type="date" className="input w-auto" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-forest/50 uppercase tracking-wide shrink-0">To</label>
          <input type="date" className="input w-auto" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        {hasFilter && (
          <button
            onClick={() => { setPatti(''); setFrom(''); setTo('') }}
            className="flex items-center gap-1 text-xs text-forest/40 hover:text-red-500 transition-colors"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="card bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          ⚠ {error}
        </div>
      )}

      {/* Summary cards */}
      {!loading && !error && results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card py-3 px-4 text-center">
            <div className="text-xl font-bold text-red-600">{results.length}</div>
            <div className="text-[10px] text-green-600 mt-0.5 uppercase tracking-wide">Bills</div>
          </div>
          <div className="card py-3 px-4 text-center">
            <div className="text-xl font-bold text-red-600">{totalBags.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-green-600 mt-0.5 uppercase tracking-wide">Total Bags</div>
          </div>
          <div className="card py-3 px-4 text-center">
            <div className="text-xl font-bold text-red-600">{formatCurrency(totalAmount)}</div>
            <div className="text-[10px] text-green-600 mt-0.5 uppercase tracking-wide">Total Amount</div>
          </div>
          <div className="card py-3 px-4 text-center">
            <div className="text-xl font-bold text-green-600">{formatCurrency(totalNet)}</div>
            <div className="text-[10px] text-green-600 mt-0.5 uppercase tracking-wide">Net Amount</div>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-forest" size={30} />
        </div>
      ) : results.length === 0 ? (
        <div className="card text-center py-20">
          <CalendarRange size={40} className="mx-auto text-forest/15 mb-3" />
          <p className="text-red-600 text-sm">No patti records found</p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-forest/5 border-b border-forest/10">
              <tr>
                {['S:No', 'Patti Name', 'Serial Number', 'Date', 'Bags', 'Total Amount', 'Net Amount'].map(h => (
                  <th key={h} className="text-left py-3 px-4 font-semibold text-blue-600 text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr
                  key={r.id ?? i}
                  className="border-t border-forest/5 hover:bg-forest/[0.03] transition-colors"
                >
                  <td className="py-3 px-4 text-forest/30 text-xs">{i + 1}</td>
                  <td className="py-3 px-4 font-semibold text-forest">{r.patti_name}</td>
                  <td className="py-3 px-4 text-forest/60">
                    {`${r.date?.replace(/-/g, '').slice(2)}-${String(r.serial_number ?? 0).padStart(3, '0')}`}
                  </td>
                  <td className="py-3 px-4 text-forest/60">{formatDate(r.date)}</td>
                  <td className="py-3 px-4 tabular-nums">{Number(r.total_bags ?? 0).toLocaleString('en-IN')}</td>
                  <td className="py-3 px-4 tabular-nums font-medium">{formatCurrency(r.total_amount ?? 0)}</td>
                  <td className="py-3 px-4 tabular-nums font-semibold text-green-600">{formatCurrency(r.net_amount ?? 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-forest/20 bg-forest/10">
                <td colSpan={4} className="py-3 px-4 font-bold text-xs uppercase tracking-wide text-red-800 text-center">
                  Total
                </td>
                <td className="py-3 px-4 font-bold text-forest tabular-nums">{totalBags.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 font-bold text-forest tabular-nums">{formatCurrency(totalAmount)}</td>
                <td className="py-3 px-4 font-bold text-green-700 tabular-nums">{formatCurrency(totalNet)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

