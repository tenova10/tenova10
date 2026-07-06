'use client'

import { useCart, fmtTimeRemaining } from '../context/CartContext'
import { DARK, ORANGE, fmt } from '@/lib/constants'

export default function CheckoutModal() {
  const {
    checkoutOpen, closeCheckout,
    cart, cartTotal,
    checkoutReservation, timeLeft,
    form, setForm,
    paying,
    handleCheckout,
  } = useCart()

  if (!checkoutOpen) return null

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeCheckout()}>
      <div className="modal-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ color: DARK, fontSize: 18, fontWeight: 800, margin: 0 }}>Complete Your Order</h2>
          <button onClick={closeCheckout} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, color: '#8892a0', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ background: '#f7f8fc', borderRadius: 11, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#8892a0', fontWeight: 700, letterSpacing: '0.5px', marginBottom: 10 }}>ORDER SUMMARY</div>
          {cart.map(i => (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: DARK, marginBottom: 5 }}>
              <span>{i.name} <span style={{ color: '#8892a0' }}>×{i.qty}</span></span>
              <span style={{ fontWeight: 600 }}>{fmt(Number(i.price) * i.qty)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #e5e7ea', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, color: DARK }}>
            <span>Total</span>
            <span style={{ color: ORANGE }}>{fmt(cartTotal)}</span>
          </div>
        </div>

        {checkoutReservation && (
          <div style={{ background: '#fff8e6', border: '1px solid #ffd66b', borderRadius: 11, padding: 14, marginBottom: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: DARK }}>Items reserved</div>
                <div style={{ fontSize: 12, color: '#8a5a00', marginTop: 3 }}>You have 10 minutes to complete payment.</div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: ORANGE, fontVariantNumeric: 'tabular-nums' }}>
                {fmtTimeRemaining(timeLeft)}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleCheckout}>
          {[
            ['Full Name', 'name', 'text', true],
            ['Email Address', 'email', 'email', true],
            ['Phone Number', 'phone', 'tel', true],
            ['Delivery Address', 'address', 'text', false],
          ].map(([label, field, type, required]) => (
            <div key={field} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 5 }}>
                {label} {required && <span style={{ color: ORANGE }}>*</span>}
              </label>
              <input
                className="form-input"
                type={type}
                value={form[field]}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                required={required}
                placeholder={`Enter your ${label.toLowerCase()}`}
              />
            </div>
          ))}

          <button type="submit" className="primary-btn" disabled={paying} style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, marginTop: 6 }}>
            {paying ? 'Redirecting to Paystack...' : `Pay ${fmt(cartTotal)} →`}
          </button>
          <div style={{ textAlign: 'center', fontSize: 12, color: '#8892a0', marginTop: 10 }}>
            🔒 Your payment is secured by Paystack
          </div>
        </form>
      </div>
    </div>
  )
}