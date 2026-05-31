// src/pages/admin/BillView.tsx
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api, Bill, Settings, formatCurrency, formatDate } from '../../lib/api'
import { Edit, Printer, ArrowLeft, Trash2, Loader2 } from 'lucide-react'

export default function BillView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [bill, setBill] = useState<Bill | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getBill(Number(id)), api.getSettings()])
      .then(([b, s]) => { setBill(b); setSettings(s) })
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!confirm('Delete this bill?')) return
    await api.deleteBill(Number(id))
    navigate('/admin/bills')
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-forest" size={32} /></div>
  if (!bill) return <div className="text-center py-20 text-forest/40">Bill not found</div>

  const serialLabel = () => {
    const d = bill.date.replace(/-/g, '').slice(2)
    return `${d}-${String(bill.serial_number).padStart(3, '0')}`
  }


  return (
    <div className="max-w-2xl animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate(-1)} className="btn-ghost text-sm"><ArrowLeft size={16} /> Back</button>
        <div className="flex gap-2">
          <Link to={`/admin/bills/${id}/edit`} className="btn-ghost text-sm"><Edit size={15} /> Edit</Link>
          <Link to={`/admin/bills/${id}/print`} target="_blank" className="btn-ghost text-sm"><Printer size={15} /> Print</Link>
          <Link to={`/admin/bills/${id}/print?lang=te`} target="_blank" className="btn-ghost text-sm">🇮🇳 Telugu</Link>
          <button onClick={handleDelete} className="btn-danger text-sm"><Trash2 size={15} /> Delete</button>
        </div>
      </div>


      <div className="card">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-xs text-forest/40 mb-1">BILL</div>
            <h1 className="font-display text-2xl font-bold text-forest">{bill.patti_name}</h1>
            <div className="text-forest/50 text-sm mt-1">{formatDate(bill.date)}</div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-forest bg-lemon/20 px-3 py-1.5 rounded-lg">{serialLabel()}</div>
            <div className="text-xs text-forest/40 mt-1">{bill.total_bags} bags</div>
          </div>
        </div>

        {/* Items */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b border-forest/10">
              {['Buyer', 'Item', 'Bags', 'Rate', 'Total'].map(h => (
                <th key={h} className="text-left py-2 text-forest/50 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bill.items?.map((item, i) => (
              <tr key={i} className="border-b border-forest/5">
                <td className="py-2 font-medium">{item.buyer_name || '—'}</td>
                <td className="py-2 text-forest/60">{item.item_name}</td>
                <td className="py-2">{item.bags}</td>
                <td className="py-2">{formatCurrency(item.rate)}</td>
                <td className="py-2 font-semibold">{formatCurrency(item.total ?? item.bags * item.rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="bg-forest/5 rounded-xl p-4 space-y-2 text-sm">
          {[
            ['Gross Amount', formatCurrency(bill.total_amount), ''],
            ['Commission', `- ${formatCurrency(bill.commission)}`, 'text-red-500'],
            ['Cooli', `- ${formatCurrency(bill.cooli)}`, 'text-red-500'],
            ['Chariti', `- ${formatCurrency(bill.chariti)}`, 'text-red-500'],
            ['Transport', `- ${formatCurrency(bill.transport)}`, 'text-red-500'],
          ].map(([l, v, cls]) => (
            <div key={l as string} className="flex justify-between">
              <span className="text-forest/60">{l}</span>
              <span className={cls as string || 'font-semibold'}>{v}</span>
            </div>
          ))}
          <div className="border-t border-forest/20 pt-2 flex justify-between font-bold text-base">
            <span className="text-forest">Net Payable</span>
            <span className="text-green-600 text-lg">{formatCurrency(bill.net_amount)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
