'use client'

import { useState, useEffect } from 'react'
import { adminFetch } from '@/lib/adminApiClient'

const DARK = '#0e1e32'
const ORANGE = '#fd7e0d'

export default function ProductVariantManager({ productId, showToast }) {
  const [variants, setVariants] = useState([])
  const [label, setLabel] = useState('')
  const [stock, setStock] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchVariants = async () => {
    try {
      const res = await adminFetch(`/api/admin/product-variants?product_id=${productId}`)
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setVariants(result)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  useEffect(() => {
    if (productId) fetchVariants()
  }, [productId])

  const addVariant = async (e) => {
    e.preventDefault()
    if (!label.trim() || stock === '') return

    setSaving(true)
    try {
      const res = await adminFetch('/api/admin/product-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, label, stock }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      setLabel('')
      setStock('')
      showToast('✅ Variant added!')
      fetchVariants()
    } catch (err) {
      showToast(err.message, 'error')
    }
    setSaving(false)
  }

  const updateVariantStock = async (id, newStock) => {
    try {
      const res = await adminFetch('/api/admin/product-variants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stock: newStock }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      fetchVariants()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const deleteVariant = async (id, variantLabel) => {
    if (!confirm(`Remove variant "${variantLabel}"?`)) return
    try {
      const res = await adminFetch('/api/admin/product-variants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      fetchVariants()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #eef0f5' }}>
      <label style={{ display: 'block', marginBottom: 10, fontSize: 13, fontWeight: 600, color: DARK }}>
        Variants <span style={{ color: '#8892a0', fontWeight: 400 }}>(e.g. colors, sizes — customers pick one at checkout)</span>
      </label>

      {variants.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {variants.map(v => {
            const available = v.stock - (v.reserved_stock || 0)
            return (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f7f8fc', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: DARK }}>{v.label}</div>
                <input
                  type="number"
                  min="0"
                  defaultValue={v.stock}
                  onBlur={e => {
                    const newVal = Number.parseInt(e.target.value, 10)
                    if (Number.isInteger(newVal) && newVal !== v.stock) updateVariantStock(v.id, newVal)
                  }}
                  style={{ width: 70, border: '1px solid #e0e3ea', borderRadius: 7, padding: '6px 8px', fontSize: 13, fontFamily: 'inherit' }}
                />
                <span style={{ fontSize: 11, color: available <= 0 ? '#e53e3e' : available <= 5 ? '#c05000' : '#8892a0', minWidth: 70 }}>
                  {available} available
                </span>
                <button
                  onClick={() => deleteVariant(v.id, v.label)}
                  style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}
                >
                  Remove
                </button>
              </div>
            )
          })}
        </div>
      )}

      <form onSubmit={addVariant} style={{ display: 'flex', gap: 8 }}>
        <input
          className="form-input"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="e.g. Red / Large"
          style={{ flex: 2 }}
        />
        <input
          className="form-input"
          type="number"
          min="0"
          value={stock}
          onChange={e => setStock(e.target.value)}
          placeholder="Qty"
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          disabled={saving}
          style={{ padding: '10px 16px', background: ORANGE, color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.65 : 1, whiteSpace: 'nowrap' }}
        >
          + Add
        </button>
      </form>

      {variants.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#8892a0' }}>
          ⚠️ The "Stock Quantity" field above is now ignored — availability is tracked per variant.
        </div>
      )}
    </div>
  )
}