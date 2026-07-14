'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { adminFetch } from '@/lib/adminApiClient'
import AdminNavbar from './components/AdminNavbar'
import LoginForm from './components/LoginForm'
import AdminStats from './components/AdminStats'
import ProductForm from './components/ProductForm'
import ProductList from './components/ProductList'
import CategoryManager from './components/CategoryManager'
import StaffManager from './components/StaffManager'
import HeroBannerManager from './components/HeroBannerManager'
import { EMPTY_FORM, EMOJI } from './utils/constants'
import { fmt } from '@/lib/utils'
import {
  fetchProducts as getProducts,
  toggleProduct,
  deleteProduct as removeProduct,
  createProduct,
  updateProduct,
} from './services/productService'
import {
  fetchOrders as getOrders,
  updateOrderStatus as changeOrderStatus,
} from './services/orderService'

const ORANGE = '#fd7e0d'
const DARK   = '#0e1e32'

const LEGACY_PROFILE = {
  role: 'owner',
  can_manage_products: true,
  can_manage_orders: true,
  can_view_stats: true,
}

export default function AdminPage() {
  const [authed, setAuthed]         = useState(false)
  const [adminProfile, setAdminProfile] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')

  const [products, setProducts]     = useState([])
  const [orders, setOrders]         = useState([])
  const [categories, setCategories] = useState([])
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

  /* ── Auth: restore session on load (real Supabase session first, legacy cookie flag second) ── */
  useEffect(() => {
    const restoreSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        const { data: profile } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (profile && !profile.is_locked) {
          setAdminProfile(profile)
          setAuthed(true)
          setCheckingSession(false)
          return
        }

        await supabase.auth.signOut()
      }

      if (sessionStorage.getItem('tenova10_admin') === 'true') {
        setAdminProfile(LEGACY_PROFILE)
        setAuthed(true)
      }

      setCheckingSession(false)
    }

    restoreSession()
  }, [])

  useEffect(() => {
    if (!authed) return
    fetchProducts()
    fetchOrders()
    fetchCategories()
  }, [authed])

  /* ── Realtime: orders ── */
  useEffect(() => {
    if (!authed) return

    const channel = supabase
      .channel('admin-orders-live')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
      }, payload => {
        setOrders(prev => [payload.new, ...prev])
        showToast(`🔔 New order from ${payload.new.customer_name}!`)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
      }, payload => {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [authed])

  /* ── Realtime: product stock ── */
  useEffect(() => {
    if (!authed) return

    const channel = supabase
      .channel('admin-products-live')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'products',
      }, payload => {
        setProducts(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p))
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'products',
      }, payload => {
        setProducts(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [authed])

  /* ── Stats ── */
  useEffect(() => {
    if (!products.length && !orders.length) return
    setStats({
      total:    orders.length,
      paid:     orders.filter(o => o.status === 'paid').length,
      revenue:  orders.filter(o => o.status === 'paid').reduce((s, o) => s + Number(o.total), 0),
      lowStock: products.filter(p => {
        const available = p.stock - (p.reserved_stock || 0)
        return available <= 5 && available > 0
    }).length,
    })
  }, [products, orders])

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchProducts = async () => {
    try {
      const products = await getProducts()
      setProducts(products)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const fetchOrders = async () => {
    try {
      const orders = await getOrders()
      setOrders(orders)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await adminFetch('/api/admin/categories')
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setCategories(result)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  /* ── Login: real email/password ── */
  const loginWithEmail = async (e) => {
    e.preventDefault()

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      showToast(error.message, 'error')
      return
    }

    const { data: profile } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .maybeSingle()

    if (!profile || profile.is_locked) {
      await supabase.auth.signOut()
      showToast('This account is not an authorized admin, or has been locked.', 'error')
      return
    }

    setAdminProfile(profile)
    setAuthed(true)
  }

  /* ── Login: legacy shared password (fallback) ── */
  const loginWithMasterPassword = async (e) => {
    e.preventDefault()
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    const result = await response.json()

    if (!response.ok) {
      showToast(result.error, 'error')
      return
    }

    sessionStorage.setItem('tenova10_admin', 'true')
    setAdminProfile(LEGACY_PROFILE)
    setAuthed(true)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    await fetch('/api/admin/logout', { method: 'POST' })
    sessionStorage.removeItem('tenova10_admin')
    setAuthed(false)
    setAdminProfile(null)
  }

  /* ── Image handling ── */
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

  /* ── Save product ── */
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
      featured:    form.featured,
    }

    try {
      if (editId) {
        await updateProduct(editId, payload)
        showToast('✅ Product updated!')
      } else {
        await createProduct(payload)
        showToast('✅ Product added!')
      }

      resetForm()
      fetchProducts()
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error')
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
      featured:    p.featured || false,
    })
    setImagePreview(p.image_url || null)
    setTab('products')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteProduct = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return

    try {
      await removeProduct(id)
      showToast('🗑️ Product deleted.')
      fetchProducts()
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error')
    }
  }

  const toggleActive = async (id, current) => {
    try {
      await toggleProduct(id, current)
      fetchProducts()
    } catch (err) {
      showToast('Update failed: ' + err.message, 'error')
    }
  }

  const updateOrderStatus = async (id, status) => {
    try {
      await changeOrderStatus(id, status)
      fetchOrders()
    } catch (err) {
      showToast('Update failed: ' + err.message, 'error')
    }
  }

  if (checkingSession) {
    return <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#8892a0'}}>Loading...</div>
  }

  /* ═══ LOGIN SCREEN ═══ */
  if (!authed) {
    return (
      <LoginForm
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        loginWithEmail={loginWithEmail}
        loginWithMasterPassword={loginWithMasterPassword}
        toast={toast}
      />
    )
  }

  /* ═══ ADMIN DASHBOARD ═══ */
  return (
    <div style={{minHeight:'100vh',background:'#f7f8fc'}}>
      {toast && (
        <div style={{position:'fixed',top:20,right:20,background: toast.type==='error'?'#e53e3e':DARK,color:'white',padding:'13px 20px',borderRadius:11,zIndex:1000,fontSize:14,fontWeight:500,boxShadow:'0 4px 20px rgba(0,0,0,0.2)'}}>
          {toast.msg}
        </div>
      )}

      <AdminNavbar tab={tab} setTab={setTab} logout={logout} role={adminProfile?.role} />

      <AdminStats stats={stats} products={products} fmt={fmt} adminProfile={adminProfile} />

      <div style={{maxWidth:1200,margin:'0 auto',padding:'28px 24px'}}>
        {tab === 'products' && (
          <div className="admin-two-col">
            <ProductForm
              editId={editId}
              handleSubmit={handleSubmit}
              form={form}
              setForm={setForm}
              categories={categories}
              showToast={showToast}
              fileRef={fileRef}
              handleFileChange={handleFileChange}
              imagePreview={imagePreview}
              uploading={uploading}
              saving={saving}
              resetForm={resetForm}
              setImageFile={setImageFile}
              setImagePreview={setImagePreview}
            />

            <ProductList
              products={products}
              toggleActive={toggleActive}
              startEdit={startEdit}
              deleteProduct={deleteProduct}
            />
          </div>
        )}

        {tab === 'categories' && (
          <CategoryManager
            categories={categories}
            refreshCategories={fetchCategories}
            showToast={showToast}
          />
        )}

        {tab === 'staff' && (
          <StaffManager showToast={showToast} />
        )}

        {tab === 'banner' && (
          <HeroBannerManager showToast={showToast} />
        )}

        {tab === 'orders' && (
          <div>
            <h2 style={{fontSize:16,fontWeight:700,color:DARK,marginBottom:18}}>Orders ({orders.length})</h2>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {orders.map(o => (
                <div key={o.id} style={{background:'white',borderRadius:14,padding:'18px 20px',border:'0.5px solid #eef0f5'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,marginBottom:10,flexWrap:'wrap'}}>
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
                        {['pending','paid','shipped','delivered','cancelled','expired','payment_review'].map(s=>(
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