// src/pages/Home.tsx
import { Link } from 'react-router-dom'
import { Leaf, Award, Truck, Phone, ArrowRight } from 'lucide-react'

const highlights = [
  { icon: Leaf, title: 'Fresh Lemons', desc: 'Sourced directly from farms across Andhra Pradesh for peak quality and freshness.' },
  { icon: Award, title: 'Commission Agent', desc: 'Trusted MSR-style commission services for farmers and buyers at Tadipatri market.' },
  { icon: Truck, title: 'Export Ready', desc: 'Bulk supply and export services — reliable logistics across South India.' },
]

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative bg-forest overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 20% 80%, #f5c518 0%, transparent 50%), radial-gradient(circle at 80% 20%, #f5c518 0%, transparent 40%)',
          }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-lemon/20 border border-lemon/30 text-lemon text-xs font-semibold px-4 py-1.5 rounded-full mb-6 animate-fade-in">
            <Leaf size={12} /> Established Lemon Traders · Tadipatri
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            NKV Bombay<br /><span className="text-lemon">Lemon Traders</span>
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Lemon Merchant · Commission Agent · Exporter<br />
            Agriculture Market Yard, Tadipatri, Andhra Pradesh.
          </p>
          <div className="flex flex-wrap justify-center gap-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link to="/contact" className="btn-secondary text-base px-6 py-3">
              Contact Us <ArrowRight size={16} />
            </Link>
            <Link to="/sales" className="bg-white/10 text-white border border-white/20 font-semibold px-6 py-3 rounded-lg hover:bg-white/20 transition-all inline-flex items-center gap-2">
              View Top Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-display font-bold text-forest text-center mb-2">Why Choose NKV?</h2>
        <p className="text-center text-forest/50 mb-10">Trusted by farmers and buyers across Tadipatri district</p>
        <div className="grid md:grid-cols-3 gap-6">
          {highlights.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card text-center hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-lemon/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon size={24} className="text-forest" />
              </div>
              <h3 className="font-semibold text-forest text-lg mb-2">{title}</h3>
              <p className="text-forest/60 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-lemon/10 border-y border-lemon/20">
        <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-2xl font-bold text-forest mb-1">Ready to partner with us?</h3>
            <p className="text-forest/60">Get the best rates for your lemon trade. Call us Any Time : 6AM–9PM.</p>
          </div>
          <a href="tel:+917013285158" className="btn-primary text-base px-6 py-3 shrink-0">
            <Phone size={18} /> Call Now
          </a>
        </div>
      </section>
    </div>
  )
}
