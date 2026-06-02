// // src/lib/print-thermal.ts
// export type PrintLang = 'en' | 'te'

// // ── LABEL SETS ─────────────────────────────────────────────────────────────
// const LABELS = {
//   en: {
//     title:        'NKV Bombay Lemon Traders',
//     subTitle:     'Lemon Merchant, Commission Agent & Exporter',
//     address:      'Agricultural Market Yard, Tadipatri, Andhra Pradesh, India.',
//     reportLabel:  'Buyer Report',
//     pattiPrefix:  'Patti:',
//     subBags:      'Sub Bags',
//     subTotal:     'Sub Total',
//     totalBags:    'Total Bags',
//     totalAmount:  'Total Amount',
//     discount:     'Discount 3%',
//     finalAmount:  'Final Amount',
//     thankYou:     'Thank You',
//     visitAgain:   'Visit Again',
//   },
//   te: {
//     title:        'NKV Bombay Lemon Traders',
//     subTitle:     'Lemon Merchant, Commission Agent & Exporter',
//     address:      'Agricultural Market Yard, Tadipatri, Andhra Pradesh, India.',
//     reportLabel:  'కొనుగోలుదారుల నివేదిక',
//     pattiPrefix:  'పట్టి:',
//     subBags:      'ఉప సంచులు',
//     subTotal:     'ఉప మొత్తం',
//     totalBags:    'మొత్తం సంచులు',
//     totalAmount:  'మొత్తం మొత్తం',
//     discount:     'డిస్కౌంట్ 3%',
//     finalAmount:  'చివరి మొత్తం',
//     thankYou:     'ధన్యవాదాలు',
//     visitAgain:   'Visit Again',
//   },
// }

// // ── DATE FORMAT ─────────────────────────────────────────────────────────────
// function formatDate(dateStr?: string): string {
//   if (!dateStr) return ''
//   const [y, m, d] = dateStr.split('-')
//   return `${d}-${m}-${y}`
// }

// // ── MAIN FUNCTION ───────────────────────────────────────────────────────────
// export function printBuyerThermal(
//   buyerName: string,
//   rows: any[],
//   filters: { from?: string; to?: string },
//   lang: PrintLang = 'en'
// ) {
//   const L = LABELS[lang]

//   // ── Group rows by patti_name ────────────────────────────────────────────
//   const grouped: Record<string, any[]> = {}
//   rows.forEach(r => {
//     if (!grouped[r.patti_name]) grouped[r.patti_name] = []
//     grouped[r.patti_name].push(r)
//   })

//   let totalBags   = 0
//   let totalAmount = 0

//   // ── Header block ───────────────────────────────────────────────────────
//   let content = `
//     <div class="receipt">

//       <div class="heading">NKV Bombay Lemon Traders</div>
//       <div class="subheading">${L.subTitle}</div>
//       <div class="subheading">${L.address}</div>

//       <div class="divider-double"></div>

//       <div class="details">
//         <div>
//           <div class="contact-name">Sonu</div>
//           <div class="contact-num">7013285158</div>
//           <div class="contact-num">7893287215</div>
//         </div>
//         <div class="center">
//           <div class="contact-name">Bujji</div>
//           <div class="contact-num">8639826163</div>
//         </div>
//       </div>

//       <div class="divider-double"></div>

//       <div class="section-label">${L.reportLabel}</div>
//       <div class="buyer-name">${buyerName}</div>
//       <div class="date-range">${formatDate(filters.from)} &nbsp;—&nbsp; ${formatDate(filters.to)}</div>

//       <div class="divider-double"></div>
//   `

//   // ── Per-patti blocks ───────────────────────────────────────────────────
//   Object.entries(grouped).forEach(([patti, items]) => {
//     let subBags   = 0
//     let subAmount = 0

//     content += `<div class="patti-label">${L.pattiPrefix} ${patti}</div>`

//     items.forEach(r => {
//       const bags   = Number(r.bags   || 0)
//       const rate   = Number(r.rate   || 0)
//       const amount = Number(r.amount || 0)

//       subBags   += bags
//       subAmount += amount

