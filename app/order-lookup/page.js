'use client'

import { useState } from 'react'
import { fmt } from '@/lib/constants'

const DARK = '#0e1e32'

const STATUS_STYLES = {
  pending:        { bg: '#fff3e6', color: '#c05000', label: 'Pending' },
  paid:           { bg: '#dcfce7', color: '#166534', label: 'Paid' },
  shipped:        { bg: '#dbeafe', color: '#1e40af', label: 'Shipped' },
  delivered:      { bg: '#f0fdf4', color: '#14532d', label: 'Delivered' },
  cancelled:      { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  expired:        { bg: '#fee2e2', color: '#991b1b', label: 'Expired' },
  payment_review: { bg: '#fff3e6', color: '#c05000', label: 'Payment Under Review' },
}

export default function OrderLookupPage() {
  const [email, setEmail] = useState('')
  const [reference, setReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [order, setOrder] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setOrder(null)

    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reference }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setOrder(result)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const statusStyle = order ? (STATUS_STYLES[order.status] || STATUS_STYLES.pending) : null

  return (
    <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 20px' }}>
      <h1 style={{ color: DARK, fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Track Your Order</h1>
      <p style={{ color: '#8892a0', fontSize: 14, marginBottom: 30 }}>
        Enter the email you ordered with and your order reference to check its status.
      </p>

      <form onSubmit={handleSubmit} style={{ background: 'white', borderRadius: 16, padding: 24, border: '0.5px solid #eef0f5', marginBottom: 24 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: DARK }}>Email</label>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: DARK }}>Order Reference</label>
          <input
            className="form-input"
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="e.g. T10-172..."
            required
          />
        </div>
        <button type="submit" className="primary-btn" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? 'Checking...' : 'Check Order Status'}
        </button>
      </form>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: '14px 18px', fontSize: 14, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {order && (
        <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '0.5px solid #eef0f5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: '#8892a0' }}>Order Reference</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: DARK }}>{order.reference}</div>
            </div>
            <span style={{ padding: '6px 14px', borderRadius: 999, background: statusStyle.bg, color: statusStyle.color, fontSize: 12, fontWeight: 700 }}>
              {statusStyle.label}
            </span>
          </div>

          <div style={{ fontSize: 13, color: '#8892a0', marginBottom: 6 }}>
            {(order.items || []).map(i => `${i.name}${i.variant_label ? ` (${i.variant_label})` : ''} ×${i.qty}`).join(' · ')}
          </div>

          <div style={{ fontWeight: 800, fontSize: 20, color: DARK, marginTop: 10 }}>{fmt(order.total)}</div>

          <div style={{ fontSize: 12, color: '#c0c4cc', marginTop: 14, borderTop: '1px solid #f0f1f5', paddingTop: 12 }}>
            Ordered {new Date(order.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
            {order.paid_at && <> · Paid {new Date(order.paid_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</>}
          </div>
        </div>
      )}
    </div>
  )
}