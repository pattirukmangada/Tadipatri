// src/components/Footer.tsx
import { Phone, MapPin, Clock } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-forest text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-8">
        <div>
          <div className="font-display text-lemon text-xl font-bold mb-2">NKV</div>
          <p className="text-white/60 text-sm leading-relaxed">Bombay Lemon Traders — Lemon Merchant, Commission Agent & Exporter</p>
          <p className="text-white/40 text-xs mt-3">Proprietor: Sonu</p>
          <p className="text-white/40 text-xs mt-3">Proprietor: Bujji</p>
        </div>
        <div>
          <div className="font-semibold text-lemon mb-3">Contact</div>
          <div className="space-y-2 text-sm text-white/70">
            <div className="flex items-center gap-2"><Phone size={14} /><span>+91 7013285158</span></div>
            <div className="flex items-center gap-2"><Phone size={14} /><span>+91 7893287215</span></div>
            <div className="flex items-center gap-2"><Phone size={14} /><span>+91 8639826163</span></div>
            <div className="flex items-start gap-2"><MapPin size={14} className="mt-0.5 shrink-0" /><span>Agriculture Market Yard, Tadipatri, Andhra Pradesh</span></div>
          </div>
        </div>
        <div>
          <div className="font-semibold text-lemon mb-3">Hours</div>
          <div className="flex items-center gap-2 text-sm text-white/70"><Clock size={14} /><span>Sunday,Tuesday,Friday: 9:00 AM – 9:00 PM</span></div>
          <div className="text-white/40 text-sm mt-1 ml-5">Remaining days : Closed</div>
        </div>
      </div>
      <div className="border-t border-white/10 text-center py-4 text-white/30 text-xs">
        © {new Date().getFullYear()} NKV Bombay Lemon Traders · Powered by RukmanWebSolutions
      </div>
    </footer>
  )
}