//       content += `
//         <div class="item">
//           <span class="item-desc">${r.item_name} &nbsp; ${bags} x ${rate}</span>
//           <span class="item-amt">Rs.${amount}</span>
//         </div>
//       `
//     })

//     totalBags   += subBags
//     totalAmount += subAmount

//     content += `
//       <div class="divider-dashed"></div>
//       <div class="sub-row">
//         <span>${L.subBags}</span>
//         <span class="bold">${subBags}</span>
//       </div>
//       <div class="sub-row">
//         <span>${L.subTotal}</span>
//         <span class="bold">Rs.${subAmount}</span>
//       </div>
//       <div class="divider-double"></div>
//     `
//   })

//   // ── Grand total block ──────────────────────────────────────────────────
//   const discount    = Math.round(totalAmount * 0.03)
//   const finalAmount = Math.ceil(totalAmount - discount)

//   content += `
//     <div class="totals-block">
//       <div class="total-row">
//         <span>${L.totalBags}</span>
//         <span>${totalBags}</span>
//       </div>
//       <div class="total-row">
//         <span>${L.totalAmount}</span>
//         <span>Rs.${totalAmount}</span>
//       </div>
//       <div class="divider-dashed"></div>
//       <div class="total-row">
//         <span>${L.discount}</span>
//         <span>- Rs.${discount.toFixed(0)}</span>
//       </div>
//       <div class="divider-dashed"></div>
//       <div class="final-row">
//         <span>${L.finalAmount}</span>
//         <span>Rs.${finalAmount.toFixed(0)}</span>
//       </div>
//     </div>

//     <div class="divider-double"></div>

//     <div class="footer-msg">${L.thankYou}</div>
//     <div class="footer-msg">${L.visitAgain}</div>

//     <div class="divider-double"></div>

//     <div class="dev-credit">Developed by RukmanWebSolutions</div>

//     <div class="divider-double"></div>
//     </div>
//   `

//   // ── Open print window ──────────────────────────────────────────────────
//   const win = window.open('', '', 'width=320,height=640')
//   if (!win) return

//   const fontFamily = lang === 'te'
//     ? `'Noto Sans Telugu', 'Gautami', 'Vani', monospace`
//     : `'Courier New', Courier, monospace`

//   win.document.write(`
//     <html>
//       <head>
//         <title>Print — ${buyerName}</title>
//         ${lang === 'te'
//           ? `<link rel="preconnect" href="https://fonts.googleapis.com">
//              <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;700;900&display=swap" rel="stylesheet">`
//           : ''}
//         <style>
//           @page {
//             size: 80mm auto;
//             margin: 0;
//           }

//           * { box-sizing: border-box; margin: 0; padding: 0; }

//           body {
//             font-family: ${fontFamily};
//             font-size: 13px;
//             width: 80mm;
//           }

//           .receipt {
//             width: 76mm;
//             padding: 2mm 3mm;
//           }

//           /* ── Dividers ── */
//           .divider-double {
//             border-top: 2px solid #000;
//             margin: 4px 0;
//           }
//           .divider-dashed {
//             border-top: 1px dashed #000;
//             margin: 3px 0;
//           }

//           /* ── Header ── */
//           .heading {
//             font-size: 17px;
//             font-weight: 900;
//             text-align: center;
//             letter-spacing: 0.3px;
//             margin: 4px 0 2px;
//             line-height: 1.2;
//           }
//           .subheading {
//             font-size: 11px;
//             text-align: center;
//             margin: 1px 0;
//             line-height: 1.3;
//           }

//           /* ── Contacts ── */
//           .details {
//             display: flex;
//             justify-content: space-between;
//             align-items: flex-start;
//             margin: 3px 0;
//           }
//           .contact-name {
//             font-size: 13px;
//             font-weight: 800;
//           }
//           .contact-num {
//             font-size: 12px;
//           }

