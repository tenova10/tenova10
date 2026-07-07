'use client'

import Link from 'next/link'
import { useCart } from '../context/CartContext'
import { ORANGE, DARK, EMOJI, fmt } from '@/lib/constants'

export default function ProductCard({ product: p }) {
  const { wishlist, toggleWish, addedId, addToCart, getAvailableStock, categoriesById } = useCart()

  const isAdded = addedId === p.id
  const availableStock = getAvailableStock(p)
  const isOos = availableStock <= 0
  const isLow = availableStock > 0 && availableStock <= 5

  return (
    <div className="product-card" style={{ position: 'relative' }}>
      <Link
        href={`/product/${p.id}`}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        aria-label={p.name}
      />

      <div style={{ position: 'relative', overflow: 'hidden', height: 190, background: '#f0f2f6' }}>
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            className="product-img"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 70 }}>
            {categoriesById[p.category]?.emoji || '📦'}
          </div>
        )}

        <button className="wish-btn" style={{ zIndex: 2 }} onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          toggleWish(p.id)
        }} aria-label="Toggle wishlist">
          {wishlist.has(p.id) ? '❤️' : '🤍'}
        </button>

        {p.old_price && <span className="sale-badge">SALE</span>}

        {isOos && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ background: DARK, color: 'white', padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Out of Stock</span>
          </div>
        )}
      </div>

      <div style={{ padding: '13px 15px 15px' }}>
        <div style={{ fontSize: 10, color: ORANGE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>
          {p.category === 'kitchen' ? 'Kitchenware' : p.category === 'fashion' ? 'Fashion' : 'Household'}
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, color: DARK, lineHeight: 1.35, marginBottom: 7 }}>{p.name}</div>

        {p.rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 7 }}>
            <span style={{ color: '#fbbf24', fontSize: 12 }}>{'★'.repeat(Math.round(p.rating))}</span>
            <span style={{ fontSize: 11, color: '#8892a0' }}>{p.rating} ({p.review_count})</span>
          </div>
        )}

        {isLow && (
          <div style={{ display: 'inline-block', background: '#fff3e6', border: '0.5px solid #ffd0a0', borderRadius: 6, padding: '3px 9px', fontSize: 11, color: '#c05000', fontWeight: 600, marginBottom: 9 }}>
            🔥 Only {availableStock} left!
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 12 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: DARK }}>{fmt(p.price)}</span>
          {p.old_price && <span style={{ fontSize: 12, color: '#aab0bc', textDecoration: 'line-through' }}>{fmt(p.old_price)}</span>}
        </div>

        <button
          className={`add-btn ${isAdded ? 'added' : ''} ${isOos ? 'oos' : ''}`}
          style={{ position: 'relative', zIndex: 2 }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            addToCart(p)
          }}
          disabled={isOos}
        >
          {isAdded ? '✓ Added to Cart!' : isOos ? 'Out of Stock' : '🛒 Add to Cart'}
        </button>
      </div>
    </div>
  )
}