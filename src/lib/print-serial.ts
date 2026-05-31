export function printSerialThermal(rows: any[]) {

 let total = Math.round(
  rows.reduce((s, r) => s + Number(r.net_amount || 0), 0)
)

  let content = `
  <div class="receipt">
    <div class="center bold">NKV BOMBAY LEMON TRADERS</div>
    <div class="center small">Serial Print</div>
    <div class="line"></div>
  `

  rows.forEach(r => {
    content += `
      <div class="item">
        <span>${r.patti_name} #${r.serial_number}</span>
        <span>₹${Number(r.net_amount || 0).toFixed(0)}</span>
      </div>
    `
  })

  content += `
    <div class="line"></div>
    <div class="item bold">
      <span>Total</span>
      <span>₹${total}</span>
    </div>
  </div>
  `

 const win = window.open('', '', 'width=300,height=600')
if (!win) return

  win!.document.write(`
    <html>
      <head>
        <style>
          @page { size: 80mm auto; margin: 0; }

          body {
            margin: 0;
            font-family: monospace;
          }

          .receipt {
            width: 72mm;
            padding: 3mm;
            font-size: 10px;
          }

          .center { text-align: center; }
          .bold { font-weight: bold; }

          .item {
            display: flex;
            justify-content: space-between;
          }

          .line {
            border-top: 1px dashed black;
            margin: 3px 0;
          }
        </style>
      </head>

      <body onload="window.print(); window.close();">
        ${content}
      </body>
    </html>
  `)

  win!.document.close()
}