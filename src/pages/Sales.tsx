// src/pages/Sales.tsx
import { useEffect, useState } from 'react'
import { api, formatCurrency } from '../lib/api'
import { Package, Loader2, TrendingUp } from 'lucide-react'

interface TopPatti {
  patti_name: string
  total_bags: number
  total_amount: number
  bill_count: number
  item_summary: string
}

export default function Sales() {
  const [patties, setPatties] = useState<TopPatti[]>([])
  const [loading, setLoading]  = useState(true)
  const [today, setToday]      = useState('')

  useEffect(() => {
    const d = new Date()
    setToday(d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }))
    api.getTopSales()
      .then((data: any) => setPatties(data))
      .finally(() => setLoading(false))
  }, [])

  const maxBags = patties[0]?.total_bags || 1

  return (
    <div className="max-w-4xl mx-auto px-4 py-14">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <TrendingUp className="text-forest" size={28} />
        <h1 className="text-4xl font-display font-bold text-forest">Today's Top Bags</h1>
      </div>
      <p className="text-forest/50 mb-8 text-sm">
        Top 10 patties by total bags — {today}
      </p>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-forest" size={32} />
        </div>
      ) : patties.length === 0 ? (
        <div className="text-center py-20 text-forest/40">
          <Package size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">No bills entered today yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {patties.map((p, i) => {
            const barWidth = Math.round((p.total_bags / maxBags) * 100)
            const medal =
              i === 0 ? 'bg-yellow-400 text-yellow-900' :
              i === 1 ? 'bg-gray-300 text-gray-700' :
              i === 2 ? 'bg-amber-600 text-white' :
                        'bg-forest/10 text-forest'

            return (
              <div key={p.patti_name} className="card hover:shadow-md transition-shadow">
                {/* Top row */}
                <div className="flex items-center gap-4 mb-3">
                  {/* Rank badge */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${medal}`}>
                    #{i + 1}
                  </div>

                  {/* Patti name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-forest text-lg truncate">{p.patti_name}</div>
                    <div className="text-xs text-forest/50">
                      {p.bill_count} bill{p.bill_count > 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Bag count + amount */}
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 justify-end font-bold text-forest text-xl">
                      <Package size={16} className="text-forest/50" />
                      {Number(p.total_bags).toLocaleString('en-IN')}
                      <span className="text-sm font-normal text-forest/50 ml-1">bags</span>
                    </div>
                    <div className="text-xs text-green-700 font-medium">
                      {formatCurrency(p.total_amount)}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-forest/10 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      i === 0 ? 'bg-yellow-400' :
                      i === 1 ? 'bg-gray-400' :
                      i === 2 ? 'bg-amber-600' :
                                'bg-forest/40'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>

                {/* Item summary */}
                {p.item_summary && (
                  <p className="text-xs text-forest/50 truncate">{p.item_summary}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}