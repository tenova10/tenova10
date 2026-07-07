'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCart } from '../../context/CartContext'
import ProductCard from '../../components/ProductCard'
import { ORANGE, DARK, fmt } from '@/lib/constants'

export default function ProductPage() {
  const { id } = useParams()
  const router = useRouter()

  const {
    wishlist, toggleWish,
    addedId, addToCart,
    getAvailableStock,
    categoriesById,
  } = useCart()

  const [product, setProduct] = useState(null)
  const [similar, setSimilar] = useState([])
  const [galleryImages, setGalleryImages] = useState([])
  const [activeImage, setActiveImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    async function loadProduct() {
      setLoading(true)
      setQty(1)

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        setProduct(null)
        setLoading(false)
        return
      }

      setProduct(data)
      setActiveImage(data.image_url || null)

      const { data: related } = await supabase
        .from('products')
        .select('*')
        .eq('category', data.category)
        .neq('id', data.id)
        .eq('is_active', true)
        .limit(4)

      setSimilar(related || [])

      const { data: images } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', data.id)
        .order('sort_order', { ascending: true })

      setGalleryImages(images || [])

      setLoading(false)
    }

    loadProduct()
  }, [id])

  /* ── Realtime stock for this specific product ── */
  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`product-detail-${id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'products',
        filter: `id=eq.${id}`,
      }, payload => {
        setProduct(prev => prev ? { ...prev, ...payload.new } : prev)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [id])

  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: 'center', fontSize: 18 }}>
        Loading...
      </div>
    )
  }

  if (!product) {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <h2>Product not found.</h2>
        <button
          onClick={() => router.push('/')}
          className="primary-btn"
          style={{ marginTop: 20 }}
        >
          Back Home
        </button>
      </div>
    )
  }

  const isAdded = addedId === product.id
  const availableStock = getAvailableStock(product)
  const isOos = availableStock <= 0
  const isLow = availableStock > 0 && availableStock <= 5
  const isWished = wishlist.has(product.id)
  const categoryEmoji = categoriesById[product.category]?.emoji || '📦'

  /* Cover image + gallery images combined, cover first, no duplicates */
  const allImages = [
    ...(product.image_url ? [product.image_url] : []),
    ...galleryImages.map(g => g.image_url).filter(url => url !== product.image_url),
  ]

  const handleAddToCart = () => {
    if (isOos) return
    for (let i = 0; i < qty; i++) {
      addToCart(product)
    }
    setQty(1)
  }

  return (
    <div style={{ maxWidth: 1100, margin: '50px auto', padding: '0 20px' }}>
      <button
        onClick={() => router.back()}
        style={{ marginBottom: 30, background: 'none', border: 'none', cursor: 'pointer', color: ORANGE, fontWeight: 700 }}
      >
        ← Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 50 }}>
        {/* Image + gallery */}
        <div>
          <div style={{ position: 'relative', background: '#f5f5f5', borderRadius: 20, overflow: 'hidden', minHeight: 500, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {activeImage ? (
              <img
                src={activeImage}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ fontSize: 120 }}>{categoryEmoji}</div>
            )}

            <button
              className="wish-btn"
              style={{ width: 44, height: 44, fontSize: 20 }}
              onClick={() => toggleWish(product.id)}
              aria-label="Toggle wishlist"
            >
              {isWished ? '❤️' : '🤍'}
            </button>

            {product.old_price && <span className="sale-badge" style={{ fontSize: 13, padding: '5px 12px' }}>SALE</span>}

            {isOos && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ background: DARK, color: 'white', padding: '8px 18px', borderRadius: 10, fontSize: 15, fontWeight: 600 }}>Out of Stock</span>
              </div>
            )}
          </div>

          {allImages.length > 1 && (
            <div style={{ display: 'flex', gap: 10, marginTop: 14, overflowX: 'auto', paddingBottom: 4 }}>
              {allImages.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(url)}
                  style={{
                    flexShrink: 0,
                    width: 72,
                    height: 72,
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: activeImage === url ? `2px solid ${ORANGE}` : '2px solid transparent',
                    padding: 0,
                    cursor: 'pointer',
                    background: '#f0f2f6',
                  }}
                >
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div style={{ color: ORANGE, fontWeight: 700, marginBottom: 10 }}>
            {categoriesById[product.category]?.label?.toUpperCase() || product.category.toUpperCase()}
          </div>

          <h1 style={{ color: DARK, fontSize: 38, marginBottom: 15 }}>
            {product.name}
          </h1>

          {product.rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <span style={{ color: '#fbbf24', fontSize: 15 }}>{'★'.repeat(Math.round(product.rating))}</span>
              <span style={{ fontSize: 13, color: '#8892a0' }}>{product.rating} ({product.review_count} reviews)</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 20 }}>
            <div style={{ fontSize: 34, color: ORANGE, fontWeight: 800 }}>
              {fmt(product.price)}
            </div>
            {product.old_price && (
              <div style={{ textDecoration: 'line-through', color: '#999', fontSize: 22 }}>
                {fmt(product.old_price)}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 25, color: '#555', lineHeight: 1.8 }}>
            {product.description}
          </div>

          {isLow && (
            <div style={{ display: 'inline-block', background: '#fff3e6', border: '0.5px solid #ffd0a0', borderRadius: 6, padding: '4px 11px', fontSize: 12, color: '#c05000', fontWeight: 600, marginBottom: 16 }}>
              🔥 Only {availableStock} left!
            </div>
          )}

          <div style={{ marginBottom: 25, fontWeight: 700 }}>
            {isOos ? 'Out of Stock' : `Stock Available: ${availableStock}`}
          </div>

          {!isOos && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: DARK }}>Quantity</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  className="qty-btn"
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                >
                  −
                </button>
                <span style={{ fontSize: 16, fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{qty}</span>
                <button
                  className="qty-btn"
                  onClick={() => setQty(q => Math.min(availableStock, q + 1))}
                  disabled={qty >= availableStock}
                >
                  +
                </button>
              </div>
            </div>
          )}

          <button
            className={`add-btn ${isAdded ? 'added' : ''} ${isOos ? 'oos' : ''}`}
            style={{ padding: '16px 28px', fontSize: 16, width: 'auto', minWidth: 220 }}
            onClick={handleAddToCart}
            disabled={isOos}
          >
            {isAdded ? '✓ Added to Cart!' : isOos ? 'Out of Stock' : '🛒 Add to Cart'}
          </button>
        </div>
      </div>

      {similar.length > 0 && (
        <div style={{ marginTop: 80 }}>
          <h2 style={{ color: DARK, marginBottom: 25 }}>Similar Products</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(215px,1fr))', gap: 16 }}>
            {similar.map(item => <ProductCard key={item.id} product={item} />)}
          </div>
        </div>
      )}
    </div>
  )
}