// src/pages/Gallery.tsx
export default function Gallery() {
  const images = [
    { src: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=600&q=80', alt: 'Fresh Lemons' },
    { src: 'https://images.unsplash.com/photo-1606914907855-41a38a0e4fbb?w=600&q=80', alt: 'Lemon Market' },
    { src: 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc?w=600&q=80', alt: 'Lemon Harvest' },
    { src: 'https://images.unsplash.com/photo-1576857563009-a29b6d23e476?w=600&q=80', alt: 'Lemon Grove' },
    { src: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&q=80', alt: 'Lemons Close-up' },
    { src: 'https://images.unsplash.com/photo-1599598425947-5202edd56fdb?w=600&q=80', alt: 'Lemon Crates' },
  ]
  return (
    <div className="max-w-6xl mx-auto px-4 py-14">
      <h1 className="text-4xl font-display font-bold text-forest mb-2">Gallery</h1>
      <p className="text-forest/50 mb-10">A glimpse into NKV Bombay Lemon Traders</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((img, i) => (
          <div key={i} className="aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
            <img src={img.src} alt={img.alt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
        ))}
      </div>
    </div>
  )
}
