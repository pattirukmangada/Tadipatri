// // src/pages/admin/Dashboard.tsx
// import { useState, useEffect } from 'react'
// import { api, DashboardStats, BuyerDetails, formatCurrency } from '../../lib/api'
// import { exportDashboardPDF } from '../../lib/pdf-export'
// import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
// import { FileDown, Loader2 } from 'lucide-react'

// const COLORS = ['#1a3a2a', '#f5c518', '#ef4444', '#3b82f6']

// function StatCard({ label, value, sub, color = 'forest' }: { label: string; value: string; sub?: string; color?: string }) {
//   return (
//     <div className="stat-card">
//       <div className="text-xs font-medium text-forest/50 uppercase tracking-wide mb-1">{label}</div>
//       <div className={`text-xl font-bold ${color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-500' : 'text-forest'}`}>{value}</div>
//       {sub && <div className="text-xs text-forest/40 mt-0.5">{sub}</div>}
//     </div>
//   )
// }

// function TierStats({ tier, data }: { tier: string; data: any }) {
//   return (
//     <div>
//       <h3 className="font-semibold text-forest/60 text-xs uppercase tracking-wider mb-3">{tier}</h3>
//       <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
//         <StatCard label="Bills"       value={data.total_bills} />
//         <StatCard label="Bags"        value={data.total_bags} />
//         <StatCard label="Gross Amount" value={formatCurrency(data.total_amount)} />
//         <StatCard label="Net Amount"  value={formatCurrency(data.total_net)}        color="green" />
//         <StatCard label="Commission"  value={formatCurrency(data.total_commission)} color="red" />
//         <StatCard label="Cooli"       value={formatCurrency(data.total_cooli)}      color="red" />
//         <StatCard label="Chariti"     value={formatCurrency(data.total_chariti)}    color="red" />
//         <StatCard label="Transport"   value={formatCurrency(data.total_transport)}  color="red" />
//       </div>
//     </div>
//   )
// }

// export default function Dashboard() {
//   const [date,       setDate]       = useState(new Date().toISOString().split('T')[0])
//   const [customFrom, setCustomFrom] = useState('')
//   const [customTo,   setCustomTo]   = useState('')
//   const [stats,      setStats]      = useState<DashboardStats | null>(null)
//   const [buyers,     setBuyers]     = useState<BuyerDetails[]>([])   // ← fixed type
//   const [loading,    setLoading]    = useState(true)
//   const [error,      setError]      = useState('')
//   const [warning,    setWarning]    = useState('')

//   useEffect(() => {
//     setLoading(true)
//     setError('')
//     const params: any = { date }
//     if (customFrom && customTo) {
//       params.from = customFrom
//       params.to   = customTo
//     }

//     Promise.all([
//       api.getDashboardStats(params),
//       api.getBuyerPurchases({}),        // returns BuyerDetails[]
//     ])
//       .then(([s, b]) => {
//         const source = s as any
//         let warningMessage = ''

//         if (source.hasError) {
//           warningMessage = 'Dashboard data partially unavailable.'
//           const tierProblems: string[] = []
//           ;['today', 'month', 'year', 'custom'].forEach((tier) => {
//             const tierData = source[tier]
//             if (tierData?.error) tierProblems.push(`${tier}: ${tierData.error}`)
//           })
//           if (tierProblems.length > 0) warningMessage += ' ' + tierProblems.join(' | ')
//         }

//         setWarning(warningMessage)
//         setError('')
//         setStats(s)
//         setBuyers(b)
//       })
//       .catch((err: any) => {
//         setError(err?.message || 'Failed to load dashboard data')
//         setWarning('')
//         setStats(null)
//         setBuyers([])
//       })
//       .finally(() => setLoading(false))
//   }, [date, customFrom, customTo])

//   const barData = stats?.today.bills?.map(b => ({
//     name:    b.patti_name.length > 10 ? b.patti_name.slice(0, 10) + '…' : b.patti_name,
//     'Gross': Number(b.total_amount),
//     'Net':   Number(b.net_amount),
//   })) || []

