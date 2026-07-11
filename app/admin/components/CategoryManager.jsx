'use client'

import { useState } from 'react'
import { adminFetch } from '@/lib/adminApiClient'

const ORANGE = '#fd7e0d'
const DARK = '#0e1e32'

export default function CategoryManager({ categories, refreshCategories, showToast }) {
  const [newLabel, setNewLabel] = useState('')
  const [newEmoji, setNewEmoji] = useState('📦')
  const [saving, setSaving] = useState(false)

  const addCategory = async (e) => {
    e.preventDefault()
    if (!newLabel.trim()) return
    setSaving(true)
    try {
      const res = await adminFetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel, emoji: newEmoji }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setNewLabel('')
      setNewEmoji('📦')
      showToast('✅ Category added!')
      refreshCategories()
    } catch (err) {
      showToast(err.message, 'error')
    }
    setSaving(false)
  }

  const toggleVisibility = async (id, current) => {
    try {
      const res = await adminFetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, show_on_storefront: !current }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      refreshCategories()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const showAll = async () => {
    try {
      const res = await adminFetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showAll: true }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      showToast('✅ All categories are now visible on the storefront.')
      refreshCategories()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '0.5px solid #eef0f5', position: 'sticky', top: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 20 }}>➕ Add Category</h2>
        <form onSubmit={addCategory}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <input
              className="form-input"
              value={newEmoji}
              onChange={e => setNewEmoji(e.target.value)}
              style={{ width: 60, textAlign: 'center', fontSize: 20 }}
              maxLength={4}
            />
            <input
              className="form-input"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="e.g. Electronics"
              style={{ flex: 1 }}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            style={{ width: '100%', background: ORANGE, color: 'white', border: 'none', borderRadius: 11, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.65 : 1 }}
          >
            {saving ? 'Adding...' : 'Add Category'}
          </button>
        </form>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: DARK }}>All Categories ({categories.length})</h2>
          <button
            onClick={showAll}
            style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${ORANGE}`, background: 'white', color: ORANGE, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}
          >
            👁️ Show All on Storefront
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {categories.map(c => (
            <div key={c.id} style={{ background: 'white', borderRadius: 13, padding: '14px 16px', border: '0.5px solid #eef0f5', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 26 }}>{c.emoji}</div>
              <div style={{ flex: 1, fontWeight: 600, fontSize: 14, color: DARK }}>{c.label}</div>
              <span
                style={{
                  padding: '5px 10px',
                  borderRadius: 999,
                  background: c.show_on_storefront ? '#dcfce7' : '#fee2e2',
                  color: c.show_on_storefront ? '#166534' : '#991b1b',
                  fontSize: 11,
                  fontWeight: 700,
                  minWidth: 100,
                  textAlign: 'center',
                }}
              >
                {c.show_on_storefront ? '🟢 Visible' : '🔴 Hidden'}
              </span>
              <button
                onClick={() => toggleVisibility(c.id, c.show_on_storefront)}
                style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #e0e3ea', background: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}
              >
                {c.show_on_storefront ? 'Hide' : 'Show'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}