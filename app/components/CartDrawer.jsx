'use client'

import { useCart } from '../context/CartContext'
import CartUpdates from './CartUpdates'
import { EMOJI, ORANGE, DARK, fmt } from '@/lib/constants'

export default function CartDrawer() {
  const {
    cart, setCart,
    cartOpen, setCartOpen,
    cartCount, cartTotal,
    cartMessages, setCartMessages,
    updateQty,
    setCheckoutOpen, categoriesById,
  } = useCart()

  if (!cartOpen) return null

  return (
    <>
      <div className="cart-overlay" onClick={() => setCartOpen(false)} />

      <div className="cart-drawer">
        <div className="cart-drawer-handle" />

        <div className="cart-drawer-header">
          <span style={{ fontWeight: 800, fontSize: 16, color: DARK }}>
            Your Cart ({cartCount} item{cartCount !== 1 ? 's' : ''})
          </span>
          <button
            onClick={() => setCartOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#8892a0', lineHeight: 1 }}
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        <div className="cart-drawer-body">
          <CartUpdates
            messages={cartMessages}
            onClose={() => setCartMessages([])}
          />

          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#8892a0' }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>🛒</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: DARK, marginBottom: 6 }}>Your cart is empty</div>
              <div style={{ fontSize: 13 }}>Add some items to get started!</div>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-drawer-item">
                <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#eef0f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30 }}>
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : categoriesById[item.category]?.emoji || '📦'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: 14, color: ORANGE, fontWeight: 800, marginTop: 3 }}>
                    {fmt(item.price)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                    <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                    <span style={{ fontSize: 14, fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                    <button
                      onClick={() => setCart(c => c.filter(i => i.id !== item.id))}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#aab0bc', fontFamily: 'inherit' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-drawer-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 14, color: '#8892a0', fontWeight: 600 }}>Total</span>
              <span style={{ fontWeight: 800, fontSize: 22, color: DARK }}>{fmt(cartTotal)}</span>
            </div>
            <button
              className="primary-btn"
              style={{ width: '100%', justifyContent: 'center', padding: '15px' }}
              onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}
            >
              Checkout with Paystack →
            </button>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#8892a0', marginTop: 10 }}>
              🔒 Secured by Paystack
            </div>
          </div>
        )}
      </div>
    </>
  )
}