//   const summaryData = stats ? [
//     { tier: 'Today',  gross: Number(stats.today.total_amount), net: Number(stats.today.total_net)  },
//     { tier: 'Month',  gross: Number(stats.month.total_amount), net: Number(stats.month.total_net)  },
//     { tier: 'Year',   gross: Number(stats.year.total_amount),  net: Number(stats.year.total_net)   },
//     ...(stats.custom ? [{ tier: 'Custom', gross: Number(stats.custom.total_amount), net: Number(stats.custom.total_net) }] : []),
//   ] : []

//   const pieData = stats ? [
//     { name: 'Commission', value: Number(stats.today.total_commission) },
//     { name: 'Cooli',      value: Number(stats.today.total_cooli)      },
//     { name: 'Chariti',    value: Number(stats.today.total_chariti)    },
//     { name: 'Transport',  value: Number(stats.today.total_transport)  },
//   ].filter(d => d.value > 0) : []

//   // Aggregate BuyerDetails rows for the dashboard table
//   // (group by buyer+patti+item so we get a summary row per combo)
//   const aggregatedBuyers = Object.values(
//     buyers.reduce((acc: any, r) => {
//       const key = `${r.buyer_name}||${r.patti_name}||${r.item_name}`
//       if (!acc[key]) {
//         acc[key] = {
//           buyer_name:   r.buyer_name,
//           patti_name:   r.patti_name,
//           item_name:    r.item_name,
//           total_bags:   0,
//           total_amount: 0,
//           bill_count:   0,
//         }
//       }
//       acc[key].total_bags   += Number(r.bags   || 0)
//       acc[key].total_amount += Number(r.amount || 0)
//       acc[key].bill_count   += 1
//       return acc
//     }, {})
//   ) as { buyer_name: string; patti_name: string; item_name: string; total_bags: number; total_amount: number; bill_count: number }[]

//   return (
//     <div className="space-y-6 animate-fade-in">

//       {/* Header */}
//       <div className="flex flex-wrap items-center justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-display font-bold text-forest">Dashboard</h1>
//           <p className="text-forest/50 text-sm">Overview for NKV Bombay Lemon Traders</p>
//         </div>
//         <div className="flex flex-wrap items-center gap-3">
//           <label className="text-sm">
//             Date:
//             <input type="date" value={date} onChange={e => setDate(e.target.value)}
//               className="input w-auto text-sm ml-2" />
//           </label>
//           <label className="text-sm">
//             From:
//             <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
//               className="input w-auto text-sm ml-2" />
//           </label>
//           <label className="text-sm">
//             To:
//             <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
//               className="input w-auto text-sm ml-2" />
//           </label>
//           {stats && (
//             <button onClick={() => exportDashboardPDF(stats, date, [])} className="btn-ghost text-sm">
//               <FileDown size={16} /> Export PDF
//             </button>
//           )}
//         </div>
//       </div>

//       {loading ? (
//         <div className="flex justify-center py-24">
//           <Loader2 className="animate-spin text-forest" size={32} />
//         </div>
//       ) : error ? (
//         <div className="text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">{error}</div>
//       ) : stats ? (
//         <>
//           {warning && (
//             <div className="text-orange-700 bg-orange-50 border border-orange-200 px-4 py-3 rounded-lg mb-4">
//               {warning}
//             </div>
//           )}

//           {/* Today */}
//           <div className="card"><TierStats tier={`Today — ${date}`} data={stats.today} /></div>

//           {/* Custom range */}
//           {customFrom && customTo && stats.custom && (
//             <div className="card">
//               <TierStats tier={`Custom — ${customFrom} to ${customTo}`} data={stats.custom} />
//             </div>
//           )}

