'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useCart } from './context/CartContext'
import ProductCard from './components/ProductCard'
import { ORANGE, DARK, EMOJI, fmt } from '@/lib/constants'
import { fuzzy } from '@/lib/search'
import FeaturedCarousel from './components/FeaturedCarousel'

/* ─── Fuzzy search (Levenshtein) ────────────────── */


export default function ShopPage() {
  const { showToast, searchQ, categoriesById } = useCart()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState('all')

  const CATS = [
    { k: 'all', l: 'All Products' },
    ...Object.values(categoriesById).map(c => ({ k: c.id, l: `${c.emoji} ${c.label}` })),
  ]

  /* ── Fetch products ──────────────────────────── */
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

  /* ── Realtime stock updates ──────────────────── */
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

  /* ── Filtered products ───────────────────────── */
  const filtered = products.filter(p =>
    (cat === 'all' || p.category === cat) &&
    fuzzy(p.name, p.description, searchQ)
  )
  const featuredProducts = products.filter(p => p.featured && p.is_active)

  return (
    <>
      {/* ── HERO ─────────────────────────────────── */}
      <div style={{ background: DARK, padding: '48px 20px 40px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', background: 'rgba(253,126,13,0.1)', borderRadius: 20, padding: '6px 16px', marginBottom: 16, border: '0.5px solid rgba(253,126,13,0.22)' }}>
          <span style={{ color: ORANGE, fontSize: 12, fontWeight: 600 }}>🚚 Free delivery on orders above ₦30,000</span>
        </div>
        <h1 style={{ color: 'white', fontSize: 40, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.5px', margin: '0 0 12px' }}>
          Shop <span style={{ color: ORANGE }}>10/10</span> products<br />you'll absolutely love
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, maxWidth: 440, margin: '0 auto 26px', lineHeight: 1.65 }}>
          Fashion, kitchenware & household essentials — curated for quality, priced for everyone.
        </p>
        <button
          className="primary-btn"
          onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Shop Now →
        </button>
      </div>

      {/* ── TRUST STRIP ──────────────────────────── */}
      <div style={{ background: 'white', padding: '13px 20px', borderBottom: '1px solid #eef0f5' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 36, flexWrap: 'wrap' }}>
          {[['🛡️', '100% Authentic'], ['🚚', 'Fast Delivery'], ['⭐', '4.8 Avg Rating'], ['😊', '500+ Customers']].map(([icon, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: DARK }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURED PRODUCTS ───────────────────── */}
      {featuredProducts.length > 0 && (
        <section style={{ background: '#fafafa', borderTop: '1px solid #eef0f5', borderBottom: '1px solid #eef0f5', padding: '26px 0', overflow: 'hidden' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: DARK, marginBottom: 6 }}>
              ⭐ Featured Products
            </h2>
            <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>
              Hand-picked products we think you'll love.
            </p>

            <FeaturedCarousel products={featuredProducts} />
          </div>
        </section>
      )}

      {/* ── PRODUCTS ─────────────────────────────── */}
      <div id="products" style={{ maxWidth: 1100, margin: '0 auto', padding: '30px 20px 56px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          {CATS.map(c => (
            <button
              key={c.k}
              onClick={() => setCat(c.k)}
              className={`cat-pill ${cat === c.k ? 'active' : ''}`}
            >
              {c.l}
            </button>
          ))}
          {!loading && (
            <span style={{ marginLeft: 'auto', fontSize: 13, color: '#8892a0' }}>
              {filtered.length} product{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(215px,1fr))', gap: 16 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(215px,1fr))', gap: 16 }}>
            {filtered.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
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