//           /* ── Report header ── */
//           .section-label {
//             font-size: 13px;
//             font-weight: 700;
//             text-align: center;
//             margin: 3px 0 1px;
//             text-transform: uppercase;
//             letter-spacing: 0.5px;
//           }
//           .buyer-name {
//             font-size: 18px;
//             font-weight: 900;
//             text-align: center;
//             margin: 2px 0;
//             line-height: 1.2;
//           }
//           .date-range {
//             font-size: 12px;
//             font-weight: 700;
//             text-align: center;
//             margin-bottom: 2px;
//           }

//           /* ── Patti label ── */
//           .patti-label {
//             font-size: 13px;
//             font-weight: 900;
//             margin: 3px 0 2px;
//             text-decoration: underline;
//           }

//           /* ── Line items ── */
//           .item {
//             display: flex;
//             justify-content: space-between;
//             align-items: baseline;
//             font-size: 13px;
//             margin: 2px 0;
//           }
//           .item-desc {
//             flex: 1;
//             white-space: nowrap;
//             overflow: hidden;
//             text-overflow: ellipsis;
//             padding-right: 6px;
//           }
//           .item-amt {
//             font-weight: 700;
//             white-space: nowrap;
//           }

//           /* ── Sub totals ── */
//           .sub-row {
//             display: flex;
//             justify-content: space-between;
//             font-size: 13px;
//             margin: 2px 0;
//           }

//           /* ── Grand totals ── */
//           .totals-block {
//             margin: 2px 0;
//           }
//           .total-row {
//             display: flex;
//             justify-content: space-between;
//             font-size: 14px;
//             font-weight: 700;
//             margin: 3px 0;
//           }
//           .final-row {
//             display: flex;
//             justify-content: space-between;
//             font-size: 16px;
//             font-weight: 900;
//             margin: 3px 0;
//           }

//           /* ── Footer ── */
//           .footer-msg {
//             font-size: 13px;
//             font-weight: 700;
//             text-align: center;
//             margin: 3px 0;
//           }
//           .dev-credit {
//             font-size: 10px;
//             text-align: center;
//             margin: 2px 0;
//           }

//           /* ── Utilities ── */
//           .center { text-align: center; }
//           .bold   { font-weight: 700; }
//         </style>
//       </head>
//       <body onload="window.print(); window.close();">
//         ${content}
//       </body>
//     </html>
//   `)

//   win.document.close()
// }

// src/lib/print-thermal.ts
export type PrintLang = 'en' | 'te'

// ── LABEL SETS ─────────────────────────────────────────────────────────────
const LABELS = {
  en: {
    title:         'NKV Bombay Lemon Traders',
    subTitle:      'Lemon Merchant, Commission Agent & Exporter',
    address:       'Agricultural Market Yard, Tadipatri, Andhra Pradesh, India.',
    reportLabel:   'Buyer Report',
    pattiPrefix:   'Patti:',
    subBags:       'Sub Bags',
    subTotal:      'Sub Total',
    totalBags:     'Total Bags',
    totalAmount:   'Total Amount',
    discount:      'Discount 3%',
    hamali:        'Hamali',
    netAmount:     'Net Amount',
    prevBalance:   'Previous Balance',
    finalAmount:   'Final Amount',
    thankYou:      'Thank You',
    visitAgain:    'Visit Again',
  },
  te: {
    title:         'NKV Bombay Lemon Traders',
    subTitle:      'Lemon Merchant, Commission Agent & Exporter',
    address:       'Agricultural Market Yard, Tadipatri, Andhra Pradesh, India.',
    reportLabel:   'కొనుగోలుదారుల నివేదిక',
    pattiPrefix:   'పట్టి:',
    subBags:       'ఉప సంచులు',
    subTotal:      'ఉప మొత్తం',
    totalBags:     'మొత్తం సంచులు',
    totalAmount:   'మొత్తం మొత్తం',
    discount:      'డిస్కౌంట్ 3%',
    hamali:        'హమాలి',
    netAmount:     'నికర మొత్తం',
    prevBalance:   'మునుపటి బ్యాలెన్స్',
    finalAmount:   'చివరి మొత్తం',
    thankYou:      'ధన్యవాదాలు',
    visitAgain:    'Visit Again',
  },
}

