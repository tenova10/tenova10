'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { adminFetch } from '@/lib/adminApiClient'

const DARK = '#0e1e32'
const ORANGE = '#fd7e0d'

const EMPTY_FORM = {
  eyebrow_text: '',
  headline: '',
  accent_text: '',
  subtitle: '',
  image_url_desktop: '',
  image_url_mobile: '',
  primary_cta_label: '',
  primary_cta_link: '',
  secondary_cta_label: '',
  secondary_cta_link: '',
}

export default function HeroBannerManager({ showToast }) {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [desktopPreview, setDesktopPreview] = useState(null)
  const [mobilePreview, setMobilePreview] = useState(null)
  const [uploadingDesktop, setUploadingDesktop] = useState(false)
  const [uploadingMobile, setUploadingMobile] = useState(false)
  const [saving, setSaving] = useState(false)
  const desktopFileRef = useRef()
  const mobileFileRef = useRef()

  const fetchBanners = async () => {
    try {
      const res = await adminFetch('/api/admin/hero-banners')
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setBanners(result)
    } catch (err) {
      showToast(err.message, 'error')
    }
    setLoading(false)
  }

  useEffect(() => { fetchBanners() }, [])

  const uploadImage = async (file, setUploading, field, setPreview) => {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `hero-${field}-${Date.now()}-${Math.random().toString(36).substr(2, 8)}.${ext}`
      const { error } = await supabase.storage.from('products').upload(fileName, file)
      if (error) throw error
      const { data } = supabase.storage.from('products').getPublicUrl(fileName)
      setForm(f => ({ ...f, [field]: data.publicUrl }))
      setPreview(data.publicUrl)
    } catch (err) {
      showToast('Image upload failed: ' + err.message, 'error')
    }
    setUploading(false)
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setDesktopPreview(null)
    setMobilePreview(null)
  }

  const startEdit = (b) => {
    setEditId(b.id)
    setForm({
      eyebrow_text: b.eyebrow_text || '',
      headline: b.headline || '',
      accent_text: b.accent_text || '',
      subtitle: b.subtitle || '',
      image_url_desktop: b.image_url_desktop || '',
      image_url_mobile: b.image_url_mobile || '',
      primary_cta_label: b.primary_cta_label || '',
      primary_cta_link: b.primary_cta_link || '',
      secondary_cta_label: b.secondary_cta_label || '',
      secondary_cta_link: b.secondary_cta_link || '',
    })
    setDesktopPreview(b.image_url_desktop || null)
    setMobilePreview(b.image_url_mobile || null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.headline.trim()) {
      showToast('Headline is required.', 'error')
      return
    }
    setSaving(true)
    try {
      if (editId) {
        const res = await adminFetch('/api/admin/hero-banners', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, ...form }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error)
        showToast('✅ Banner updated!')
      } else {
        const res = await adminFetch('/api/admin/hero-banners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error)
        showToast('✅ Banner saved as a draft. Add it to the rotation to make it live.')
      }
      resetForm()
      fetchBanners()
    } catch (err) {
      showToast(err.message, 'error')
    }
    setSaving(false)
  }

  const toggleActive = async (id, current) => {
    try {
      const res = await adminFetch('/api/admin/hero-banners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !current }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      showToast(current ? 'Removed from rotation.' : '✅ Added to homepage rotation!')
      fetchBanners()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const deleteBanner = async (id) => {
    if (!confirm('Delete this banner? This cannot be undone.')) return
    try {
      const res = await adminFetch('/api/admin/hero-banners', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      showToast('🗑️ Banner deleted.')
      fetchBanners()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const moveBanner = async (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= banners.length) return
    const a = banners[index]
    const b = banners[targetIndex]
    try {
      await adminFetch('/api/admin/hero-banners', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, sort_order: b.sort_order }) })
      await adminFetch('/api/admin/hero-banners', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id, sort_order: a.sort_order }) })
      fetchBanners()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div className="admin-two-col">
      <div style={{ background: 'white', borderRadius: 16, padding: 24, border: '0.5px solid #eef0f5', position: 'sticky', top: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 20 }}>
          {editId ? '✏️ Edit Banner' : '➕ New Banner'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: DARK }}>Eyebrow Tag</label>
            <input className="form-input" value={form.eyebrow_text} onChange={e => setForm(f => ({ ...f, eyebrow_text: e.target.value }))} placeholder="e.g. NEW COLLECTION" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: DARK }}>Headline *</label>
            <input className="form-input" value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} placeholder="e.g. Elevate Your" required />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: DARK }}>Accent Text <span style={{ color: '#8892a0', fontWeight: 400 }}>(orange, second line)</span></label>
            <input className="form-input" value={form.accent_text} onChange={e => setForm(f => ({ ...f, accent_text: e.target.value }))} placeholder="e.g. Everyday" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: DARK }}>Subtitle</label>
            <textarea className="form-input" rows={2} style={{ resize: 'vertical' }} value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="e.g. Premium quality. Timeless style." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: DARK }}>Primary Button Text</label>
              <input className="form-input" value={form.primary_cta_label} onChange={e => setForm(f => ({ ...f, primary_cta_label: e.target.value }))} placeholder="Shop New Arrivals" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: DARK }}>Primary Button Link</label>
              <input className="form-input" value={form.primary_cta_link} onChange={e => setForm(f => ({ ...f, primary_cta_link: e.target.value }))} placeholder="#products" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: DARK }}>Secondary Button Text</label>
              <input className="form-input" value={form.secondary_cta_label} onChange={e => setForm(f => ({ ...f, secondary_cta_label: e.target.value }))} placeholder="Explore Collections" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: DARK }}>Secondary Button Link</label>
              <input className="form-input" value={form.secondary_cta_link} onChange={e => setForm(f => ({ ...f, secondary_cta_link: e.target.value }))} placeholder="/product/some-id" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: DARK }}>Desktop Image</label>
            <div style={{ fontSize: 11, color: '#8892a0', marginBottom: 6 }}>Recommended: 1600 × 600px (wide banner)</div>
            <input type="file" ref={desktopFileRef} accept="image/*" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], setUploadingDesktop, 'image_url_desktop', setDesktopPreview)} style={{ display: 'none' }} />
            <button type="button" onClick={() => desktopFileRef.current.click()} style={{ width: '100%', border: '1.5px dashed #d0d3db', borderRadius: 10, padding: 14, background: '#f7f8fc', cursor: 'pointer', fontSize: 13, color: '#8892a0', fontFamily: 'inherit', textAlign: 'center' }}>
              {desktopPreview
                ? <img src={desktopPreview} alt="preview" style={{ width: '100%', maxHeight: 100, objectFit: 'cover', borderRadius: 8 }} />
                : uploadingDesktop ? '⏳ Uploading...' : '🖥️ Click to upload desktop image'}
            </button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: DARK }}>Mobile Image</label>
            <div style={{ fontSize: 11, color: '#8892a0', marginBottom: 6 }}>Recommended: 800 × 1000px (taller crop for narrow screens)</div>
            <input type="file" ref={mobileFileRef} accept="image/*" onChange={e => e.target.files[0] && uploadImage(e.target.files[0], setUploadingMobile, 'image_url_mobile', setMobilePreview)} style={{ display: 'none' }} />
            <button type="button" onClick={() => mobileFileRef.current.click()} style={{ width: '100%', border: '1.5px dashed #d0d3db', borderRadius: 10, padding: 14, background: '#f7f8fc', cursor: 'pointer', fontSize: 13, color: '#8892a0', fontFamily: 'inherit', textAlign: 'center' }}>
              {mobilePreview
                ? <img src={mobilePreview} alt="preview" style={{ width: '100%', maxHeight: 100, objectFit: 'cover', borderRadius: 8 }} />
                : uploadingMobile ? '⏳ Uploading...' : '📱 Click to upload mobile image'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving || uploadingDesktop || uploadingMobile} style={{ flex: 1, background: ORANGE, color: 'white', border: 'none', borderRadius: 11, padding: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', opacity: (saving || uploadingDesktop || uploadingMobile) ? 0.65 : 1 }}>
              {saving ? 'Saving...' : editId ? 'Update Banner' : 'Save as Draft'}
            </button>
            {editId && (
              <button type="button" onClick={resetForm} style={{ padding: '12px 16px', border: '1px solid #e0e3ea', borderRadius: 11, background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, color: '#8892a0' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 6 }}>All Banners ({banners.length})</h2>
        <p style={{ fontSize: 12, color: '#8892a0', marginBottom: 16 }}>
          Banners marked "In Rotation" cycle automatically on the homepage every 5 seconds, in the order shown below.
        </p>
        {loading && <div style={{ color: '#8892a0', fontSize: 14 }}>Loading...</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {banners.map((b, i) => (
            <div key={b.id} style={{ background: 'white', borderRadius: 13, padding: '14px 16px', border: '0.5px solid #eef0f5', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button onClick={() => moveBanner(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.3 : 1, fontSize: 14 }}>▲</button>
                <button onClick={() => moveBanner(i, 1)} disabled={i === banners.length - 1} style={{ background: 'none', border: 'none', cursor: i === banners.length - 1 ? 'default' : 'pointer', opacity: i === banners.length - 1 ? 0.3 : 1, fontSize: 14 }}>▼</button>
              </div>
              <div style={{ width: 64, height: 64, borderRadius: 9, overflow: 'hidden', flexShrink: 0, background: '#0e1e32', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {b.image_url_desktop && <img src={b.image_url_desktop} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: DARK }}>
                  {b.headline} {b.accent_text && <span style={{ color: ORANGE }}>{b.accent_text}</span>}
                </div>
                <div style={{ fontSize: 12, color: '#8892a0', marginTop: 2 }}>{b.subtitle}</div>
              </div>
              <span style={{ padding: '5px 10px', borderRadius: 999, background: b.is_active ? '#dcfce7' : '#f0f1f5', color: b.is_active ? '#166534' : '#8892a0', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                {b.is_active ? '🟢 In Rotation' : 'Draft'}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => toggleActive(b.id, b.is_active)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #e0e3ea', background: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
                  {b.is_active ? 'Remove' : 'Add to Rotation'}
                </button>
                <button onClick={() => startEdit(b)} style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #e0e3ea', background: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
                  Edit
                </button>
                <button onClick={() => deleteBanner(b.id)} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit' }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {!loading && banners.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#8892a0', fontSize: 14 }}>
              No banners yet. Create one using the form.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}