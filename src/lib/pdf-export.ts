// src/lib/pdf-export.ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { DashboardStats, BuyerPurchase, PattiPurchase } from './api'

function formatCurrencyPdf(n: number | string) {
  const value = Number(n)
  if (!Number.isFinite(value)) return '-'
  return 'Rs ' + value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function exportDashboardPDF(stats: DashboardStats, date: string, buyers: BuyerPurchase[]) {
  const doc = new jsPDF()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('NKV Bombay Lemon Traders', 14, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Dashboard Report — ${date}`, 14, 26)

  const tierHeaders = ['Metric', 'Today', 'Monthly', 'Yearly']
  const tierRows = [
    ['Total Bills', stats.today.total_bills, stats.month.total_bills, stats.year.total_bills],
    ['Total Bags', stats.today.total_bags, stats.month.total_bags, stats.year.total_bags],
    ['Gross Amount', formatCurrencyPdf(stats.today.total_amount), formatCurrencyPdf(stats.month.total_amount), formatCurrencyPdf(stats.year.total_amount)],
    ['Commission', formatCurrencyPdf(stats.today.total_commission), formatCurrencyPdf(stats.month.total_commission), formatCurrencyPdf(stats.year.total_commission)],
    ['Cooli', formatCurrencyPdf(stats.today.total_cooli), formatCurrencyPdf(stats.month.total_cooli), formatCurrencyPdf(stats.year.total_cooli)],
    ['Chariti', formatCurrencyPdf(stats.today.total_chariti), formatCurrencyPdf(stats.month.total_chariti), formatCurrencyPdf(stats.year.total_chariti)],
    ['Transport', formatCurrencyPdf(stats.today.total_transport), formatCurrencyPdf(stats.month.total_transport), formatCurrencyPdf(stats.year.total_transport)],
    ['Net Amount', formatCurrencyPdf(stats.today.total_net), formatCurrencyPdf(stats.month.total_net), formatCurrencyPdf(stats.year.total_net)],
  ]

  autoTable(doc, {
    head: [tierHeaders],
    body: tierRows as string[][],
    startY: 32,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [26, 58, 42] },
  })

  if (buyers.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Buyer Purchases', 14, finalY)

    autoTable(doc, {
      head: [['Buyer', 'Patti', 'Item', 'Bags', 'Amount', 'Bills']],
      body: buyers.map(b => [b.buyer_name, b.patti_name, b.item_name, b.total_bags, formatCurrencyPdf(b.total_amount), b.bill_count]),
      startY: finalY + 4,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 58, 42] },
    })
  }

  doc.save(`nkv-dashboard-${date}.pdf`)
}

export async function createBillPDF(bill: import('./api').Bill, settings: import('./api').Settings): Promise<Blob> {
  const doc = new jsPDF('p', 'pt', 'a4')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('NKV — Bombay Lemon Traders', 40, 40)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(settings.company_name || 'NKV — Bombay Lemon Traders', 40, 58)
  doc.text(settings.address || '', 40, 74)
  doc.text(`Phone: ${settings.phone || ''}`, 40, 90)

  doc.setFontSize(12)
  doc.text(`Patti: ${bill.patti_name}`, 40, 118)
  doc.text(`Date: ${new Date(bill.date).toLocaleDateString('en-IN')}`, 40, 134)
  doc.text(`Bill No: ${bill.date.replace(/-/g, '').slice(2)}-${String(bill.serial_number).padStart(3, '0')}`, 40, 150)

  const itemRows = bill.items?.map((item, idx) => [
    `${idx + 1}`,
    item.buyer_name || '-',
    item.item_name,
    item.bags,
    item.rate.toFixed(2),
    (item.total ?? item.bags * item.rate).toFixed(2),
  ]) ?? []

  ;(autoTable as any)(doc, {
    startY: 170,
    head: [['#', 'Buyer', 'Item', 'Bags', 'Rate', 'Total']],
    body: itemRows,
    styles: { fontSize: 9 },
    theme: 'grid',
  })

  const finalY = (doc as any).lastAutoTable?.finalY || 200
  doc.setFontSize(10)
  doc.text(`Total Bags: ${bill.total_bags}`, 40, finalY + 20)
  doc.text(`Gross: ${formatCurrencyPdf(bill.total_amount)}`, 40, finalY + 36)
  doc.text(`Commission: -${formatCurrencyPdf(bill.commission)}`, 40, finalY + 52)
  doc.text(`Cooli: -${formatCurrencyPdf(bill.cooli)}`, 40, finalY + 68)
  doc.text(`Chariti: -${formatCurrencyPdf(bill.chariti)}`, 40, finalY + 84)
  doc.text(`Transport: -${formatCurrencyPdf(bill.transport)}`, 40, finalY + 100)
  doc.setFont('helvetica', 'bold')
  doc.text(`Net Payable: ${formatCurrencyPdf(bill.net_amount)}`, 40, finalY + 126)

  return doc.output('blob')
}

export function exportBuyersPDF(buyers: BuyerPurchase[], filters: { buyer?: string; from?: string; to?: string }) {
  const doc = new jsPDF()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('NKV — Bombay Lemon Traders', 14, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  let subtitle = 'Buyer Purchases Report'
  if (filters.from || filters.to) subtitle += ` | ${filters.from ?? ''} to ${filters.to ?? ''}`
  if (filters.buyer) subtitle += ` | Buyer: ${filters.buyer}`
  doc.text(subtitle, 14, 26)

  const buyerTotalBags = buyers.reduce((sum, b) => sum + Number(b.total_bags), 0)
  const buyerTotalAmount = buyers.reduce((sum, b) => sum + Number(b.total_amount), 0)

  autoTable(doc, {
    head: [['Buyer Name', 'Patti', 'Item', 'Total Bags', 'Total Amount', 'Bill Count']],
    body: [
      ...buyers.map((b) => [b.buyer_name, b.patti_name, b.item_name, b.total_bags, formatCurrencyPdf(b.total_amount), b.bill_count]),
      ['Total', '', '', buyerTotalBags, formatCurrencyPdf(buyerTotalAmount), buyers.reduce((sum, b) => sum + Number(b.bill_count), 0)],
    ],
    startY: 32,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [26, 58, 42] },
    footStyles: { fillColor: [230, 230, 230], fontStyle: 'bold' },
  })

  doc.save('nkv-buyers.pdf')
}

function formatSerialNumber(date: string, serialNumber: number) {
  return `${date.replace(/-/g, '').slice(2)}-${String(serialNumber).padStart(3, '0')}`
}

export function exportPattiPDF(rows: PattiPurchase[], filters: { patti?: string; from?: string; to?: string }) {
  const doc = new jsPDF()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('NKV - Bombay Lemon Traders', 14, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  let subtitle = 'Patti Search Report'
  if (filters.from || filters.to) subtitle += ` | ${filters.from ?? ''} to ${filters.to ?? ''}`
  if (filters.patti) subtitle += ` | Patti: ${filters.patti}`
  doc.text(subtitle, 14, 26)

  const totalBags = rows.reduce((sum, row) => sum + Number(row.total_bags), 0)
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.total_amount), 0)
  const totalNet = rows.reduce((sum, row) => sum + Number(row.net_amount), 0)

  autoTable(doc, {
    head: [['Patti Name', 'Date', 'Serial Number', 'Bags', 'Total Amount', 'Net Amount']],
    body: [
      ...rows.map((row) => [
        row.patti_name,
        new Date(row.date).toLocaleDateString('en-IN'),
        formatSerialNumber(row.date, row.serial_number),
        row.total_bags,
        formatCurrencyPdf(row.total_amount),
        formatCurrencyPdf(row.net_amount),
      ]),
      ['Overall Total', '', '', totalBags, formatCurrencyPdf(totalAmount), formatCurrencyPdf(totalNet)],
    ],
    startY: 32,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [26, 58, 42] },
  })

  const finalY = (doc as any).lastAutoTable?.finalY ?? 40
  doc.setFont('helvetica', 'bold')
  doc.text(`Overall Total Bags: ${totalBags}`, 14, finalY + 10)

  doc.save('nkv-patti-report.pdf')
}