// ── DATE FORMAT ─────────────────────────────────────────────────────────────
function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}-${m}-${y}`
}

// ── MAIN FUNCTION ───────────────────────────────────────────────────────────
export function printBuyerThermal(
  buyerName:    string,
  rows:         any[],
  filters:      { from?: string; to?: string },
  lang:         PrintLang = 'en',
  hamali:       number = 0,        // flat hamali from buyer_hamali table
  ledgerBalance: number = 0,       // outstanding balance from buyer_ledger
) {
  const L = LABELS[lang]

  // ── Group rows by patti_name ────────────────────────────────────────────
  const grouped: Record<string, any[]> = {}
  rows.forEach(r => {
    if (!grouped[r.patti_name]) grouped[r.patti_name] = []
    grouped[r.patti_name].push(r)
  })

  let totalBags   = 0
  let totalAmount = 0

  // ── Header block ───────────────────────────────────────────────────────
  let content = `
    <div class="receipt">

      <div class="heading">NKV Bombay Lemon Traders</div>
      <div class="subheading">${L.subTitle}</div>
      <div class="subheading">${L.address}</div>

      <div class="divider-double"></div>

      <div class="details">
        <div>
          <div class="contact-name">Sonu</div>
          <div class="contact-num">7013285158</div>
          <div class="contact-num">7893287215</div>
        </div>
        <div class="center">
          <div class="contact-name">Bujji</div>
          <div class="contact-num">8639826163</div>
        </div>
      </div>

      <div class="divider-double"></div>

      <div class="section-label">${L.reportLabel}</div>
      <div class="buyer-name">${buyerName}</div>
      <div class="date-range">${formatDate(filters.from)} &nbsp;—&nbsp; ${formatDate(filters.to)}</div>

      <div class="divider-double"></div>
  `

  // ── Per-patti blocks ───────────────────────────────────────────────────
  Object.entries(grouped).forEach(([patti, items]) => {
    let subBags   = 0
    let subAmount = 0

    content += `<div class="patti-label">${L.pattiPrefix} ${patti}</div>`

    items.forEach(r => {
      const bags   = Number(r.bags   || 0)
      const rate   = Number(r.rate   || 0)
      const amount = Number(r.amount || 0)

      subBags   += bags
      subAmount += amount

      content += `
        <div class="item">
          <span class="item-desc">${r.item_name} &nbsp; ${bags} x ${rate}</span>
          <span class="item-amt">Rs.${amount}</span>
        </div>
      `
    })

    totalBags   += subBags
    totalAmount += subAmount

    content += `
      <div class="divider-dashed"></div>
      <div class="sub-row">
        <span>${L.subBags}</span>
        <span class="bold">${subBags}</span>
      </div>
      <div class="sub-row">
        <span>${L.subTotal}</span>
        <span class="bold">Rs.${subAmount}</span>
      </div>
      <div class="divider-double"></div>
    `
  })

  // ── Grand total calculations ────────────────────────────────────────────
  const discount   = Math.round(totalAmount * 0.03)
  const afterDisc  = totalAmount - discount          // gross × 0.97
  const netAmount  = Math.ceil(afterDisc + hamali)   // + hamali → Net Amount
  const finalAmount = Math.ceil(netAmount + ledgerBalance) // + ledger balance → Final Amount

  // ── Grand total block ──────────────────────────────────────────────────
  content += `
    <div class="totals-block">
      <div class="total-row">
        <span>${L.totalBags}</span>
        <span>${totalBags}</span>
      </div>
      <div class="total-row">
        <span>${L.totalAmount}</span>
        <span>Rs.${totalAmount}</span>
      </div>
      <div class="divider-dashed"></div>
      <div class="total-row">
        <span>${L.discount}</span>
        <span>- Rs.${discount}</span>
      </div>
  `

  // Hamali row — only if hamali > 0
  if (hamali > 0) {
    content += `
      <div class="divider-dashed"></div>
      <div class="total-row">
        <span>${L.hamali}</span>
        <span>+ Rs.${hamali}</span>
      </div>
    `
  }

  content += `
      <div class="divider-dashed"></div>
      <div class="net-row">
        <span>${L.netAmount}</span>
        <span>Rs.${netAmount}</span>
      </div>
  `

  // Previous balance row — only if ledgerBalance > 0
  if (ledgerBalance > 0) {
    content += `
      <div class="divider-dashed"></div>
      <div class="total-row">
        <span>${L.prevBalance}</span>
        <span>+ Rs.${Math.ceil(ledgerBalance)}</span>
      </div>
    `
  }

  content += `
      <div class="divider-dashed"></div>
      <div class="final-row">
        <span>${L.finalAmount}</span>
        <span>Rs.${finalAmount}</span>
      </div>
    </div>

    <div class="divider-double"></div>

    <div class="footer-msg">${L.thankYou}</div>
    <div class="footer-msg">${L.visitAgain}</div>

    <div class="divider-double"></div>

    <div class="dev-credit">Developed by RukmanWebSolutions</div>

    <div class="divider-double"></div>
    </div>
  `

  // ── Open print window ──────────────────────────────────────────────────
  const win = window.open('', '', 'width=320,height=640')
  if (!win) return

  const fontFamily = lang === 'te'
    ? `'Noto Sans Telugu', 'Gautami', 'Vani', monospace`
    : `'Courier New', Courier, monospace`

  win.document.write(`
    <html>
      <head>
        <title>Print — ${buyerName}</title>
        ${lang === 'te'
          ? `<link rel="preconnect" href="https://fonts.googleapis.com">
             <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;700;900&display=swap" rel="stylesheet">`
          : ''}
        <style>
          @page { size: 80mm auto; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: ${fontFamily}; font-size: 13px; width: 80mm; }
          .receipt { width: 76mm; padding: 2mm 3mm; }

          .divider-double { border-top: 2px solid #000; margin: 4px 0; }
          .divider-dashed { border-top: 1px dashed #000; margin: 3px 0; }

          .heading {
            font-size: 17px; font-weight: 900; text-align: center;
            letter-spacing: 0.3px; margin: 4px 0 2px; line-height: 1.2;
          }
          .subheading { font-size: 11px; text-align: center; margin: 1px 0; line-height: 1.3; }

          .details { display: flex; justify-content: space-between; align-items: flex-start; margin: 3px 0; }
          .contact-name { font-size: 13px; font-weight: 800; }
          .contact-num  { font-size: 12px; }

          .section-label {
            font-size: 13px; font-weight: 700; text-align: center;
            margin: 3px 0 1px; text-transform: uppercase; letter-spacing: 0.5px;
          }
          .buyer-name { font-size: 18px; font-weight: 900; text-align: center; margin: 2px 0; line-height: 1.2; }
          .date-range { font-size: 12px; font-weight: 700; text-align: center; margin-bottom: 2px; }

          .patti-label { font-size: 13px; font-weight: 900; margin: 3px 0 2px; text-decoration: underline; }

          .item { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; margin: 2px 0; }
          .item-desc { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 6px; }
          .item-amt  { font-weight: 700; white-space: nowrap; }

          .sub-row { display: flex; justify-content: space-between; font-size: 13px; margin: 2px 0; }

          .totals-block { margin: 2px 0; }
          .total-row {
            display: flex; justify-content: space-between;
            font-size: 14px; font-weight: 700; margin: 3px 0;
          }
          .net-row {
            display: flex; justify-content: space-between;
            font-size: 15px; font-weight: 900; margin: 3px 0;
            border-top: 1px solid #000; border-bottom: 1px solid #000;
            padding: 2px 0;
          }
          .final-row {
            display: flex; justify-content: space-between;
            font-size: 17px; font-weight: 900; margin: 3px 0;
          }

          .footer-msg { font-size: 13px; font-weight: 700; text-align: center; margin: 3px 0; }
          .dev-credit { font-size: 10px; text-align: center; margin: 2px 0; }
          .center { text-align: center; }
          .bold   { font-weight: 700; }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        ${content}
      </body>
    </html>
  `)

  win.document.close()
}