//           {/* Trend chart */}
//           <div className="card">
//             <h3 className="font-semibold text-forest mb-4">Gross/Net Trend</h3>
//             {summaryData.length > 0 ? (
//               <ResponsiveContainer width="100%" height={240}>
//                 <BarChart data={summaryData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
//                   <XAxis dataKey="tier" tick={{ fontSize: 11 }} />
//                   <YAxis tick={{ fontSize: 11 }} />
//                   <Tooltip formatter={(v: any) => formatCurrency(v)} />
//                   <Legend />
//                   <Bar dataKey="gross" name="Gross" fill="#1a3a2a" radius={[4,4,0,0]} />
//                   <Bar dataKey="net"   name="Net"   fill="#f5c518" radius={[4,4,0,0]} />
//                 </BarChart>
//               </ResponsiveContainer>
//             ) : (
//               <div className="text-sm text-forest/60 py-10 text-center">No summary stats available.</div>
//             )}
//           </div>

//           {/* Patti charts */}
//           {barData.length > 0 && (
//             <div className="grid md:grid-cols-2 gap-6">
//               <div className="card">
//                 <h3 className="font-semibold text-forest mb-4">Patti-wise: Gross vs Net</h3>
//                 <ResponsiveContainer width="100%" height={220}>
//                   <BarChart data={barData}>
//                     <XAxis dataKey="name" tick={{ fontSize: 11 }} />
//                     <YAxis tick={{ fontSize: 11 }} />
//                     <Tooltip formatter={(v: any) => formatCurrency(v)} />
//                     <Legend />
//                     <Bar dataKey="Gross" fill="#1a3a2a" radius={[4,4,0,0]} />
//                     <Bar dataKey="Net"   fill="#f5c518" radius={[4,4,0,0]} />
//                   </BarChart>
//                 </ResponsiveContainer>
//               </div>
//               {pieData.length > 0 && (
//                 <div className="card">
//                   <h3 className="font-semibold text-forest mb-4">Deduction Breakdown</h3>
//                   <ResponsiveContainer width="100%" height={220}>
//                     <PieChart>
//                       <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
//                         label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
//                         labelLine={false}>
//                         {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
//                       </Pie>
//                       <Tooltip formatter={(v: any) => formatCurrency(v)} />
//                     </PieChart>
//                   </ResponsiveContainer>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Monthly & Yearly */}
//           <div className="card"><TierStats tier="Monthly Summary" data={stats.month} /></div>
//           <div className="card"><TierStats tier="Yearly Summary"  data={stats.year}  /></div>

//           {/* Buyers table */}
//           {aggregatedBuyers.length > 0 && (
//             <div className="card overflow-x-auto">
//               <h3 className="font-semibold text-forest mb-4">All-Time Buyer Purchases</h3>
//               <table className="w-full text-sm">
//                 <thead>
//                   <tr className="border-b border-forest/10">
//                     {['Buyer', 'Patti', 'Item', 'Bags', 'Amount'].map(h => (
//                       <th key={h} className="text-left py-2 px-3 text-forest/50 font-medium">{h}</th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {aggregatedBuyers.map((b, i) => (
//                     <tr key={i} className="border-b border-forest/5 hover:bg-forest/5">
//                       <td className="py-2 px-3 font-medium">{b.buyer_name}</td>
//                       <td className="py-2 px-3 text-forest/60">{b.patti_name}</td>
//                       <td className="py-2 px-3 text-forest/60">{b.item_name}</td>
//                       <td className="py-2 px-3">{b.total_bags}</td>
//                       <td className="py-2 px-3 font-semibold">{formatCurrency(b.total_amount)}</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </>
//       ) : null}
//     </div>
//   )
// }



// src/pages/admin/Dashboard.tsx
import { useState, useEffect } from 'react'
import { api, DashboardStats, BuyerDetails, formatCurrency } from '../../lib/api'
import { exportDashboardPDF } from '../../lib/pdf-export'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { FileDown, Loader2, TrendingUp, TrendingDown, ShoppingBag, Receipt, Truck, Users } from 'lucide-react'

const COLORS = ['#16a34a', '#f59e0b', '#ef4444', '#3b82f6']

