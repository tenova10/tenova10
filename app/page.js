'use client'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCart } from './context/CartContext'
import ProductCard from './components/ProductCard'
import FeaturedCarousel from './components/FeaturedCarousel'
import HeroBannerCarousel from './components/HeroBannerCarousel'
import { fuzzy } from '@/lib/search'
import { ORANGE, DARK, EMOJI, fmt } from '@/lib/constants'

function ShopPageContent() {
  const { showToast, searchQ, categoriesById } = useCart()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('all')
  const [onSaleOnly, setOnSaleOnly] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const urlCat = searchParams.get('cat')
    setCat(urlCat || 'all')
  }, [searchParams])

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (!error) setProducts(data || [])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('products-live')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'products',
      }, payload => {
        setProducts(prev =>
          prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p)
        )
        if (payload.new.stock === 0) {
          showToast(`"${payload.new.name}" just sold out!`)
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [showToast])

  const filtered = products.filter(p =>
    (cat === 'all' || p.category === cat) &&
    (!onSaleOnly || p.on_sale) &&
    fuzzy(p.name, p.description, searchQ)
  )
  const featuredProducts = products.filter(p => p.featured && p.is_active)

  // const dynamicCats = [
  //   { k: 'all', l: 'All Products' },
  //   ...Object.values(categoriesById).map(c => ({ k: c.id, l: `${c.emoji} ${c.label}` })),
  // ]

  return (
    <>
      <HeroBannerCarousel />

      {/* ── TRUST STRIP ──────────────────────────── */}
      <div className="trust-strip" style={{ background: 'transparent' }}>
        <div className="trust-strip-inner">
          {['100% Authentic', 'Fast Delivery', '500+ Customers'].map(label => (
            <div className="trust-item" key={label}>
              <span className="trust-item-label" style={{ color: DARK }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURED PRODUCTS ───────────────────── */}
      {featuredProducts.length > 0 && (
        <div className="featured-outer">
          <h2 style={{ fontSize: 22, fontWeight: 800, color: DARK, marginBottom: 6 }}>
            Featured Products
          </h2>
          <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>
            Hand-picked products we think you'll love.
          </p>

          <FeaturedCarousel products={featuredProducts} />
        </div>
      )}

      {/* ── PRODUCTS ─────────────────────────────── */}
      <div id="products" className="products-section">
        <div className="products-narrow-wrap">
        <div className="category-pills-row">
          <button
            onClick={() => setOnSaleOnly(v => !v)}
            className={`cat-pill ${onSaleOnly ? 'active' : ''}`}
            style={{ flexShrink: 0 }}
          >
            🔥 On Sale
          </button>
          {!loading && (
            <span style={{ marginLeft: 'auto', fontSize: 13, color: '#8892a0', flexShrink: 0 }}>
              {filtered.length} product{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading && (
          <div className="products-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 330 }} />
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#8892a0' }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🔍</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: DARK, marginBottom: 6 }}>No results for "{searchQ}"</div>
            <div style={{ fontSize: 14 }}>Try a different keyword — our fuzzy search handles typos!</div>
          </div>
        )}

        {!loading && (
          <div className="products-grid">
            {filtered.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────── */}
      <footer style={{ background: DARK, textAlign: 'center', padding: '32px 20px' }}>
        <div style={{ fontWeight: 800, color: 'white', fontSize: 20, marginBottom: 7 }}>
          tenova<span style={{ color: ORANGE }}>10</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
          Fashion · Kitchenware · Household · © {new Date().getFullYear()} tenova10
        </div>
        <div style={{ fontSize: 12, color: ORANGE, fontWeight: 500 }}>
          Crafted for 10/10 shopping experiences
        </div>
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 20 }}>
          <a href="/admin" style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>Admin</a>
        </div>
      </footer>
    </>
  )
}

export default function ShopPage() {
  return (
    <Suspense fallback={null}>
      <ShopPageContent />
    </Suspense>
  )
}