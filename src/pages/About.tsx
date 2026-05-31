// src/pages/About.tsx
import { Target, Eye, Clock, MapPin } from 'lucide-react'

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-14">
      <h1 className="text-4xl font-display font-bold text-forest mb-2">About NKV</h1>
      <p className="text-forest/50 mb-10">Bombay Lemon Traders — Your trusted lemon commerce partner</p>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-lemon/20 rounded-lg flex items-center justify-center"><Target size={18} className="text-forest" /></div>
            <h2 className="font-display font-bold text-xl">Our Mission</h2>
          </div>
          <p className="text-forest/60 text-sm leading-relaxed">To provide fair, transparent, and efficient lemon trading services that benefit both farmers and buyers — ensuring quality produce reaches markets across India at the best possible rates.</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-lemon/20 rounded-lg flex items-center justify-center"><Eye size={18} className="text-forest" /></div>
            <h2 className="font-display font-bold text-xl">Our Vision</h2>
          </div>
          <p className="text-forest/60 text-sm leading-relaxed">To become the most trusted lemon commission agent in Andhra Pradesh, connecting rural farmers with national and international markets through honest, reliable partnerships.</p>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="font-display font-bold text-xl mb-4">Business Details</h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          {[
            ['Company', 'NKV — Bombay Lemon Traders'],
            ['Proprietor', 'Sonu & Bujji'],
            ['Type', 'Lemon Merchant · Commission Agent · Exporter'],
            ['Market', 'Agriculture Market Yard, Tadipatri, Andhra Pradesh'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-forest/40 mb-0.5">{k}</dt>
              <dd className="font-medium text-forest">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4"><Clock size={18} className="text-forest" /><h2 className="font-display font-bold text-xl">Business Hours</h2></div>
        <div className="space-y-2 text-sm">
          {[['Sunday','9:00 AM – 9:00 PM'],['Tuesday','9:00 AM – 9:00 PM'],['Friday','9:00 AM – 9:00 PM'],].map(([d, h]) => (
            <div key={d} className="flex justify-between border-b border-forest/5 pb-2">
              <span className="text-forest/60">{d}</span>
              <span className={`font-medium ${d === 'Sunday' ? 'text-red-500' : 'text-forest'}`}>{h}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
