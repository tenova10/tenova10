'use client'

import { useState, useEffect } from 'react'
import { adminFetch } from '@/lib/adminApiClient'

const DARK = '#0e1e32'
const ORANGE = '#fd7e0d'

const PERMISSIONS = [
  { key: 'can_manage_products', label: 'Manage Products' },
  { key: 'can_manage_orders', label: 'Confirm / Update Orders' },
  { key: 'can_view_stats', label: 'View Stats' },
]

export default function StaffManager({ showToast }) {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [newPerms, setNewPerms] = useState({ can_manage_products: true, can_manage_orders: true, can_view_stats: false })
  const [creating, setCreating] = useState(false)

  const [resetPasswordFor, setResetPasswordFor] = useState(null)
  const [resetPasswordValue, setResetPasswordValue] = useState('')

  const fetchStaff = async () => {
    try {
      const res = await adminFetch('/api/admin/staff')
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setStaff(result.filter(p => p.role === 'staff'))
    } catch (err) {
      showToast(err.message, 'error')
    }
    setLoading(false)
  }

  useEffect(() => { fetchStaff() }, [])

  const createStaff = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await adminFetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, display_name: displayName, ...newPerms }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      showToast(`✅ Staff account created for ${displayName}!`)
      setEmail('')
      setDisplayName('')
      setPassword('')
      setNewPerms({ can_manage_products: true, can_manage_orders: true, can_view_stats: false })
      fetchStaff()
    } catch (err) {
      showToast(err.message, 'error')
    }
    setCreating(false)
  }

  const togglePermission = async (userId, key, current) => {
    try {
      const res = await adminFetch('/api/admin/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, [key]: !current }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      fetchStaff()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const toggleLock = async (userId, current) => {
    try {
      const res = await adminFetch('/api/admin/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, is_locked: !current }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      showToast(current ? '🔓 Account unlocked.' : '🔒 Account locked.')
      fetchStaff()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const submitPasswordReset = async (userId) => {
    if (!resetPasswordValue || resetPasswordValue.length < 6) {
      showToast('New password must be at least 6 characters.', 'error')
      return
    }
    try {
      const res = await adminFetch('/api/admin/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, new_password: resetPasswordValue }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      showToast('✅ Password updated.')
      setResetPasswordFor(null)
      setResetPasswordValue('')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const deleteStaff = async (userId, name) => {
    if (!confirm(`Permanently delete "${name}"'s account? This cannot be undone.`)) return
    try {
      const res = await adminFetch('/api/admin/staff', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      showToast('🗑️ Staff account deleted.')
      fetchStaff()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="admin-two-col">
      {/* Create staff form */}
      <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '0.5px solid #eef0f5', position: 'sticky', top: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 20 }}>➕ Add Staff</h2>
        <form onSubmit={createStaff}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: DARK }}>Display Name</label>
            <input className="form-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Jane Doe" required />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: DARK }}>Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@example.com" required />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: DARK }}>Password</label>
            <input className="form-input" type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Set a password" required />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: DARK }}>Permissions</label>
            {PERMISSIONS.map(p => (
              <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: DARK, marginBottom: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newPerms[p.key]}
                  onChange={e => setNewPerms(prev => ({ ...prev, [p.key]: e.target.checked }))}
                />
                {p.label}
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={creating}
            style={{ width: '100%', background: ORANGE, color: 'white', border: 'none', borderRadius: 11, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', opacity: creating ? 0.65 : 1 }}
          >
            {creating ? 'Creating...' : 'Create Staff Account'}
          </button>
        </form>
      </div>

      {/* Staff list */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 16 }}>All Staff ({staff.length})</h2>

        {loading && <div style={{ color: '#8892a0', fontSize: 14 }}>Loading...</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {staff.map(s => (
            <div key={s.user_id} style={{ background: 'white', borderRadius: 13, padding: '16px 18px', border: '0.5px solid #eef0f5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: DARK }}>{s.display_name}</div>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: 4,
                      padding: '3px 9px',
                      borderRadius: 999,
                      background: s.is_locked ? '#fee2e2' : '#dcfce7',
                      color: s.is_locked ? '#991b1b' : '#166534',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {s.is_locked ? '🔒 Locked' : '🟢 Active'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => toggleLock(s.user_id, s.is_locked)}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e0e3ea', background: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}
                  >
                    {s.is_locked ? 'Unlock' : 'Lock'}
                  </button>
                  <button
                    onClick={() => { setResetPasswordFor(s.user_id === resetPasswordFor ? null : s.user_id); setResetPasswordValue('') }}
                    style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #e0e3ea', background: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => deleteStaff(s.user_id, s.display_name)}
                    style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {resetPasswordFor === s.user_id && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, background: '#f7f8fc', borderRadius: 10, padding: 10 }}>
                  <input
                    className="form-input"
                    type="text"
                    value={resetPasswordValue}
                    onChange={e => setResetPasswordValue(e.target.value)}
                    placeholder="New password"
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={() => submitPasswordReset(s.user_id)}
                    style={{ padding: '8px 16px', background: ORANGE, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                  >
                    Save
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid #f0f1f5' }}>
                {PERMISSIONS.map(p => (
                  <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: DARK, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={s[p.key]}
                      onChange={() => togglePermission(s.user_id, p.key, s[p.key])}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          ))}

          {!loading && staff.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#8892a0', fontSize: 14 }}>
              No staff accounts yet. Create one using the form.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}