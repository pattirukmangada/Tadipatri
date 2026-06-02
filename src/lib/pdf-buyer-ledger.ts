// src/lib/pdf-buyer-ledger.ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoheader from '../assets/logo.png'
import logo      from '../assets/nkv-logo.png'

// ── Date helpers ────────────────────────────────────────────────────────────
const fmtDate = (d?: string): string => {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}-${m}-${y}`
}

async function loadImageBase64(url: string): Promise<string> {
  const res  = await fetch(url)
  const blob = await res.blob()
  return new Promise(resolve => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

const formatINR = (val: number): string =>
  `Rs. ${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// ── Types ───────────────────────────────────────────────────────────────────
export interface LedgerRow {
  date:            string
  description:     string
  type:            'debit' | 'credit'
  amount:          number
  ref_type:        'patti' | 'payment'
  running_balance?: number
}

export interface LedgerPDFOptions {
  buyer:        string
  from?:        string
  to?:          string
  totalDebit:   number
  totalCredit:  number
  balance:      number
}

// ── MAIN EXPORT ─────────────────────────────────────────────────────────────
export async function exportBuyerLedgerPDF(
  rows:    LedgerRow[],
  options: LedgerPDFOptions
) {
  const { buyer, from, to, totalDebit, totalCredit, balance } = options

  const doc        = new jsPDF()
  const pageWidth  = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const HEADER_HEIGHT = 55
  const TABLE_START_Y = HEADER_HEIGHT + 6

  // Preload images
  const [logoHeaderB64, logoWatermarkB64] = await Promise.all([
    loadImageBase64(logoheader),
    loadImageBase64(logo),
  ])

  // ── Watermark ──────────────────────────────────────────────────────────
  const drawWatermark = () => {
    try {
      const gState = new (doc as any).GState({ opacity: 0.05 })
      doc.setGState(gState)
      doc.addImage(logoWatermarkB64, 'PNG', pageWidth / 2 - 35, pageHeight / 2 - 35, 70, 70)
      doc.setGState(new (doc as any).GState({ opacity: 1 }))
    } catch (e) { /* skip */ }
  }

  // ── Header (same style as pdf-buyer) ──────────────────────────────────
  const drawHeader = () => {
    doc.setFillColor(26, 58, 42)
    doc.rect(0, 0, pageWidth, HEADER_HEIGHT, 'F')

    const LEFT  = 10
    const RIGHT = pageWidth - 10

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 215, 0)
    doc.setFontSize(10)
    doc.text('SONU',  LEFT,  22)
    doc.text('BUJJI', RIGHT, 22, { align: 'right' })

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(255, 215, 0)
    doc.text('7013285158', LEFT, 28)
    doc.text('7893287215', LEFT, 33)
    doc.text('8639826163', RIGHT, 28, { align: 'right' })

    doc.addImage(logoHeaderB64, 'PNG', pageWidth / 2 - 8, 4, 16, 16)

    doc.setTextColor(255, 215, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('NKV Bombay Lemon Traders', pageWidth / 2, 24, { align: 'center' })

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Agricultural market yard, Tadipatri, Andhra Pradesh.', pageWidth / 2, 30, { align: 'center' })

    // Statement title
    doc.setTextColor(255, 215, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('BUYER ACCOUNT STATEMENT', pageWidth / 2, 37, { align: 'center' })

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Buyer : ${buyer}`, pageWidth / 2, 43, { align: 'center' })

    if (from || to) {
      doc.text(`${fmtDate(from)} - ${fmtDate(to)}`, pageWidth / 2, 49, { align: 'center' })
    }
  }

  // ── Footer ─────────────────────────────────────────────────────────────
  const drawFooter = (page: number, total: number) => {
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text('Developed by RukmanWebSolutions', 10, pageHeight - 6)
    doc.text(`Page ${page} / ${total}`, pageWidth - 10, pageHeight - 6, { align: 'right' })
  }

  // ── Build table rows ───────────────────────────────────────────────────
  const body: any[] = rows.map(r => {
    const isDebit  = r.type === 'debit'
    const isPatti  = r.ref_type === 'patti'
    const balance  = r.running_balance ?? 0

    return [
      fmtDate(r.date),
      {
        content: r.description,
        styles: { fontStyle: isPatti ? 'bold' : 'normal' },
      },
      isPatti ? 'Patti' : (isDebit ? 'Debit' : 'Credit'),
      isDebit  ? formatINR(r.amount) : '',
      !isDebit ? formatINR(r.amount) : '',
      {
        content: formatINR(Math.abs(balance)) + (balance < 0 ? ' CR' : ''),
        styles: { textColor: balance > 0 ? [180, 0, 0] : [0, 120, 0] },
      },
    ]
  })

  // ── Table ──────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY:  TABLE_START_Y,
    margin:  { top: TABLE_START_Y, bottom: 20 },

    head: [['Date', 'Description', 'Type', 'Debit', 'Credit', 'Balance']],
    body,

    styles:     { fontSize: 9, cellPadding: 2.5, lineWidth: 0.2 },
    headStyles: { fillColor: [26, 58, 42], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 248] },

    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 65 },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 29, halign: 'right' },
    },

    didDrawPage: () => {
      drawWatermark()
      drawHeader()
    },
  })

  // ── Summary block ──────────────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable?.finalY ?? TABLE_START_Y
  const sumY   = finalY + 8

  // Summary background
  doc.setFillColor(26, 58, 42)
  doc.roundedRect(10, sumY, pageWidth - 20, 24, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)

  // Total Debit
  doc.setTextColor(255, 150, 150)
  doc.text('Total Debit', 16, sumY + 8)
  doc.setTextColor(255, 200, 200)
  doc.text(formatINR(totalDebit), 16, sumY + 15)

  // Total Credit
  doc.setTextColor(150, 255, 180)
  doc.text('Total Credit', pageWidth / 2, sumY + 8, { align: 'center' })
  doc.setTextColor(200, 255, 220)
  doc.text(formatINR(totalCredit), pageWidth / 2, sumY + 15, { align: 'center' })

  // Balance Due
  doc.setTextColor(255, 215, 0)
  doc.text('Balance Due', pageWidth - 16, sumY + 8, { align: 'right' })
  doc.setTextColor(255, 235, 100)
  doc.setFontSize(11)
  doc.text(formatINR(Math.abs(balance)) + (balance < 0 ? ' CR' : ''), pageWidth - 16, sumY + 16, { align: 'right' })

  // ── Page numbers ───────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    drawFooter(i, pages)
  }

  // ── Save ───────────────────────────────────────────────────────────────
  const today = new Date()
  const dd    = String(today.getDate()).padStart(2, '0')
  const mm    = String(today.getMonth() + 1).padStart(2, '0')
  const yyyy  = today.getFullYear()
  doc.save(`Ledger-${buyer || 'All'}-${dd}-${mm}-${yyyy}.pdf`)
}