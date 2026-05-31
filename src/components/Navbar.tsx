// src/components/Navbar.tsx
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/sales', label: 'Top Sales' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <nav className="bg-forest text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-lemon rounded-full flex items-center justify-center text-forest-dark font-display font-bold text-base">N</div>
          <div className="leading-tight">
            <div className="font-display font-bold text-lemon text-base">NKV</div>
            <div className="text-white/60 text-[10px] tracking-wider uppercase">Bombay Lemon Traders</div>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === l.to ? 'bg-lemon text-forest-dark' : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link to="/admin/login" className="ml-3 bg-lemon/20 border border-lemon/40 text-lemon text-sm font-semibold px-4 py-2 rounded-lg hover:bg-lemon hover:text-forest-dark transition-all">
            Admin
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-forest-dark px-4 pb-4 animate-fade-in">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-sm font-medium my-0.5 ${
                pathname === l.to ? 'bg-lemon text-forest-dark' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link to="/admin/login" onClick={() => setOpen(false)} className="block mt-2 text-center bg-lemon text-forest-dark text-sm font-semibold px-4 py-2.5 rounded-lg">
            Admin Login
          </Link>
        </div>
      )}
    </nav>
  )
}
