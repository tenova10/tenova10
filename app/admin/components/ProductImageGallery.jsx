'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const DARK = '#0e1e32'
const ORANGE = '#fd7e0d'

export default function ProductImageGallery({ productId, showToast }) {
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef()

  const fetchImages = async () => {
    try {
      const res = await fetch(`/api/admin/product-images?product_id=${productId}`)
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setImages(result)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  useEffect(() => {
    if (productId) fetchImages()
  }, [productId])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 8)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('products').upload(fileName, file)
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('products').getPublicUrl(fileName)

      const res = await fetch('/api/admin/product-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, image_url: urlData.publicUrl }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      showToast('✅ Image added!')
      fetchImages()
    } catch (err) {
      showToast('Image upload failed: ' + err.message, 'error')
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (id) => {
    try {
      const res = await fetch('/api/admin/product-images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setImages(prev => prev.filter(img => img.id !== id))
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  return (
    <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #eef0f5' }}>
      <label style={{ display: 'block', marginBottom: 10, fontSize: 13, fontWeight: 600, color: DARK }}>
        Additional Images <span style={{ color: '#8892a0', fontWeight: 400 }}>(shown in the gallery on the product page)</span>
      </label>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {images.map(img => (
          <div key={img.id} style={{ position: 'relative', width: 64, height: 64, borderRadius: 8, overflow: 'hidden', border: '1px solid #e0e3ea' }}>
            <img src={img.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              onClick={() => handleDelete(img.id)}
              style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
              aria-label="Remove image"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <input type="file" ref={fileRef} accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
      <button
        type="button"
        onClick={() => fileRef.current.click()}
        disabled={uploading}
        style={{ width: '100%', border: '1.5px dashed #d0d3db', borderRadius: 10, padding: '12px', background: '#f7f8fc', cursor: 'pointer', fontSize: 13, color: '#8892a0', fontFamily: 'inherit', opacity: uploading ? 0.65 : 1 }}
      >
        {uploading ? '⏳ Uploading...' : `➕ Add image (${images.length} so far)`}
      </button>
    </div>
  )
}