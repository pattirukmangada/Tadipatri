// src/pages/admin/BuyerSearch.tsx

import { useState, useEffect, useCallback } from 'react'
import { api, formatCurrency } from '../../lib/api'
import { printBuyerThermal, PrintLang } from '../../lib/print-thermal'
import { exportBuyerPDF } from '../../lib/pdf-buyer'
import { Loader2, X, Printer } from 'lucide-react'

// ── Date helper: YYYY-MM-DD → DD-MM-YYYY ──────────────────────────────────
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

  // All raw rows returned by the list query (LIKE search)
  const [results,        setResults]        = useState<any[]>([])
  // Details rows for one specific buyer (exact match)
  const [details,        setDetails]        = useState<any[]>([])
  const [selectedBuyer,  setSelectedBuyer]  = useState<string | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // ── LIST SEARCH (LIKE) ───────────────────────────────────────────────────
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

  // ── DETAILS (EXACT MATCH) ────────────────────────────────────────────────
  const loadDetails = (name: string) => {
    if (selectedBuyer === name) {
      setSelectedBuyer(null)
      setDetails([])
      return
    }

    setSelectedBuyer(name)
    setDetailsLoading(true)
    setDetails([])

    api.getBuyerDetails({ buyer: name, from, to, exact: '1' })
      .then((data: any[]) => setDetails(data))
      .catch(() => setDetails([]))
      .finally(() => setDetailsLoading(false))
  }

  // ── AGGREGATE LIST ───────────────────────────────────────────────────────
  const buyerMap: Record<string, { buyer_name: string; total_bags: number; total_amount: number }> = {}

  results.forEach((r: any) => {
    const key = r.buyer_name
    if (!buyerMap[key]) {
      buyerMap[key] = { buyer_name: key, total_bags: 0, total_amount: 0 }
    }
    buyerMap[key].total_bags   += Number(r.bags   || 0)
    buyerMap[key].total_amount += Number(r.amount || 0)
  })

  const groupedBuyers = Object.values(buyerMap).sort((a, b) =>
    a.buyer_name.localeCompare(b.buyer_name)
  )

  const totalBags   = groupedBuyers.reduce((s, r) => s + r.total_bags,   0)
  const totalAmount = groupedBuyers.reduce((s, r) => s + r.total_amount, 0)

  // ── AGGREGATE DETAILS ────────────────────────────────────────────────────
  const groupedDetails: Record<string, any[]> = {}
  details.forEach((d: any) => {
    const key = d.patti_name
    if (!groupedDetails[key]) groupedDetails[key] = []
    groupedDetails[key].push(d)
  })

  const detailsTotal = details.reduce((s, d) => s + Number(d.amount || 0), 0)
  const detailsBags  = details.reduce((s, d) => s + Number(d.bags  || 0), 0)

  // ── PRINT HANDLER ────────────────────────────────────────────────────────
  const handlePrint = (lang: PrintLang) => {
    if (!selectedBuyer || details.length === 0) return
    printBuyerThermal(selectedBuyer, details, { from, to }, lang)
  }

  return (
    <div className="space-y-5">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Buyer Search</h1>
      </div>

      {/* ── FILTERS ─────────────────────────────────────────────────────── */}
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

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-forest" size={28} />
        </div>
      ) : error ? (
        <div className="card text-red-500 text-sm">{error}</div>
      ) : (
        <>
          {/* ── BUYER LIST TABLE ───────────────────────────────────────── */}
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
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedBuyers.map((r, i) => (
                      <tr
                        key={r.buyer_name}
                        className={`border-t hover:bg-forest/[0.04] transition-colors ${
                          selectedBuyer === r.buyer_name ? 'bg-forest/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-gray-400">{i + 1}</td>
                        <td className="py-3 px-4 font-semibold text-forest">{r.buyer_name}</td>
                        <td className="py-3 px-4 text-right">{r.total_bags}</td>
                        <td className="py-3 px-4 text-right text-green-700 font-medium">
                          {formatCurrency(r.total_amount)}
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
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-forest/10 font-bold">
                      <td className="py-3 px-4 text-gray-700" colSpan={2}>Total</td>
                      <td className="py-3 px-4 text-right">{totalBags}</td>
                      <td className="py-3 px-4 text-right text-green-800">
                        {formatCurrency(totalAmount)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* ── BUYER DETAILS ────────────────────────────────────────────── */}
          {selectedBuyer && (
            <div className="card space-y-4">

              {/* Header */}
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
                      {/* ── SPLIT PRINT BUTTON: EN / తె ─────────────────── */}
                      <div className="flex items-stretch rounded-lg overflow-hidden border border-forest/30 text-sm font-medium">
                        {/* Label */}
                        <span className="flex items-center gap-1 px-2 py-1 bg-forest/5 text-forest text-xs border-r border-forest/20 select-none">
                          <Printer size={13} />
                          Print
                        </span>
                        {/* English */}
                        <button
                          onClick={() => handlePrint('en')}
                          title="Print in English"
                          className="px-3 py-1 bg-forest text-white hover:bg-forest/90 transition-colors border-r border-forest/60"
                        >
                          EN
                        </button>
                        {/* Telugu */}
                        <button
                          onClick={() => handlePrint('te')}
                          title="తెలుగులో ప్రింట్ చేయండి"
                          className="px-3 py-1 bg-forest text-white hover:bg-forest/90 transition-colors"
                          style={{ fontFamily: "'Noto Sans Telugu', sans-serif" }}
                        >
                          తె
                        </button>
                      </div>

                      {/* PDF button */}
                      <button
                        onClick={() => exportBuyerPDF(selectedBuyer, details, from, to)}
                        className="btn-secondary text-sm"
                      >
                        PDF
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => { setSelectedBuyer(null); setDetails([]) }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                    title="Close"
                  >
                    <X size={16} />
                  </button>
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
                  {/* Grouped by patti */}
                  {Object.entries(groupedDetails).map(([patti, items]) => {
                    const pattiTotal = items.reduce((s, i) => s + Number(i.amount || 0), 0)
                    const pattiBags  = items.reduce((s, i) => s + Number(i.bags  || 0), 0)

                    return (
                      <div key={patti} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* Patti header */}
                        <div className="bg-forest/5 px-4 py-2 flex items-center justify-between">
                          <span className="font-semibold text-forest text-sm">Patti: {patti}</span>
                          <span className="text-xs text-gray-500">{pattiBags} bags</span>
                        </div>

                        {/* Items table */}
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
                                <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                                  {fmtDate(d.date)}
                                </td>
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
                              <td colSpan={2} className="px-4 py-2 font-semibold text-sm">
                                Subtotal
                              </td>
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

                  {/* Grand total */}
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
