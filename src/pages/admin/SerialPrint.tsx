import { useState } from 'react'
import { api, formatCurrency } from '../../lib/api'
import { printSerialThermal } from '../../lib/print-serial'

export default function SerialPrint() {

  const [serial, setSerial] = useState('')
  const [rows, setRows] = useState<any[]>([])

  const addBill = async () => {
    if (!serial) return

    // ❌ prevent duplicate
    if (rows.some(r => String(r.serial_number) === serial)) {
      alert('Already added')
      return
    }

    try {
      const data = await api.getBillBySerial(serial)
      setRows(prev => [...prev, data])
      setSerial('')
    } catch {
      alert('Bill not found')
    }
  }

  const total = rows.reduce((s, r) => s + Number(r.net_amount || 0), 0)

  return (
    <div className="space-y-4">

      <h1 className="text-xl font-bold">Serial Print</h1>

      {/* INPUT */}
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Enter Serial Number"
          value={serial}
          onChange={e => setSerial(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addBill()}
        />

        <button onClick={addBill} className="btn-primary">
          Add
        </button>
      </div>

      {/* LIST */}
      <div className="card">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between border-b py-2 text-sm">
            <div>
              {r.patti_name} - #{r.serial_number}
            </div>
            <div className="font-semibold text-green-700">
              {formatCurrency(r.net_amount)}
            </div>
          </div>
        ))}

        <div className="flex justify-between font-bold pt-3">
          <span>Total</span>
          <span className="text-green-700">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* PRINT */}
      {rows.length > 0 && (
        <button
          onClick={() => printSerialThermal(rows)}
          className="btn-primary"
        >
          Print (80mm)
        </button>
      )}
    </div>
  )
}