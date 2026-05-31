import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoheader from '../assets/logo.png'
import logo from '../assets/nkv-logo.png'

// ───────── DATE FORMAT HELPER (YYYY-MM-DD → DD-MM-YYYY) ─────────
const fmtDate = (d?: string): string => {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}-${m}-${y}`
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

export async function exportBuyerPDF(
  buyer: string,
  rows: any[],
  from?: string,
  to?: string
) {
  const doc = new jsPDF()
  const pageWidth  = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const HEADER_HEIGHT = 55
  const TABLE_START_Y = HEADER_HEIGHT + 10

  // ✅ Preload both images as base64 before drawing anything
  const [logoHeaderB64, logoWatermarkB64] = await Promise.all([
    loadImageBase64(logoheader),
    loadImageBase64(logo),
  ])

  // ✅ SAFE FORMAT
  const formatINR = (val: number) =>
    `Rs. ${Number(val).toLocaleString('en-IN')}`

  // ───────── WATERMARK ─────────
  const drawWatermark = () => {
    try {
      const gState = new (doc as any).GState({ opacity: 0.05 })
      doc.setGState(gState)
      doc.addImage(logoWatermarkB64, 'PNG', pageWidth / 2 - 35, pageHeight / 2 - 35, 70, 70)
      doc.setGState(new (doc as any).GState({ opacity: 1 }))
    } catch (e) {
      console.log('Watermark error', e)
    }
  }

  // ───────── HEADER ─────────
  const drawHeader = () => {
    doc.setFillColor(26, 58, 42)
    doc.rect(0, 0, pageWidth, HEADER_HEIGHT, 'F')

    const LEFT  = 10
    const RIGHT = pageWidth - 10

    // NAMES
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 215, 0)
    doc.setFontSize(10)
    doc.text('SONU',  LEFT,  22)
    doc.text('BUJJI', RIGHT, 22, { align: 'right' })

    // PHONES
    doc.setFont('helvetica', 'normal')
    doc.text('7013285158', LEFT, 28)
    doc.text('7893287215', LEFT, 33)
    doc.text('8639826163', RIGHT, 28, { align: 'right' })

    // LOGO — base64, always works
    doc.addImage(logoHeaderB64, 'PNG', pageWidth / 2 - 8, 4, 16, 16)

    // COMPANY NAME
    doc.setTextColor(255, 215, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('NKV Bombay Lemon Traders', pageWidth / 2, 24, { align: 'center' })

    // ADDRESS
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(
      'Agricultural market yard, Tadipatri, Andhra Pradesh.',
      pageWidth / 2, 30, { align: 'center' }
    )

    // BUYER + DATE RANGE
    doc.setFontSize(9)
    doc.text(`Buyer : ${buyer}`, pageWidth / 2, 37, { align: 'center' })
    doc.text(`${fmtDate(from)} - ${fmtDate(to)}`, pageWidth / 2, 43, { align: 'center' })
  }

  // ───────── FOOTER ─────────
  const drawFooter = (page: number, total: number) => {
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text('Developed by RukmanWebSolutions', 10, pageHeight - 6)
    doc.text(`Page ${page} / ${total}`, pageWidth - 10, pageHeight - 6, { align: 'right' })
  }

  // ───────── GROUP DATA ─────────
  const grouped: Record<string, any[]> = {}
  rows.forEach(r => {
    if (!grouped[r.patti_name]) grouped[r.patti_name] = []
    grouped[r.patti_name].push(r)
  })

  let body: any[] = []
  let total = 0

  Object.entries(grouped).forEach(([patti, items]) => {
    body.push([{
      content: `Patti: ${patti}`,
      colSpan: 4,
      styles: { fontStyle: 'bold' }
    }])

    let subTotal = 0
    items.forEach((r: any) => {
      const amount = Number(r.amount || 0)
      subTotal += amount
      total    += amount
      body.push([r.item_name || '-', r.bags || 0, r.rate || 0, formatINR(amount)])
    })

    body.push([{
      content: 'Subtotal',
      colSpan: 3,
      styles: { halign: 'right', fontStyle: 'bold' }
    }, formatINR(subTotal)])
  })

  // ───────── TABLE ─────────
  autoTable(doc, {
    startY: TABLE_START_Y,
    margin: { top: TABLE_START_Y, bottom: 15 },

    head: [['Item', 'Qty', 'Rate', 'Amount']],
    body,

    styles:     { fontSize: 10, cellPadding: 3, lineWidth: 0.2 },
    headStyles: { fillColor: [26, 58, 42], textColor: 255 },

    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'center', cellWidth: 35 },
      3: { halign: 'right',  cellWidth: 50 },
    },

    didDrawPage: () => {
      drawWatermark()
      drawHeader()
    },
  })

  // ───────── PAGE NUMBERS ─────────
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    drawFooter(i, pages)
  }

  // ───────── GRAND TOTAL ─────────
  const finalY = (doc as any).lastAutoTable?.finalY || TABLE_START_Y
  doc.setTextColor(26, 58, 42)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`Grand Total: ${formatINR(total)}`, pageWidth - 10, finalY + 10, { align: 'right' })

  // ───────── SAVE ─────────
  const safeBuyer = buyer || 'Unknown'
  const today = new Date()
  const dd    = String(today.getDate()).padStart(2, '0')
  const mm    = String(today.getMonth() + 1).padStart(2, '0')
  const yyyy  = today.getFullYear()

  doc.save(`Buyer-Report-${safeBuyer}-${dd}-${mm}-${yyyy}.pdf`)
}