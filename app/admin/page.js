'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import AdminNavbar from './components/AdminNavbar'
import LoginForm from './components/LoginForm'
import AdminStats from './components/AdminStats'
import ProductForm from './components/ProductForm'

const ORANGE = '#fd7e0d'
const DARK   = '#0e1e32'
const fmt    = p => `₦${Number(p).toLocaleString()}`

const EMPTY_FORM = {
  name: '', description: '', price: '', old_price: '',
  category: 'fashion', stock: '', image_url: '',
}

export default function AdminPage() {
  const [authed, setAuthed]         = useState(false)
  const [password, setPassword]     = useState('')
  const [products, setProducts]     = useState([])
  const [orders, setOrders]         = useState([])
  const [tab, setTab]               = useState('products')
  const [form, setForm]             = useState(EMPTY_FORM)
  const [editId, setEditId]         = useState(null)
  const [imageFile, setImageFile]   = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [saving, setSaving]         = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [toast, setToast]           = useState(null)
  const [stats, setStats]           = useState({ total: 0, paid: 0, revenue: 0, lowStock: 0 })
  const fileRef = useRef()

  /* ── Auth ─────────────────────────────────────── */
  useEffect(() => {
    if (sessionStorage.getItem('tenova10_admin') === 'true') setAuthed(true)
  }, [])

  useEffect(() => {
    if (!authed) return
    fetchProducts()
    fetchOrders()
  }, [authed])

  /* ── Stats ────────────────────────────────────── */
  useEffect(() => {
    if (!products.length && !orders.length) return
    setStats({
      total:    orders.length,
      paid:     orders.filter(o => o.status === 'paid').length,
      revenue:  orders.filter(o => o.status === 'paid').reduce((s, o) => s + Number(o.total), 0),
      lowStock: products.filter(p => p.stock <= 5 && p.stock > 0).length,
    })
  }, [products, orders])

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products').select('*')
      .order('created_at', { ascending: false })
    setProducts(data || [])
  }

  const fetchOrders = async () => {
  try {
    const response = await fetch('/api/orders')

    const result = await response.json()

    if (!response.ok) {
      showToast(result.error, 'error')
      return
    }

    setOrders(result)

  } catch (err) {
    showToast(err.message, 'error')
  }
}

  const login = async (e) => {
    e.preventDefault()
    const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            password
        })
    });

    const result = await response.json();

    if (!response.ok) {
        showToast(result.error, "error");
        return;
    }

    setAuthed(true);
  }

  const logout = () => {
    sessionStorage.removeItem('tenova10_admin')
    setAuthed(false)
  }

  /* ── Image handling ───────────────────────────── */
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const uploadImage = async (file) => {
    setUploading(true)
    const ext      = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 8)}.${ext}`
    const { error } = await supabase.storage.from('products').upload(fileName, file)
    if (error) {
      showToast('Image upload failed: ' + error.message, 'error')
      setUploading(false)
      return null
    }
    const { data } = supabase.storage.from('products').getPublicUrl(fileName)
    setUploading(false)
    return data.publicUrl
  }

  /* ── Save product ─────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    let imageUrl = form.image_url
    if (imageFile) {
      const url = await uploadImage(imageFile)
      if (!url) { setSaving(false); return }
      imageUrl = url
    }

    const payload = {
      name:        form.name.trim(),
      description: form.description.trim(),
      price:       parseFloat(form.price),
      old_price:   form.old_price ? parseFloat(form.old_price) : null,
      category:    form.category,
      stock:       parseInt(form.stock, 10),
      image_url:   imageUrl,
    }

    const response = await fetch('/api/products', {
  method: editId ? 'PUT' : 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(
  editId
    ? { ...payload, id: editId }
    : payload
  ),
})

const result = await response.json()

if (!response.ok) {
  showToast('Save failed: ' + result.error, 'error')
} else {
  showToast(editId ? '✅ Product updated!' : '✅ Product added!')
  resetForm()
  fetchProducts()
}
    setSaving(false)
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditId(null)
    setImageFile(null)
    setImagePreview(null)
  }

  const startEdit = (p) => {
    setEditId(p.id)
    setForm({
      name:        p.name,
      description: p.description || '',
      price:       p.price.toString(),
      old_price:   p.old_price?.toString() || '',
      category:    p.category,
      stock:       p.stock.toString(),
      image_url:   p.image_url || '',
    })
    setImagePreview(p.image_url || null)
    setTab('products')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteProduct = async (id, name) => {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return

  const response = await fetch('/api/products', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id }),
  })

  const result = await response.json()

  if (!response.ok) {
    showToast('Delete failed: ' + result.error, 'error')
  } else {
    showToast('Product deleted.')
    fetchProducts()
  }
}

  const toggleActive = async (id, current) => {
  const response = await fetch('/api/products', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id,
      is_active: !current,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    showToast('Update failed: ' + result.error, 'error')
  } else {
    fetchProducts()
  }
}

  const updateOrderStatus = async (id, status) => {
  const response = await fetch('/api/orders', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id,
      status,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    showToast('Update failed: ' + result.error, 'error')
  } else {
    fetchOrders()
  }
}

  const EMOJI = { fashion: '👗', kitchen: '🍳', household: '🏠' }

  /* ═══ LOGIN SCREEN ════════════════════════════ */
  if (!authed) {
    return (
      <LoginForm
        password={password}
        setPassword={setPassword}
        login={login}
        toast={toast}
      />
    )
  }

  /* ═══ ADMIN DASHBOARD ════════════════════════ */
  return (
    <div style={{minHeight:'100vh',background:'#f7f8fc'}}>
      {/* Toast */}
      {toast && (
        <div style={{position:'fixed',top:20,right:20,background: toast.type==='error'?'#e53e3e':DARK,color:'white',padding:'13px 20px',borderRadius:11,zIndex:1000,fontSize:14,fontWeight:500,boxShadow:'0 4px 20px rgba(0,0,0,0.2)'}}>
          {toast.msg}
        </div>
      )}

      {/* Admin Navbar */}
      <AdminNavbar
        tab={tab}
        setTab={setTab}
        logout={logout}
      />

      {/* Stats bar */}
      <AdminStats
        stats={stats}
        products={products}
        fmt={fmt}
      />

      <div style={{maxWidth:1200,margin:'0 auto',padding:'28px 24px'}}>

        {/* ── PRODUCTS TAB ────────────────────── */}
        {tab === 'products' && (
          <div style={{display:'grid',gridTemplateColumns:'340px 1fr',gap:24,alignItems:'start'}}>

            {/* Product Form */}
            <ProductForm
              editId={editId}
              handleSubmit={handleSubmit}
              form={form}
              setForm={setForm}
              fileRef={fileRef}
              handleFileChange={handleFileChange}
              imagePreview={imagePreview}
              uploading={uploading}
              saving={saving}
              resetForm={resetForm}
              setImageFile={setImageFile}
              setImagePreview={setImagePreview}
            />
            

            {/* Product List */}
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <h2 style={{fontSize:16,fontWeight:700,color:DARK}}>All Products ({products.length})</h2>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {products.map(p => (
                  <div key={p.id} style={{background:'white',borderRadius:13,padding:'14px 16px',border:'0.5px solid #eef0f5',display:'flex',gap:14,alignItems:'center'}}>
                    {/* Thumb */}
                    <div style={{width:54,height:54,borderRadius:9,overflow:'hidden',flexShrink:0,background:'#f0f2f6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                        : EMOJI[p.category]}
                    </div>
                    {/* Info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:14,color:DARK,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.name}</div>
                      <div style={{display:'flex',gap:12,marginTop:4,fontSize:12,color:'#8892a0',flexWrap:'wrap'}}>
                        <span style={{color:ORANGE,fontWeight:700}}>{fmt(p.price)}</span>
                        <span>Stock: <strong style={{color: p.stock===0?'#e53e3e': p.stock<=5?'#c05000':DARK}}>{p.stock}</strong></span>
                        <span style={{textTransform:'capitalize'}}>{p.category==='kitchen'?'Kitchenware':p.category}</span>
                        {p.old_price && <span style={{textDecoration:'line-through'}}>{fmt(p.old_price)}</span>}
                      </div>
                    </div>
                    {/* Actions */}
                    <div style={{display:'flex',gap:6,flexShrink:0}}>
                      <button onClick={()=>toggleActive(p.id,p.is_active)}
                        style={{padding:'5px 10px',borderRadius:6,border:'none',background:p.is_active?'#dcfce7':'#fee2e2',color:p.is_active?'#166534':'#991b1b',cursor:'pointer',fontSize:11,fontWeight:700,fontFamily:'inherit'}}>
                        {p.is_active ? 'Live' : 'Hidden'}
                      </button>
                      <button onClick={()=>startEdit(p)}
                        style={{padding:'5px 12px',borderRadius:6,border:'1px solid #e0e3ea',background:'white',cursor:'pointer',fontSize:11,fontFamily:'inherit',fontWeight:600}}>
                        Edit
                      </button>
                      <button onClick={()=>deleteProduct(p.id,p.name)}
                        style={{padding:'5px 10px',borderRadius:6,border:'none',background:'#fee2e2',color:'#991b1b',cursor:'pointer',fontSize:11,fontFamily:'inherit',fontWeight:600}}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {products.length === 0 && (
                  <div style={{textAlign:'center',padding:'48px 0',color:'#8892a0',fontSize:14}}>
                    No products yet. Add your first product using the form.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── ORDERS TAB ──────────────────────── */}
        {tab === 'orders' && (
          <div>
            <h2 style={{fontSize:16,fontWeight:700,color:DARK,marginBottom:18}}>Orders ({orders.length})</h2>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {orders.map(o => (
                <div key={o.id} style={{background:'white',borderRadius:14,padding:'18px 20px',border:'0.5px solid #eef0f5'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,marginBottom:10}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:15,color:DARK}}>{o.customer_name}</div>
                      <div style={{fontSize:13,color:'#8892a0',marginTop:2}}>{o.customer_email} · {o.customer_phone}</div>
                      {o.customer_address && <div style={{fontSize:12,color:'#aab0bc',marginTop:1}}>📍 {o.customer_address}</div>}
                      <div style={{fontSize:11,color:'#c0c4cc',marginTop:3}}>Ref: {o.reference}</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontWeight:800,fontSize:17,color:DARK}}>{fmt(o.total)}</div>
                      <select
                        value={o.status}
                        onChange={e=>updateOrderStatus(o.id,e.target.value)}
                        style={{marginTop:6,padding:'4px 8px',borderRadius:6,border:'1px solid #e0e3ea',fontSize:11,fontWeight:700,fontFamily:'inherit',cursor:'pointer',
                          background: o.status==='paid'?'#dcfce7':o.status==='shipped'?'#dbeafe':o.status==='delivered'?'#f0fdf4':o.status==='cancelled'?'#fee2e2':'#fff3e6',
                          color: o.status==='paid'?'#166534':o.status==='shipped'?'#1e40af':o.status==='delivered'?'#14532d':o.status==='cancelled'?'#991b1b':'#c05000'
                        }}>
                        {['pending','paid','shipped','delivered','cancelled'].map(s=>(
                          <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{fontSize:13,color:'#8892a0',marginBottom:6}}>
                    {(o.items||[]).map(i=>`${i.name} ×${i.qty}`).join(' · ')}
                  </div>
                  <div style={{fontSize:11,color:'#c0c4cc'}}>
                    {new Date(o.created_at).toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short'})}
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <div style={{textAlign:'center',padding:'56px 0',color:'#8892a0',fontSize:14}}>
                  No orders yet. They'll appear here once customers start buying.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: 12,
  fontWeight: 700,
  color: '#0e1e32',
  marginBottom: 5,
  letterSpacing: '0.2px',
}
