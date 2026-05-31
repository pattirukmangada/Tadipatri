// // src/components/AdminLayout.tsx
// import { useEffect, useState } from 'react'
// import { Outlet, NavLink, useNavigate } from 'react-router-dom'
// import { api } from '../lib/api'
// import {
//   LayoutDashboard, FileText, Users, Mail, Settings,
//   LogOut, Menu, ChevronRight, TrendingUp, Package, CalendarRange,BookOpen
// } from 'lucide-react'


// const navItems = [
//   { to: '/admin',               label: 'Dashboard',    icon: LayoutDashboard, end: true },
//   { to: '/admin/bills',         label: 'Bills',         icon: FileText },
//   { to: '/admin/buyers',        label: 'Buyers bills',  icon: Users },
//   { to: '/admin/patti-report',  label: 'Farmer Statements',  icon: CalendarRange },
//   { to: '/admin/serial-print',  label: 'Serial Print',  icon: Package },
//   { to: '/admin/profit-loss',   label: 'Profit & Loss', icon: TrendingUp },
//   { to: '/admin/ledger', label: 'General Ledger', icon: BookOpen },
//   { to: '/admin/contacts',      label: 'Messages',      icon: Mail },
//   { to: '/admin/settings',      label: 'Settings',      icon: Settings },
// ]

// export default function AdminLayout() {
//   const navigate = useNavigate()
//   const [collapsed, setCollapsed] = useState(false)
//   const [mobileOpen, setMobileOpen] = useState(false)
//   const [todayBags, setTodayBags] = useState<number | null>(null)
//   const authenticated = api.isAuthenticated()

//   useEffect(() => {
//     if (!authenticated) {
//       navigate('/admin/login')
//     }
//   }, [authenticated, navigate])

//   useEffect(() => {
//     if (!authenticated) return
//     api.getDashboardStats()
//       .then((stats) => setTodayBags(Number(stats.today.total_bags) || 0))
//       .catch(() => setTodayBags(null))
//   }, [authenticated])

//   if (!authenticated) return null

//   function handleLogout() {
//     api.logout()
//     navigate('/admin/login')
//   }

//   const SidebarContent = () => (
//     <div className="flex flex-col h-full">
//       {/* Logo */}
//             <div className={`flex items-center gap-3 p-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
//         <div className="w-9 h-9 bg-lemon rounded-full flex items-center justify-center text-forest-dark font-bold text-base shrink-0">N</div>
//         {!collapsed && (
//           <div>
//             <div className="font-display font-bold text-lemon text-sm">NKV Admin</div>
//             <div className="text-white/40 text-[10px]">Lemon Traders</div>
//             <div className="text-white/40 text-[10px]">Tadipatri</div>
//           </div>
//         )}
//       </div>

//       <nav className="flex-1 px-3 py-4 space-y-1">
//         {navItems.map(({ to, label, icon: Icon, end }) => (
//           <NavLink
//             key={to}
//             to={to}
//             end={end}
//             className={({ isActive }) =>
//               `sidebar-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
//             }
//             title={collapsed ? label : undefined}
//           >
//             <Icon size={18} className="shrink-0" />
//             {!collapsed && <span>{label}</span>}
//           </NavLink>
//         ))}
//       </nav>

//       <div className="p-3 border-t border-white/10">
//         <button
//           onClick={handleLogout}
//           className={`sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 ${collapsed ? 'justify-center px-2' : ''}`}
//         >
//           <LogOut size={18} />
//           {!collapsed && <span>Logout</span>}
//         </button>
//       </div>
//     </div>
//   )

//   return (
//     <div className="flex h-screen bg-gray-50">
//       <aside className={`hidden md:flex flex-col bg-forest transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
//         <SidebarContent />
//         <button
//           onClick={() => setCollapsed(!collapsed)}
//           className={`sidebar-toggle absolute left-0 top-1/2 -translate-y-1/2 bg-forest border border-white/20 rounded-full p-1 text-white/60 hover:text-white hidden md:flex ${collapsed ? 'sidebar-toggle-collapsed' : 'sidebar-toggle-expanded'}`}
//           title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
//         >
//           <ChevronRight size={14} className={`transition-transform ${collapsed ? '' : 'rotate-180'}`} />
//         </button>
//       </aside>

//       {mobileOpen && (
//         <div className="md:hidden fixed inset-0 z-50 flex">
//           <div className="w-60 bg-forest h-full"><SidebarContent /></div>
//           <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
//         </div>
//       )}

//       <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
//         <header className="bg-white border-b border-gray-200 px-4 h-14 flex items-center gap-3 shrink-0">
//           <button className="md:hidden p-1.5 rounded-lg hover:bg-gray-100" onClick={() => setMobileOpen(true)} title="Open menu">
//             <Menu size={20} />
//           </button>
//           <div className="flex-1" />
//           {todayBags !== null && (
//             <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-forest/5 text-forest">
//               <Package size={16} />
//               <span className="text-xs font-medium uppercase tracking-wide text-forest/50">Today Bags</span>
//               <span className="text-sm font-semibold">{todayBags}</span>
//             </div>
//           )}
//           <span className="text-sm text-gray-500">NKV Admin Panel   |   Tadipatri</span>
//         </header>
//         <main className="flex-1 overflow-auto p-4 md:p-6">
//           <Outlet />
//         </main>
//       </div>
//     </div>
//   )
// }

// src/components/AdminLayout.tsx
import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import {
  LayoutDashboard, FileText, Users, Mail, Settings,
  LogOut, Menu, ChevronRight, TrendingUp, Package, CalendarRange, BookOpen
} from 'lucide-react'

