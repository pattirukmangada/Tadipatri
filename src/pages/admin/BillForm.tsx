import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, BillItem, Settings, calcBill, formatCurrency } from '../../lib/api'
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react'

const emptyItem = (): BillItem => ({ buyer_name: '', item_name: 'Lemon', bags: 0, rate: 0 })

// Display helper: show empty string instead of 0 for number inputs
const dv = (n: number) => n === 0 ? '' : String(n)

export default function BillForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [settings, setSettings] = useState<Settings | null>(null)
  const [form, setForm] = useState({
    patti_name: '',
    date: new Date().toISOString().split('T')[0],
    total_bags: 0,
    cooli: 0,
    chariti: 0,
    transport: 0,
  })
  const [items, setItems] = useState<BillItem[]>([emptyItem()])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    const fetches: Promise<any>[] = [api.getSettings()]
    if (isEdit) fetches.push(api.getBill(Number(id)))
    setLoading(true)
    Promise.all(fetches).then(([s, bill]) => {
      setSettings(s)
      if (bill) {
        setForm({
          patti_name: bill.patti_name,
          date:       bill.date,
          total_bags: bill.total_bags,
          cooli:      Number(bill.cooli),
          chariti:    Number(bill.chariti),
          transport:  Number(bill.transport),
        })
        if (bill.items?.length) setItems(bill.items)
      }
    }).finally(() => setLoading(false))
  }, [id])

  // When bags change: auto-fill cooli & chariti from settings per-bag rates
  function handleBagsChange(bags: number) {
    const cooli   = settings ? Math.floor(bags * Number(settings.cooli_per_bag))   : form.cooli
    const chariti = settings ? Math.floor(bags * Number(settings.chariti_per_bag)) : form.chariti
    setForm(f => ({ ...f, total_bags: bags, cooli, chariti }))
  }

  const totalBags = items.reduce((s, i) => s + Number(i.bags), 0)
  const calc = settings
    ? calcBill(items, form.total_bags || totalBags, settings, form.cooli, form.chariti, form.transport)
    : null

  function updateItem(idx: number, field: keyof BillItem, val: string | number) {
    setItems(items.map((it, i) => i === idx ? { ...it, [field]: val } : it))
  }

  function addItem()              { setItems([...items, emptyItem()]) }
  function removeItem(idx: number){ if (items.length > 1) setItems(items.filter((_, i) => i !== idx)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!calc) return
    const tbags = form.total_bags || totalBags
    if (totalBags !== tbags) {
      setError(`Item bags sum (${totalBags}) must equal Total Bags (${tbags})`)
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        total_bags:   tbags,
        total_amount: calc.totalAmount,
        commission:   calc.commission,
        transport:    calc.transport,
        net_amount:   calc.netAmount,
        items: items.map(i => ({ ...i, bags: Number(i.bags), rate: Number(i.rate) })),
      }
      if (isEdit) await api.updateBill(Number(id), payload)
      else        await api.createBill(payload)
      navigate('/admin/bills')
    } catch (err: any) {
      setError(err.message || 'Failed to save bill')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-24">
      <Loader2 className="animate-spin text-forest" size={32} />
    </div>
  )

  return (
    <div className="max-w-3xl animate-fade-in">
      <button onClick={() => navigate(-1)} className="btn-ghost mb-5 text-sm">
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="text-2xl font-display font-bold text-forest mb-6">
        {isEdit ? 'Edit Bill' : 'New Bill'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Basic info */}
        <div className="card grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">Patti Name *</label>
            <input
              className="input" required
              value={form.patti_name}
              onChange={e => setForm({ ...form, patti_name: e.target.value })}
              placeholder="Farmer / Party name"
            />
          </div>
          <div>
            <label className="label">Date *</label>
            <input
              className="input" type="date" required
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Total Bags *</label>
            <input
              className="input" type="number" min={0} required
              value={dv(form.total_bags)}
              onChange={e => handleBagsChange(Number(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
        </div>

        {/* Items */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-forest">Bill Items</h3>
            <button type="button" onClick={addItem} className="btn-ghost text-sm">
              <Plus size={15} /> Add Item
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 bg-forest/5 rounded-lg">
                <div>
                  <label className="label text-xs">Item</label>
                  <input
                    className="input text-sm py-2"
                    value={item.item_name}
                    onChange={e => updateItem(idx, 'item_name', e.target.value)}
                    placeholder="Lemon"
                  />
                </div>
                <div>
                  <label className="label text-xs">Bags</label>
                  <input
                    className="input text-sm py-2" type="number" min={0}
                    value={Number(item.bags) === 0 ? '' : item.bags}
                    onChange={e => updateItem(idx, 'bags', Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="label text-xs">Rate (₹)</label>
                  <input
                    className="input text-sm py-2" type="number" min={0} step="0.01"
                    value={Number(item.rate) === 0 ? '' : item.rate}
                    onChange={e => updateItem(idx, 'rate', Number(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="label text-xs">Buyer Name</label>
                  <input
                    className="input text-sm py-2"
                    value={item.buyer_name}
                    onChange={e => updateItem(idx, 'buyer_name', e.target.value)}
                    placeholder="Buyer name"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="label text-xs">Total</label>
                    <div className="input py-2 bg-forest/5 text-sm font-semibold">
                      {formatCurrency(Number(item.bags) * Number(item.rate))}
                    </div>
                  </div>
                  <button
                    type="button" onClick={() => removeItem(idx)}
                    className="p-2 rounded-lg hover:bg-red-50 text-red-400 mb-0.5"
                    title="Delete item"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className={`mt-2 text-xs font-medium ${totalBags !== (form.total_bags || totalBags) ? 'text-red-500' : 'text-forest/50'}`}>
            Item bags sum: {totalBags} {form.total_bags ? `/ ${form.total_bags}` : ''}
          </div>
        </div>

        {/* Deductions */}
        <div className="card grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">
              Cooli (₹)
              {settings?.cooli_per_bag ? (
                <span className="text-forest/40 text-xs ml-1">₹{settings.cooli_per_bag}/bag</span>
              ) : null}
            </label>
            <input
              className="input" type="number" min={0} step="0.01"
              value={dv(form.cooli)}
              onChange={e => setForm({ ...form, cooli: Number(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          <div>
            <label className="label">
              Chariti (₹)
              {settings?.chariti_per_bag ? (
                <span className="text-forest/40 text-xs ml-1">₹{settings.chariti_per_bag}/bag</span>
              ) : null}
            </label>
            <input
              className="input" type="number" min={0} step="0.01"
              value={dv(form.chariti)}
              onChange={e => setForm({ ...form, chariti: Number(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          <div>
            <label className="label">Transport (₹)</label>
            <input
              className="input" type="number" min={0} step="0.01"
              value={dv(form.transport)}
              onChange={e => setForm({ ...form, transport: Number(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
        </div>

        {/* Summary */}
        {calc && (
          <div className="card bg-forest text-white">
            <h3 className="font-semibold text-lemon mb-4">Bill Summary</h3>
            <div className="space-y-2 text-sm">
              {[
                ['Gross Amount', formatCurrency(calc.totalAmount),      ''],
                ['Commission',   `- ${formatCurrency(calc.commission)}`, 'text-red-300'],
                ['Cooli',        `- ${formatCurrency(form.cooli)}`,      'text-red-300'],
                ['Chariti',      `- ${formatCurrency(form.chariti)}`,    'text-red-300'],
                ['Transport',    `- ${formatCurrency(calc.transport)}`,  'text-red-300'],
              ].map(([label, val, cls]) => (
                <div key={label as string} className="flex justify-between">
                  <span className="text-white/60">{label}</span>
                  <span className={cls as string || 'text-white'}>{val}</span>
                </div>
              ))}
              <div className="border-t border-white/20 pt-2 flex justify-between font-bold">
                <span className="text-lemon">Net Amount</span>
                <span className="text-lemon text-lg">{formatCurrency(calc.netAmount)}</span>
              </div>
            </div>
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-3">
          {saving
            ? <Loader2 className="animate-spin" size={18} />
            : <><Save size={16} /> {isEdit ? 'Update Bill' : 'Create Bill'}</>}
        </button>
      </form>
    </div>
  )
}