const STAT_THEMES: Record<string, { bg: string; border: string; icon: any; iconColor: string; valueColor: string }> = {
  bills:      { bg: 'from-violet-50 to-violet-100/60',   border: 'border-violet-200',  icon: Receipt,    iconColor: 'text-violet-500',  valueColor: 'text-violet-700'  },
  bags:       { bg: 'from-sky-50 to-sky-100/60',         border: 'border-sky-200',     icon: ShoppingBag, iconColor: 'text-sky-500',    valueColor: 'text-sky-700'     },
  gross:      { bg: 'from-amber-50 to-amber-100/60',     border: 'border-amber-200',   icon: TrendingUp,  iconColor: 'text-amber-500',  valueColor: 'text-amber-700'   },
  net:        { bg: 'from-emerald-50 to-emerald-100/60', border: 'border-emerald-200', icon: TrendingUp,  iconColor: 'text-emerald-500', valueColor: 'text-emerald-700' },
  commission: { bg: 'from-rose-50 to-rose-100/60',       border: 'border-rose-200',    icon: TrendingDown,iconColor: 'text-rose-500',   valueColor: 'text-rose-700'    },
  cooli:      { bg: 'from-orange-50 to-orange-100/60',   border: 'border-orange-200',  icon: TrendingDown,iconColor: 'text-orange-500', valueColor: 'text-orange-700'  },
  chariti:    { bg: 'from-pink-50 to-pink-100/60',       border: 'border-pink-200',    icon: TrendingDown,iconColor: 'text-pink-500',   valueColor: 'text-pink-700'    },
  transport:  { bg: 'from-indigo-50 to-indigo-100/60',   border: 'border-indigo-200',  icon: Truck,       iconColor: 'text-indigo-500', valueColor: 'text-indigo-700'  },
}

function StatCard({
  label, value, sub, themeKey = 'gross',
}: {
  label: string; value: string; sub?: string; themeKey?: string
}) {
  const t = STAT_THEMES[themeKey] ?? STAT_THEMES.gross
  const Icon = t.icon
  return (
    <div className={`relative rounded-2xl border bg-gradient-to-br ${t.bg} ${t.border} p-4 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden`}>
      {/* decorative circle */}
      <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-10 ${t.border.replace('border-', 'bg-')}`} />
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
        <Icon size={14} className={`${t.iconColor} mt-0.5`} />
      </div>
      <div className={`text-xl font-extrabold leading-tight ${t.valueColor}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-1">{sub}</div>}
    </div>
  )
}