const navItems = [
  { to: '/admin',               label: 'Dashboard',          icon: LayoutDashboard, end: true,  color: '#f59e0b', bg: 'rgba(245,158,11,0.15)'  },
  { to: '/admin/bills',         label: 'Bills',              icon: FileText,        color: '#34d399', bg: 'rgba(52,211,153,0.15)'  },
  { to: '/admin/buyers',        label: 'Buyers Bills',       icon: Users,           color: '#60a5fa', bg: 'rgba(96,165,250,0.15)'  },
  { to: '/admin/patti-report',  label: 'Farmer Statements',  icon: CalendarRange,   color: '#f472b6', bg: 'rgba(244,114,182,0.15)' },
  { to: '/admin/serial-print',  label: 'Serial Print',       icon: Package,         color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
  { to: '/admin/profit-loss',   label: 'Profit & Loss',      icon: TrendingUp,      color: '#fb923c', bg: 'rgba(251,146,60,0.15)'  },
  { to: '/admin/ledger',        label: 'General Ledger',     icon: BookOpen,        color: '#2dd4bf', bg: 'rgba(45,212,191,0.15)'  },
  { to: '/admin/contacts',      label: 'Messages',           icon: Mail,            color: '#e879f9', bg: 'rgba(232,121,249,0.15)' },
  { to: '/admin/settings',      label: 'Settings',           icon: Settings,        color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [todayBags, setTodayBags] = useState<number | null>(null)
  const authenticated = api.isAuthenticated()

  useEffect(() => {
    if (!authenticated) navigate('/admin/login')
  }, [authenticated, navigate])

  useEffect(() => {
    if (!authenticated) return
    api.getDashboardStats()
      .then((stats) => setTodayBags(Number(stats.today.total_bags) || 0))
      .catch(() => setTodayBags(null))
  }, [authenticated])

  if (!authenticated) return null

  function handleLogout() {
    api.logout()
    navigate('/admin/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #141e38 0%, #1e1b4b 50%, #475573 100%)' }}>

      {/* Rainbow top stripe */}
      <div className="h-1 w-full shrink-0" style={{
        background: 'linear-gradient(90deg, #f59e0b, #34d399, #60a5fa, #f472b6, #a78bfa, #fb923c, #2dd4bf, #e879f9)'
      }} />

      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b ${collapsed ? 'justify-center' : ''}`}
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-black text-base shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #f97316)',
            color: '#0f172a',
            boxShadow: '0 0 16px rgba(245,158,11,0.5)'
          }}>
          N
        </div>
        {!collapsed && (
          <div>
            <div className="font-black text-sm tracking-tight" style={{ color: '#f59e0b', letterSpacing: '-0.02em' }}>NKV Admin</div>
            <div className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>Lemon Traders · Tadipatri</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end, color, bg }, i) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex items-center gap-3 rounded-xl transition-all duration-200 group"
            style={({ isActive }) => ({
              padding: collapsed ? '10px' : '10px 12px',
              justifyContent: collapsed ? 'center' : undefined,
              background: isActive ? bg : 'transparent',
              border: isActive ? `1px solid ${color}30` : '1px solid transparent',
              marginBottom: '1px',
            })}
            title={collapsed ? label : undefined}
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  className="shrink-0 transition-all duration-200"
                  style={{ color: isActive ? color : 'rgba(255,255,255,0.45)', filter: isActive ? `drop-shadow(0 0 6px ${color})` : undefined }}
                />
                {!collapsed && (
                  <span
                    className="text-sm font-medium transition-colors duration-200"
                    style={{ color: isActive ? color : 'rgba(255,255,255,0.6)' }}
                  >
                    {label}
                  </span>
                )}
                {!collapsed && isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full rounded-xl transition-all duration-200"
          style={{
            padding: collapsed ? '10px' : '10px 12px',
            justifyContent: collapsed ? 'center' : undefined,
            color: 'rgba(248,113,113,0.7)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)'
            ;(e.currentTarget as HTMLElement).style.color = '#f87171'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.7)'
          }}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen" style={{ background: '#f1f5f9' }}>

      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col relative transition-all duration-300 shrink-0 shadow-2xl"
        style={{ width: collapsed ? 64 : 232 }}
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-6 h-6 rounded-full shadow-lg border transition-all duration-200 z-10"
          style={{ background: '#1e1b4b', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronRight size={13} style={{ transform: collapsed ? 'none' : 'rotate(180deg)', transition: 'transform 0.3s' }} />
        </button>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-60 h-full shadow-2xl"><SidebarContent /></div>
          <div className="flex-1 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Header */}
        <header className="shrink-0 bg-white flex items-center gap-3 px-4" style={{
          height: 56,
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
        }}>
          <button
            className="md:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: '#64748b' }}
            onClick={() => setMobileOpen(true)}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f1f5f9'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            title="Open menu"
          >
            <Menu size={20} />
          </button>

          {/* Colorful header accent strip */}
          <div className="hidden sm:flex gap-1 ml-1">
            {['#f59e0b','#34d399','#60a5fa','#f472b6','#a78bfa'].map(c => (
              <div key={c} className="w-2 h-2 rounded-full" style={{ background: c, opacity: 0.7 }} />
            ))}
          </div>

          <div className="flex-1" />

          {todayBags !== null && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold text-sm shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #f59e0b22, #f9731622)',
                color: '#b45309',
                border: '1px solid #f59e0b40'
              }}>
              <Package size={15} style={{ color: '#f59e0b' }} />
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: '#d97706' }}>Today Bags</span>
              <span className="font-bold" style={{ color: '#92400e' }}>{todayBags}</span>
            </div>
          )}

          <div className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', color: 'rgba(255,255,255,0.85)' }}>
            NKV Admin &nbsp;·&nbsp; Tadipatri
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

