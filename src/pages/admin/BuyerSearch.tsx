// src/pages/admin/BuyerSearch.tsx

import { useState, useEffect, useCallback, useRef } from 'react'
import { api, BuyerHamaliMap, formatCurrency } from '../../lib/api'
import { printBuyerThermal, PrintLang } from '../../lib/print-thermal'
import { exportBuyerPDF } from '../../lib/pdf-buyer'
import { Loader2, X, Printer, Save } from 'lucide-react'

function fmtDate(d?: string): string {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}-${m}-${y}`
}

export default function BuyerSearch() {
  const today = new Date().toISOString().split('T')[0]

  const [buyer, setBuyer] = useState('')
  const [from,  setFrom]  = useState(today)
  const [to,    setTo]    = useState(today)

  const [results,        setResults]        = useState<any[]>([])
  const [details,        setDetails]        = useState<any[]>([])
  const [selectedBuyer,  setSelectedBuyer]  = useState<string | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState<string | null>(null)

  // ── Hamali state ─────────────────────────────────────────────────────────
  // Map of buyer_name → current hamali value (from DB)
  const [hamaliMap,     setHamaliMap]     = useState<BuyerHamaliMap>({})
  // Map of buyer_name → edited hamali value (local input before save)
  const [hamaliEdits,   setHamaliEdits]   = useState<Record<string, string>>({})
  // Map of buyer_name → saving state
  const [hamaliSaving,  setHamaliSaving]  = useState<Record<string, boolean>>({})
  // Map of buyer_name → saved flash
  const [hamaliSaved,   setHamaliSaved]   = useState<Record<string, boolean>>({})

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Load hamali map once
  const loadHamaliMap = useCallback(() => {
    api.getBuyerHamaliMap()
      .then(map => {
        setHamaliMap(map)
        // Initialise edit inputs from DB values (as string for input)
        const edits: Record<string, string> = {}
        for (const [name, val] of Object.entries(map)) {
          edits[name] = val > 0 ? String(val) : ''
        }
        setHamaliEdits(prev => ({ ...edits, ...prev }))
      })
      .catch(() => {})
  }, [])

  // ── LIST SEARCH ───────────────────────────────────────────────────────────
  const search = useCallback(() => {
    setLoading(true)
    setError(null)
    setSelectedBuyer(null)
    setDetails([])

    api.getBuyerPurchases({ buyer, from, to })
      .then((data: any[]) => setResults(data))
      .catch((err: any) => {
        setResults([])
        setError(err?.message ?? 'Failed to load data')
      })
      .finally(() => setLoading(false))
  }, [buyer, from, to])

  useEffect(() => { search() }, [search])
  useEffect(() => { loadHamaliMap() }, [loadHamaliMap])

  // ── DETAILS ───────────────────────────────────────────────────────────────
  const loadDetails = (name: string) => {
    if (selectedBuyer === name) { setSelectedBuyer(null); setDetails([]); return }
    setSelectedBuyer(name)
    setDetailsLoading(true)
    setDetails([])
    api.getBuyerDetails({ buyer: name, from, to, exact: '1' })
      .then((data: any[]) => setDetails(data))
      .catch(() => setDetails([]))
      .finally(() => setDetailsLoading(false))
  }

  // ── HAMALI INPUT HANDLER ──────────────────────────────────────────────────
  // Initialise edit value for a buyer if not yet set
  const getHamaliEdit = (name: string): string => {
    if (name in hamaliEdits) return hamaliEdits[name]
    const dbVal = hamaliMap[name] ?? 0
    return dbVal > 0 ? String(dbVal) : ''
  }

  const handleHamaliChange = (buyerName: string, raw: string) => {
    setHamaliEdits(prev => ({ ...prev, [buyerName]: raw }))
  }

  // Save hamali to DB (auto-save on blur, also manual save button)
  const saveHamali = async (buyerName: string) => {
    const raw    = hamaliEdits[buyerName] ?? ''
    const hamali = parseFloat(raw) || 0

    // No change? skip
    if (hamali === (hamaliMap[buyerName] ?? 0)) return

    setHamaliSaving(prev => ({ ...prev, [buyerName]: true }))
    try {
      await api.setBuyerHamali(buyerName, hamali)
      setHamaliMap(prev => ({ ...prev, [buyerName]: hamali }))
      // Show saved flash
      setHamaliSaved(prev => ({ ...prev, [buyerName]: true }))
      if (saveTimers.current[buyerName]) clearTimeout(saveTimers.current[buyerName])
      saveTimers.current[buyerName] = setTimeout(() => {
        setHamaliSaved(prev => ({ ...prev, [buyerName]: false }))
      }, 2000)
    } catch {
      alert(`Failed to save hamali for ${buyerName}`)
    } finally {
      setHamaliSaving(false as any)
      setHamaliSaving(prev => ({ ...prev, [buyerName]: false }))
    }
  }

  // ── AGGREGATE ─────────────────────────────────────────────────────────────
  const buyerMap: Record<string, { buyer_name: string; total_bags: number; total_amount: number }> = {}
  results.forEach((r: any) => {
    const key = r.buyer_name
    if (!buyerMap[key]) buyerMap[key] = { buyer_name: key, total_bags: 0, total_amount: 0 }
    buyerMap[key].total_bags   += Number(r.bags   || 0)
    buyerMap[key].total_amount += Number(r.amount || 0)
  })
  const groupedBuyers = Object.values(buyerMap).sort((a, b) => a.buyer_name.localeCompare(b.buyer_name))
  const totalBags     = groupedBuyers.reduce((s, r) => s + r.total_bags,   0)
  const totalAmount   = groupedBuyers.reduce((s, r) => s + r.total_amount, 0)

  const groupedDetails: Record<string, any[]> = {}
  details.forEach((d: any) => {
    if (!groupedDetails[d.patti_name]) groupedDetails[d.patti_name] = []
    groupedDetails[d.patti_name].push(d)
  })
  const detailsTotal = details.reduce((s, d) => s + Number(d.amount || 0), 0)
  const detailsBags  = details.reduce((s, d) => s + Number(d.bags   || 0), 0)

  // ── PRINT ─────────────────────────────────────────────────────────────────
  const handlePrint = (lang: PrintLang) => {
    if (!selectedBuyer || details.length === 0) return
    printBuyerThermal(selectedBuyer, details, { from, to }, lang)
  }

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Buyer Search</h1>
      </div>

      {/* FILTERS */}
      <div className="card flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Buyer Name</label>
          <input
            className="input w-full"
            placeholder="Search buyer…"
            value={buyer}
            onChange={e => setBuyer(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>

      {/* HAMALI INFO BANNER */}
      <div className="card bg-amber-50 border border-amber-200 py-2.5 px-4 text-xs text-amber-800 flex items-center gap-2">
        <span className="font-semibold">Hamali:</span>
        Enter a flat hamali amount per buyer. This is deducted from their gross total to show Net Amount here.
        Each patti debit in Buyer Ledger = Gross × 0.97 (3% discount). Hamali is shown as a flat deduction in total.
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-forest" size={28} />
        </div>
      ) : error ? (
        <div className="card text-red-500 text-sm">{error}</div>
      ) : (
        <>
          {/* BUYER LIST TABLE */}
          <div className="card overflow-hidden p-0">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">
                Buyers
                <span className="ml-2 text-xs font-normal text-gray-400">
                  {fmtDate(from)} – {fmtDate(to)}
                </span>
              </h2>
              <span className="text-xs text-gray-400">{groupedBuyers.length} buyers</span>
            </div>

            {groupedBuyers.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-sm">
                No purchases found for this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-forest/10 text-forest text-xs uppercase tracking-wide">
                    <tr>
                      <th className="py-3 px-4 text-left">#</th>
                      <th className="py-3 px-4 text-left">Buyer</th>
                      <th className="py-3 px-4 text-right">Bags</th>
                      <th className="py-3 px-4 text-right">Gross Amount</th>
                      <th className="py-3 px-4 text-right">Net Amount</th>
                      <th className="py-3 px-4 text-right min-w-[160px]">
                        Hamali (Flat)
                        <span className="ml-1 font-normal text-[10px] text-forest/60 normal-case">
                          deducted from total
                        </span>
                      </th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedBuyers.map((r, i) => {
                      const editVal   = getHamaliEdit(r.buyer_name)
                      const hamaliAmt = parseFloat(editVal) || 0
                      const netAmt    = r.total_amount - hamaliAmt   // gross - hamali = net payable
                      const isSaving  = hamaliSaving[r.buyer_name] ?? false
                      const isSaved   = hamaliSaved[r.buyer_name]  ?? false

                      return (
                        <tr
                          key={r.buyer_name}
                          className={`border-t hover:bg-forest/[0.04] transition-colors ${
                            selectedBuyer === r.buyer_name ? 'bg-forest/10' : ''
                          }`}
                        >
                          <td className="py-3 px-4 text-gray-400">{i + 1}</td>
                          <td className="py-3 px-4 font-semibold text-forest">
                            {r.buyer_name}
                          </td>
                          <td className="py-3 px-4 text-right">{r.total_bags}</td>
                          {/* Gross Amount */}
                          <td className="py-3 px-4 text-right font-medium text-green-700 tabular-nums">
                            {formatCurrency(r.total_amount)}
                          </td>
                          {/* Net Amount = gross - hamali */}
                          <td className="py-3 px-4 text-right tabular-nums">
                            {hamaliAmt > 0 ? (
                              <div>
                                <div className="font-bold text-orange-600">{formatCurrency(netAmt)}</div>
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  {formatCurrency(r.total_amount)} − {formatCurrency(hamaliAmt)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>

                          {/* HAMALI INPUT */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
                                  ₹
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  className={`input pl-5 w-28 text-right tabular-nums text-sm ${
                                    hamaliAmt > 0 ? 'border-orange-300 bg-orange-50' : ''
                                  }`}
                                  value={editVal}
                                  onChange={e => handleHamaliChange(r.buyer_name, e.target.value)}
                                  onBlur={() => saveHamali(r.buyer_name)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveHamali(r.buyer_name) }}
                                />
                              </div>

                              {/* Save button / status */}
                              {isSaving ? (
                                <Loader2 size={14} className="animate-spin text-gray-400 shrink-0" />
                              ) : isSaved ? (
                                <span className="text-green-600 text-xs font-medium shrink-0">✓</span>
                              ) : (
                                <button
                                  onClick={() => saveHamali(r.buyer_name)}
                                  title="Save hamali"
                                  className="p-1 rounded hover:bg-forest/10 text-forest/50 hover:text-forest transition-colors shrink-0"
                                >
                                  <Save size={13} />
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => loadDetails(r.buyer_name)}
                              className={`text-sm px-3 py-1 rounded-lg font-medium transition-colors ${
                                selectedBuyer === r.buyer_name
                                  ? 'bg-red-50 text-red-500 hover:bg-red-100'
                                  : 'bg-forest/10 text-forest hover:bg-forest/20'
                              }`}
                            >
                              {selectedBuyer === r.buyer_name ? 'Close' : 'View'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-forest/10 font-bold">
                      <td className="py-3 px-4 text-gray-700" colSpan={2}>Total</td>
                      <td className="py-3 px-4 text-right">{totalBags}</td>
                      <td className="py-3 px-4 text-right text-green-800 tabular-nums">
                        {formatCurrency(totalAmount)}
                      </td>
                      <td />
                      <td />
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* BUYER DETAILS */}
          {selectedBuyer && (
            <div className="card space-y-4">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <h2 className="text-lg font-bold text-forest">{selectedBuyer}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {fmtDate(from)} – {fmtDate(to)}
                    {detailsBags > 0 && (
                      <span className="ml-2 font-medium text-gray-600">
                        · {detailsBags} bags · {formatCurrency(detailsTotal)}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {details.length > 0 && (
                    <>
                      <div className="flex items-stretch rounded-lg overflow-hidden border border-forest/30 text-sm font-medium">
                        <span className="flex items-center gap-1 px-2 py-1 bg-forest/5 text-forest text-xs border-r border-forest/20 select-none">
                          <Printer size={13} /> Print
                        </span>
                        <button
                          onClick={() => handlePrint('en')}
                          className="px-3 py-1 bg-forest text-white hover:bg-forest/90 transition-colors border-r border-forest/60"
                        >EN</button>
                        <button
                          onClick={() => handlePrint('te')}
                          className="px-3 py-1 bg-forest text-white hover:bg-forest/90 transition-colors"
                          style={{ fontFamily: "'Noto Sans Telugu', sans-serif" }}
                        >తె</button>
                      </div>
                      <button
                        onClick={() => exportBuyerPDF(selectedBuyer, details, from, to)}
                        className="btn-secondary text-sm"
                      >PDF</button>
                    </>
                  )}
                  <button
                    onClick={() => { setSelectedBuyer(null); setDetails([]) }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                  ><X size={16} /></button>
                </div>
              </div>

              {detailsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="animate-spin text-forest" size={24} />
                </div>
              ) : details.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-6">
                  No purchases found for {selectedBuyer} in this period.
                </div>
              ) : (
                <>
                  {Object.entries(groupedDetails).map(([patti, items]) => {
                    const pattiTotal = items.reduce((s, i) => s + Number(i.amount || 0), 0)
                    const pattiBags  = items.reduce((s, i) => s + Number(i.bags  || 0), 0)
                    return (
                      <div key={patti} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-forest/5 px-4 py-2 flex items-center justify-between">
                          <span className="font-semibold text-forest text-sm">Patti: {patti}</span>
                          <span className="text-xs text-gray-500">{pattiBags} bags</span>
                        </div>
                        <table className="w-full text-sm">
                          <thead className="text-xs text-gray-400 border-b">
                            <tr>
                              <th className="px-4 py-2 text-left">Date</th>
                              <th className="px-4 py-2 text-left">Item</th>
                              <th className="px-4 py-2 text-right">Bags</th>
                              <th className="px-4 py-2 text-right">Rate</th>
                              <th className="px-4 py-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {items.map((d: any, i: number) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{fmtDate(d.date)}</td>
                                <td className="px-4 py-2">{d.item_name}</td>
                                <td className="px-4 py-2 text-right">{d.bags}</td>
                                <td className="px-4 py-2 text-right">₹{d.rate}</td>
                                <td className="px-4 py-2 text-right font-medium text-green-700">
                                  {formatCurrency(Number(d.amount))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t bg-gray-50">
                            <tr>
                              <td colSpan={2} className="px-4 py-2 font-semibold text-sm">Subtotal</td>
                              <td className="px-4 py-2 text-right font-semibold">{pattiBags}</td>
                              <td />
                              <td className="px-4 py-2 text-right font-semibold text-green-700">
                                {formatCurrency(pattiTotal)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )
                  })}

                  <div className="pt-2 border-t-2 border-gray-200 flex justify-between items-center font-bold text-base">
                    <span className="text-gray-700">
                      Grand Total &nbsp;
                      <span className="font-normal text-sm text-gray-400">({detailsBags} bags)</span>
                    </span>
                    <span className="text-green-700 text-lg">{formatCurrency(detailsTotal)}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