function TierStats({ tier, data }: { tier: string; data: any }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-emerald-400 to-teal-600" />
        <h3 className="font-bold text-slate-600 text-sm uppercase tracking-wider">{tier}</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Bills"        value={data.total_bills}               themeKey="bills"      />
        <StatCard label="Bags"         value={data.total_bags}                themeKey="bags"       />
        <StatCard label="Gross Amount" value={formatCurrency(data.total_amount)}   themeKey="gross"      />
        <StatCard label="Net Amount"   value={formatCurrency(data.total_net)}      themeKey="net"        />
        <StatCard label="Commission"   value={formatCurrency(data.total_commission)} themeKey="commission" />
        <StatCard label="Cooli"        value={formatCurrency(data.total_cooli)}    themeKey="cooli"      />
        <StatCard label="Chariti"      value={formatCurrency(data.total_chariti)}  themeKey="chariti"    />
        <StatCard label="Transport"    value={formatCurrency(data.total_transport)} themeKey="transport"  />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0])
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [stats,      setStats]      = useState<DashboardStats | null>(null)
  const [buyers,     setBuyers]     = useState<BuyerDetails[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [warning,    setWarning]    = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    const params: any = { date }
    if (customFrom && customTo) {
      params.from = customFrom
      params.to   = customTo
    }

    Promise.all([
      api.getDashboardStats(params),
      api.getBuyerPurchases({}),
    ])
      .then(([s, b]) => {
        const source = s as any
        let warningMessage = ''

        if (source.hasError) {
          warningMessage = 'Dashboard data partially unavailable.'
          const tierProblems: string[] = []
          ;['today', 'month', 'year', 'custom'].forEach((tier) => {
            const tierData = source[tier]
            if (tierData?.error) tierProblems.push(`${tier}: ${tierData.error}`)
          })
          if (tierProblems.length > 0) warningMessage += ' ' + tierProblems.join(' | ')
        }

        setWarning(warningMessage)
        setError('')
        setStats(s)
        setBuyers(b)
      })
      .catch((err: any) => {
        setError(err?.message || 'Failed to load dashboard data')
        setWarning('')
        setStats(null)
        setBuyers([])
      })
      .finally(() => setLoading(false))
  }, [date, customFrom, customTo])

  const barData = stats?.today.bills?.map(b => ({
    name:    b.patti_name.length > 10 ? b.patti_name.slice(0, 10) + '…' : b.patti_name,
    'Gross': Number(b.total_amount),
    'Net':   Number(b.net_amount),
  })) || []

  const summaryData = stats ? [
    { tier: 'Today',  gross: Number(stats.today.total_amount), net: Number(stats.today.total_net)  },
    { tier: 'Month',  gross: Number(stats.month.total_amount), net: Number(stats.month.total_net)  },
    { tier: 'Year',   gross: Number(stats.year.total_amount),  net: Number(stats.year.total_net)   },
    ...(stats.custom ? [{ tier: 'Custom', gross: Number(stats.custom.total_amount), net: Number(stats.custom.total_net) }] : []),
  ] : []

  const pieData = stats ? [
    { name: 'Commission', value: Number(stats.today.total_commission) },
    { name: 'Cooli',      value: Number(stats.today.total_cooli)      },
    { name: 'Chariti',    value: Number(stats.today.total_chariti)    },
    { name: 'Transport',  value: Number(stats.today.total_transport)  },
  ].filter(d => d.value > 0) : []

  const aggregatedBuyers = Object.values(
    buyers.reduce((acc: any, r) => {
      const key = `${r.buyer_name}||${r.patti_name}||${r.item_name}`
      if (!acc[key]) {
        acc[key] = {
          buyer_name:   r.buyer_name,
          patti_name:   r.patti_name,
          item_name:    r.item_name,
          total_bags:   0,
          total_amount: 0,
          bill_count:   0,
        }
      }
      acc[key].total_bags   += Number(r.bags   || 0)
      acc[key].total_amount += Number(r.amount || 0)
      acc[key].bill_count   += 1
      return acc
    }, {})
  ) as { buyer_name: string; patti_name: string; item_name: string; total_bags: number; total_amount: number; bill_count: number }[]

  /* ─── Shared card shell ─────────────────────────────────── */
  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ${className}`}>
      {children}
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-green-800 via-emerald-700 to-teal-700 p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">
              📊 Dashboard
            </h1>
            <p className="text-emerald-200 text-sm mt-0.5">NKV — Bombay Lemon Traders</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date inputs */}
            {[
              { lbl: 'Date',  val: date,       set: setDate,       type: 'date' as const },
              { lbl: 'From',  val: customFrom, set: setCustomFrom, type: 'date' as const },
              { lbl: 'To',    val: customTo,   set: setCustomTo,   type: 'date' as const },
            ].map(({ lbl, val, set }) => (
              <label key={lbl} className="flex items-center gap-2 text-sm text-emerald-100 font-medium">
                {lbl}:
                <input
                  type="date"
                  value={val}
                  onChange={e => set(e.target.value)}
                  className="rounded-lg border-0 bg-white/15 text-white placeholder-white/50 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 [color-scheme:dark]"
                />
              </label>
            ))}

            {stats && (
              <button
                onClick={() => exportDashboardPDF(stats, date, [])}
                className="flex items-center gap-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-green-900 font-bold px-4 py-2 text-sm shadow transition-all duration-150"
              >
                <FileDown size={15} /> Export PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Loading / Error ─────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="animate-spin text-emerald-600" size={36} />
          <span className="text-slate-400 text-sm">Loading dashboard…</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 text-red-700 bg-red-50 border border-red-200 px-5 py-4 rounded-2xl">
          <span className="text-lg">⚠️</span>
          <span className="text-sm font-medium">{error}</span>
        </div>
      ) : stats ? (
        <>
          {warning && (
            <div className="flex items-center gap-3 text-orange-700 bg-orange-50 border border-orange-200 px-5 py-4 rounded-2xl">
              <span className="text-lg">⚠️</span>
              <span className="text-sm font-medium">{warning}</span>
            </div>
          )}

          {/* ── Today ──────────────────────────────────────── */}
          <Card>
            <TierStats tier={`Today — ${date}`} data={stats.today} />
          </Card>

          {/* ── Custom range ───────────────────────────────── */}
          {customFrom && customTo && stats.custom && (
            <Card className="border-l-4 border-l-violet-400">
              <TierStats tier={`Custom — ${customFrom} to ${customTo}`} data={stats.custom} />
            </Card>
          )}

          {/* ── Trend chart ────────────────────────────────── */}
          <Card>
            <div className="flex items-center gap-2 mb-5">
              <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
              <h3 className="font-bold text-slate-700">Gross / Net Trend</h3>
            </div>
            {summaryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={summaryData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="tier" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: any) => formatCurrency(v)}
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', fontSize: 13 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="gross" name="Gross" fill="#16a34a" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="net"   name="Net"   fill="#fbbf24" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-400 py-10 text-center">No summary stats available.</div>
            )}
          </Card>

          {/* ── Patti charts ───────────────────────────────── */}
          {barData.length > 0 && (
            <div className="grid md:grid-cols-2 gap-5">
              <Card>
                <div className="flex items-center gap-2 mb-5">
                  <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-sky-400 to-blue-600" />
                  <h3 className="font-bold text-slate-700">Patti-wise: Gross vs Net</h3>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: any) => formatCurrency(v)}
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', fontSize: 13 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Gross" fill="#0ea5e9" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="Net"   fill="#34d399" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {pieData.length > 0 && (
                <Card>
                  <div className="flex items-center gap-2 mb-5">
                    <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-rose-400 to-pink-600" />
                    <h3 className="font-bold text-slate-700">Deduction Breakdown</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        outerRadius={82}
                        innerRadius={38}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip
                        formatter={(v: any) => formatCurrency(v)}
                        contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.10)', fontSize: 13 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-1 gap-5">
            <Card className="border-t-4 border-t-sky-400">
              <TierStats tier="Monthly Summary" data={stats.month} />
            </Card>

            <Card className="border-t-4 border-t-violet-400">
              <TierStats tier="Yearly Summary" data={stats.year} />
            </Card>
          </div>

          {/* ── Buyers table ───────────────────────────────── */}
          {aggregatedBuyers.length > 0 && (
            <Card className="overflow-x-auto">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-5 w-1.5 rounded-full bg-gradient-to-b from-teal-400 to-emerald-600" />
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Users size={15} className="text-teal-500" />
                  All-Time Buyer Purchases
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg">
                    {['Buyer', 'Patti', 'Item', 'Bags', 'Amount'].map(h => (
                      <th
                        key={h}
                        className="text-left py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-400 first:rounded-l-lg last:rounded-r-lg"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {aggregatedBuyers.map((b, i) => (
                    <tr
                      key={i}
                      className={`border-b border-slate-50 hover:bg-emerald-50/60 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}
                    >
                      <td className="py-2.5 px-4 font-semibold text-slate-700">{b.buyer_name}</td>
                      <td className="py-2.5 px-4 text-slate-500">{b.patti_name}</td>
                      <td className="py-2.5 px-4 text-slate-500">{b.item_name}</td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center gap-1 bg-sky-100 text-sky-700 font-bold text-xs px-2 py-0.5 rounded-full">
                          <ShoppingBag size={10} /> {b.total_bags}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-bold text-emerald-700">{formatCurrency(b.total_amount)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      ) : null}
    </div>
  )
}
