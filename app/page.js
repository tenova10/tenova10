'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import CartUpdates from './components/CartUpdates'
import { supabase } from '@/lib/supabase'
import Script from 'next/script'
import Image from 'next/image'

const ORANGE = '#fd7e0d'
const DARK   = '#0e1e32'
const CHECKOUT_RESERVATION_KEY = 'tenova10_checkout_reservation'

/* ─── Fuzzy search (Levenshtein) ────────────────── */
function lev(a, b) {
  const m = a.length, n = b.length
  const d = Array.from({length: m+1}, (_, i) =>
    Array.from({length: n+1}, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = a[i-1] === b[j-1]
        ? d[i-1][j-1]
        : 1 + Math.min(d[i-1][j], d[i][j-1], d[i-1][j-1])
  return d[m][n]
}

function fuzzy(name, desc, q) {
  if (!q.trim()) return true
  const text  = (name + ' ' + (desc || '')).toLowerCase()
  const query = q.toLowerCase()
  if (text.includes(query)) return true
  return query.split(' ').every(qw =>
    text.split(' ').some(tw => lev(tw, qw) <= 2)
  )
}

const fmt = p => `₦${Number(p).toLocaleString()}`
const fmtTime = seconds => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

async function readApiResponse(response, fallbackMessage) {
  const contentType = response.headers.get('content-type') || ''
  const bodyText = await response.text()

  if (contentType.includes('application/json')) {
    try {
      return bodyText ? JSON.parse(bodyText) : {}
    } catch {
      throw new Error(fallbackMessage)
    }
  }

  console.error('Expected JSON but received:', bodyText.slice(0, 500))
  throw new Error(fallbackMessage)
}

const CATS = [
  { k: 'all',       l: 'All Products' },
  { k: 'fashion',   l: '👗 Fashion' },
  { k: 'kitchen',   l: '🍳 Kitchenware' },
  { k: 'household', l: '🏠 Household' },
]

const EMOJI = { fashion: '👗', kitchen: '🍳', household: '🏠' }

export default function ShopPage() {
  const [products, setProducts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [cat, setCat]               = useState('all')
  const [searchQ, setSearchQ]       = useState('')
  const [cart, setCart]             = useState([])
  const [cartOpen, setCartOpen]     = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [form, setForm]             = useState({ name: '', email: '', phone: '', address: '' })
  const [paying, setPaying]         = useState(false)
  const [wishlist, setWishlist]     = useState(new Set())
  const [addedId, setAddedId]       = useState(null)
  const [toast, setToast]           = useState(null)
  const [cartMessages, setCartMessages] = useState([])
  const [checkoutReservation, setCheckoutReservation] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const paystackHandlerRef = useRef(null)
  const paymentCompletedRef = useRef(false)

  /* ── Restore cart from localStorage ─────────── */
  /* ── Restore and validate cart ─────────────── */
useEffect(() => {
  const restoreCart = async () => {
    try {
      const saved = localStorage.getItem('tenova10_cart')

      if (!saved) return

      const storedCart = JSON.parse(saved)

      const response = await fetch('/api/cart/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cart: storedCart,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error(result.error)
        setCart(storedCart)
        return
      }

      setCart(result.cart)
      localStorage.setItem(
        'tenova10_cart',
        JSON.stringify(result.cart)
      )
      setCartMessages(result.messages)

    } catch (err) {
      console.error(err)
    }
  }

  restoreCart()
}, [])

  /* ── Persist cart to localStorage ───────────── */
  useEffect(() => {
    try { localStorage.setItem('tenova10_cart', JSON.stringify(cart)) } catch {}
  }, [cart])

  /* ── Fetch products ──────────────────────────── */
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (!error) setProducts(data || [])
      setLoading(false)
    }
    load()
  }, [])

  /* ── Realtime stock updates ──────────────────── */
  useEffect(() => {
    const channel = supabase
      .channel('products-live')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'products',
      }, payload => {
        setProducts(prev =>
          prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p)
        )
        if (payload.new.stock === 0) {
          showToast(`"${payload.new.name}" just sold out!`)
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const showToast = (msg, duration = 3500) => {
    setToast(msg)
    setTimeout(() => setToast(null), duration)
  }

  const releaseCheckoutReservation = useCallback(async ({
    orderId,
    reason = 'customer_released',
    cancelOrder = true,
  }) => {
    if (!orderId) return

    try {
      await fetch('/api/reservations/release', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          reason,
          cancelOrder,
        }),
      })
    } catch (err) {
      console.error(err)
    }
  }, [])

  const validateCurrentCart = useCallback(async () => {
    try {
      const response = await fetch('/api/cart/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cart }),
      })
      const result = await response.json()

      if (!response.ok) return

      setCart(result.cart)
      localStorage.setItem('tenova10_cart', JSON.stringify(result.cart))
      setCartMessages(result.messages || [])
    } catch (err) {
      console.error(err)
    }
  }, [cart])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHECKOUT_RESERVATION_KEY)
      if (!saved) return

      const reservation = JSON.parse(saved)

      if (!reservation?.expiresAt || new Date(reservation.expiresAt).getTime() <= Date.now()) {
        localStorage.removeItem(CHECKOUT_RESERVATION_KEY)
        return
      }

      if (reservation.form) {
        setForm(reservation.form)
      }

      setCheckoutReservation(reservation)
      setCheckoutOpen(true)
      showToast('You have an unfinished checkout. Complete payment before the timer expires.', 5000)
    } catch {
      localStorage.removeItem(CHECKOUT_RESERVATION_KEY)
    }
  }, [])

  useEffect(() => {
    if (!checkoutReservation?.expiresAt) return

    const tick = async () => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(checkoutReservation.expiresAt).getTime() - Date.now()) / 1000)
      )

      setTimeLeft(remaining)

      if (remaining > 0) return

      paystackHandlerRef.current?.closeIframe?.()
      await releaseCheckoutReservation({
        orderId: checkoutReservation.orderId,
        reason: 'timer_expired',
        cancelOrder: true,
      })
      localStorage.removeItem(CHECKOUT_RESERVATION_KEY)
      setCheckoutReservation(null)
      setPaying(false)
      setCheckoutOpen(false)
      showToast('Your 10 minute reservation expired. Please review your cart and try again.', 5000)
      validateCurrentCart()
    }

    tick()
    const timer = setInterval(tick, 1000)

    return () => clearInterval(timer)
  }, [checkoutReservation, releaseCheckoutReservation, validateCurrentCart])

  /* ── Filtered products ───────────────────────── */
  const filtered = products.filter(p =>
    (cat === 'all' || p.category === cat) &&
    fuzzy(p.name, p.description, searchQ)
  )

  /* ── Cart actions ────────────────────────────── */
  const addToCart = useCallback((product) => {
    const availableStock = Number(product.stock || 0) - Number(product.reserved_stock || 0)

    if (availableStock <= 0) return
    setCart(prev => {
      const ex = prev.find(i => i.id === product.id)
      if (ex) {
        if (ex.qty >= availableStock) {
          showToast(`Only ${availableStock} available!`)
          return prev
        }
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { ...product, qty: 1 }]
    })
    setAddedId(product.id)
    setTimeout(() => setAddedId(null), 950)
  }, [products])

  const updateQty = (id, delta) => {
    const product = products.find(p => p.id === id)
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i
      const newQty = i.qty + delta
      if (newQty <= 0) return null
      const availableStock = product
        ? Number(product.stock || 0) - Number(product.reserved_stock || 0)
        : null
      if (availableStock !== null && newQty > availableStock) {
        showToast(`Only ${availableStock} available!`)
        return i
      }
      return { ...i, qty: newQty }
    }).filter(Boolean))
  }

  const closeCheckout = async () => {
    if (checkoutReservation?.orderId) {
      await releaseCheckoutReservation({
        orderId: checkoutReservation.orderId,
        reason: 'checkout_closed',
        cancelOrder: true,
      })
      localStorage.removeItem(CHECKOUT_RESERVATION_KEY)
      setCheckoutReservation(null)
      setPaying(false)
    }

    setCheckoutOpen(false)
  }

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const cartTotal = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0)

  const toggleWish = id =>
    setWishlist(w => { const n = new Set(w); n.has(id) ? n.delete(id) : n.add(id); return n })

  /* ── Paystack checkout ───────────────────────── */
  const handleCheckout = async (e) => {
    e.preventDefault()
    if (paying) return

    if (!form.name || !form.email || !form.phone) {
      showToast('Please fill in all required fields.')
      return
    }

    setPaying(true)
    paymentCompletedRef.current = false

    try {
      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          cart: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
          total: cartTotal,
        }),
      })

      const checkout = await readApiResponse(
        res,
        'Checkout service returned an invalid response. Please try again.'
      )

      if (!res.ok) {
        if (checkout.cart) {
          setCart(checkout.cart)
          localStorage.setItem('tenova10_cart', JSON.stringify(checkout.cart))
        }
        if (checkout.messages?.length) {
          setCartMessages(checkout.messages)
        }
        throw new Error(checkout.error || 'Please review your cart before paying.')
      }

      setCart(checkout.cart)
      localStorage.setItem('tenova10_cart', JSON.stringify(checkout.cart))

      const reservationResponse = await fetch('/api/reservations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: checkout.orderId,
        }),
      })

      const reservation = await readApiResponse(
        reservationResponse,
        'Reservation service returned an invalid response. Please try again.'
      )

      if (!reservationResponse.ok) {
        throw new Error(reservation.error || 'Unable to reserve inventory.')
      }

      const activeReservation = {
        orderId: checkout.orderId,
        reference: checkout.reference,
        expiresAt: reservation.expiresAt,
        form,
      }

      setCheckoutReservation(activeReservation)
      localStorage.setItem(
        CHECKOUT_RESERVATION_KEY,
        JSON.stringify(activeReservation)
      )

      /* Open Paystack popup */
      const handler = window.PaystackPop.setup({
        key:      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email:    form.email,
        amount:   Math.round(Number(checkout.total) * 100), // kobo
        currency: 'NGN',
        ref:      checkout.reference,
        metadata: {
          custom_fields: [
            { display_name: 'Customer Name',  variable_name: 'customer_name',  value: form.name },
            { display_name: 'Customer Phone', variable_name: 'customer_phone', value: form.phone },
          ],
        },
        callback: (response) => {
          paymentCompletedRef.current = true
          localStorage.removeItem(CHECKOUT_RESERVATION_KEY)
          setCheckoutReservation(null)
          setCart([])
          setCheckoutOpen(false)
          setPaying(false)
          window.location.href = `/order/success?ref=${response.reference}`
        },
        onClose: () => {
          if (paymentCompletedRef.current) return

          releaseCheckoutReservation({
            orderId: checkout.orderId,
            reason: 'paystack_closed',
            cancelOrder: true,
          }).catch(err => console.error(err))

          localStorage.removeItem(CHECKOUT_RESERVATION_KEY)
          setCheckoutReservation(null)
          setPaying(false)
          showToast('Payment window closed.')
        },
      })

      paystackHandlerRef.current = handler
      handler.openIframe()
    } catch (err) {
      showToast(err.message || 'Could not start payment. Please try again.', 5000)
      setPaying(false)
    }
  }

  /* ═══════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════ */
  return (
    <>
      {/* Paystack inline JS */}
      <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* ── NAVBAR ───────────────────────────────── */}
      <nav style={{background: DARK, padding: '0 20px', position: 'sticky', top: 0, zIndex: 100}}>
        <div style={{maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, height: 60}}>
          {/* Logo */}
          <a href="/" style={{display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0}}>
            <div style={{width: 8, height: 8, background: ORANGE, transform: 'rotate(45deg)'}}/>
            <span style={{color: 'white', fontWeight: 800, fontSize: 19, letterSpacing: '-0.3px'}}>
              tenova<span style={{color: ORANGE}}>10</span>
            </span>
          </a>

          {/* Search */}
          <div style={{flex: 1, position: 'relative', maxWidth: 500, margin: '0 auto'}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:16,color:'rgba(255,255,255,0.35)'}}>🔍</span>
            <input
              className="search-input"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search — typos are totally OK!"
            />
          </div>

          {/* Cart button */}
          <button
            onClick={() => setCartOpen(v => !v)}
            className="cart-btn"
            style={{
              background: cartOpen ? 'rgba(253,126,13,0.15)' : ORANGE,
              border: cartOpen ? `1.5px solid ${ORANGE}` : 'none',
            }}
          >
            <span style={{fontSize: 18}}>🛍️</span>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            <span style={{fontWeight: 700, fontSize: 13}}>{fmt(cartTotal)}</span>
          </button>
        </div>
      </nav>

      {/* ── CART PANEL ───────────────────────────── */}
      {cartOpen && (
        
        <div style={{background: 'white', borderBottom: '1px solid #eef0f5'}}>
          <div style={{maxWidth: 1100, margin: '0 auto', padding: '18px 20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <span style={{fontWeight:700,fontSize:15,color:DARK}}>
                Your Cart ({cartCount} item{cartCount !== 1 ? 's' : ''})
              </span>
              <button onClick={() => setCartOpen(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'#8892a0',lineHeight:1}}>✕</button>
            </div>

            <CartUpdates
              messages={cartMessages}
              onClose={() => setCartMessages([])}
            />

            {cart.length === 0 ? (
              
                <div style={{textAlign:'center',padding:'24px 0',color:'#8892a0'}}>
                <div style={{fontSize:44,marginBottom:10}}>🛒</div>
                <div style={{fontSize:14,fontWeight:500}}>Your cart is empty — add some items!</div>
              </div>
            ) : (
              <>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(210px,1fr))',gap:10,maxHeight:260,overflowY:'auto',paddingRight:4}}>
                  {cart.map(item => (
                    <div key={item.id} style={{display:'flex',gap:10,background:'#f7f8fc',borderRadius:11,padding:11}}>
                      <div style={{width:46,height:46,borderRadius:8,overflow:'hidden',flexShrink:0,background:'#eef0f5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>
                        {item.image_url
                          ? <img src={item.image_url} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                          : EMOJI[item.category]}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:DARK,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.name}</div>
                        <div style={{fontSize:12,color:ORANGE,fontWeight:700,marginTop:2}}>{fmt(item.price)}</div>
                        <div style={{display:'flex',alignItems:'center',gap:7,marginTop:6}}>
                          <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                          <span style={{fontSize:13,fontWeight:700}}>{item.qty}</span>
                          <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
                          <button
                            onClick={() => setCart(c => c.filter(i => i.id !== item.id))}
                            style={{marginLeft:'auto',background:'none',border:'none',cursor:'pointer',fontSize:12,color:'#aab0bc',fontFamily:'inherit'}}
                          >Remove</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:16,paddingTop:16,borderTop:'1px solid #eef0f5'}}>
                  <span style={{fontWeight:800,fontSize:19,color:DARK}}>{fmt(cartTotal)}</span>
                  <button
                    className="primary-btn"
                    onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}
                  >
                    Checkout with Paystack →
                  </button>
                </div>
                <div style={{textAlign:'right',fontSize:11,color:'#8892a0',marginTop:8}}>🔒 Secured by Paystack</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── CHECKOUT MODAL ───────────────────────── */}
      {checkoutOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeCheckout()}>
          <div className="modal-box">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h2 style={{color:DARK,fontSize:18,fontWeight:800,margin:0}}>Complete Your Order</h2>
              <button onClick={closeCheckout} style={{background:'none',border:'none',cursor:'pointer',fontSize:24,color:'#8892a0',lineHeight:1}}>✕</button>
            </div>

            {/* Order summary */}
            <div style={{background:'#f7f8fc',borderRadius:11,padding:14,marginBottom:20}}>
              <div style={{fontSize:11,color:'#8892a0',fontWeight:700,letterSpacing:'0.5px',marginBottom:10}}>ORDER SUMMARY</div>
              {cart.map(i => (
                <div key={i.id} style={{display:'flex',justifyContent:'space-between',fontSize:13,color:DARK,marginBottom:5}}>
                  <span>{i.name} <span style={{color:'#8892a0'}}>×{i.qty}</span></span>
                  <span style={{fontWeight:600}}>{fmt(Number(i.price) * i.qty)}</span>
                </div>
              ))}
              <div style={{borderTop:'1px solid #e5e7ea',marginTop:10,paddingTop:10,display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:16,color:DARK}}>
                <span>Total</span>
                <span style={{color:ORANGE}}>{fmt(cartTotal)}</span>
              </div>
            </div>

            {checkoutReservation && (
              <div style={{background:'#fff8e6',border:'1px solid #ffd66b',borderRadius:11,padding:14,marginBottom:18}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:800,color:DARK}}>Items reserved</div>
                    <div style={{fontSize:12,color:'#8a5a00',marginTop:3}}>You have 10 minutes to complete payment.</div>
                  </div>
                  <div style={{fontSize:20,fontWeight:900,color:ORANGE,fontVariantNumeric:'tabular-nums'}}>
                    {fmtTime(timeLeft)}
                  </div>
                </div>
              </div>
            )}

            {/* Customer form */}
            <form onSubmit={handleCheckout}>
              {[
                ['Full Name',         'name',    'text', true],
                ['Email Address',     'email',   'email', true],
                ['Phone Number',      'phone',   'tel', true],
                ['Delivery Address',  'address', 'text', false],
              ].map(([label, field, type, required]) => (
                <div key={field} style={{marginBottom: 14}}>
                  <label style={{display:'block',fontSize:13,fontWeight:600,color:DARK,marginBottom:5}}>
                    {label} {required && <span style={{color:ORANGE}}>*</span>}
                  </label>
                  <input
                    className="form-input"
                    type={type}
                    value={form[field]}
                    onChange={e => setForm(f => ({...f, [field]: e.target.value}))}
                    required={required}
                    placeholder={`Enter your ${label.toLowerCase()}`}
                  />
                </div>
              ))}

              <button type="submit" className="primary-btn" disabled={paying} style={{width:'100%',justifyContent:'center',padding:'14px',fontSize:15,marginTop:6}}>
                {paying ? 'Redirecting to Paystack...' : `Pay ${fmt(cartTotal)} →`}
              </button>
              <div style={{textAlign:'center',fontSize:12,color:'#8892a0',marginTop:10}}>
                🔒 Your payment is secured by Paystack
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────── */}
      <div style={{background: DARK, padding: '48px 20px 40px', textAlign: 'center'}}>
        <div style={{display:'inline-block',background:'rgba(253,126,13,0.1)',borderRadius:20,padding:'6px 16px',marginBottom:16,border:'0.5px solid rgba(253,126,13,0.22)'}}>
          <span style={{color:ORANGE,fontSize:12,fontWeight:600}}>🚚 Free delivery on orders above ₦30,000</span>
        </div>
        <h1 style={{color:'white',fontSize:40,fontWeight:800,lineHeight:1.15,letterSpacing:'-0.5px',margin:'0 0 12px'}}>
          Shop <span style={{color:ORANGE}}>10/10</span> products<br/>you'll absolutely love
        </h1>
        <p style={{color:'rgba(255,255,255,0.5)',fontSize:15,maxWidth:440,margin:'0 auto 26px',lineHeight:1.65}}>
          Fashion, kitchenware & household essentials — curated for quality, priced for everyone.
        </p>
        <button
          className="primary-btn"
          onClick={() => document.getElementById('products')?.scrollIntoView({behavior:'smooth'})}
        >
          Shop Now →
        </button>
      </div>

      {/* ── TRUST STRIP ──────────────────────────── */}
      <div style={{background:'white',padding:'13px 20px',borderBottom:'1px solid #eef0f5'}}>
        <div style={{maxWidth:1100,margin:'0 auto',display:'flex',justifyContent:'center',gap:36,flexWrap:'wrap'}}>
          {[['🛡️','100% Authentic'],['🚚','Fast Delivery'],['⭐','4.8 Avg Rating'],['😊','500+ Customers']].map(([icon,label]) => (
            <div key={label} style={{display:'flex',alignItems:'center',gap:7}}>
              <span style={{fontSize:16}}>{icon}</span>
              <span style={{fontSize:12,fontWeight:500,color:DARK}}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── PRODUCTS ─────────────────────────────── */}
      <div id="products" style={{maxWidth:1100,margin:'0 auto',padding:'30px 20px 56px'}}>
        {/* Category filter */}
        <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap',alignItems:'center'}}>
          {CATS.map(c => (
            <button
              key={c.k}
              onClick={() => setCat(c.k)}
              className={`cat-pill ${cat === c.k ? 'active' : ''}`}
            >
              {c.l}
            </button>
          ))}
          {!loading && (
            <span style={{marginLeft:'auto',fontSize:13,color:'#8892a0'}}>
              {filtered.length} product{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Skeleton loader */}
        {loading && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(215px,1fr))',gap:16}}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{height:330}}/>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div style={{textAlign:'center',padding:'64px 0',color:'#8892a0'}}>
            <div style={{fontSize:52,marginBottom:14}}>🔍</div>
            <div style={{fontSize:18,fontWeight:700,color:DARK,marginBottom:6}}>No results for "{searchQ}"</div>
            <div style={{fontSize:14}}>Try a different keyword — our fuzzy search handles typos!</div>
          </div>
        )}

        {/* Product grid */}
        {!loading && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(215px,1fr))',gap:16}}>
            {filtered.map(p => {
              const isAdded = addedId === p.id
              const availableStock = p.stock - (p.reserved_stock || 0)

              const isOos = availableStock <= 0
              const isLow = availableStock > 0 && availableStock <= 5
              return (
                <div key={p.id} className="product-card">
                  {/* Image area */}
                  <div style={{position:'relative',overflow:'hidden',height:190,background:'#f0f2f6'}}>
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="product-img"
                        style={{width:'100%',height:'100%',objectFit:'cover'}}
                      />
                    ) : (
                      <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:70}}>
                        {EMOJI[p.category]}
                      </div>
                    )}

                    {/* Wishlist */}
                    <button className="wish-btn" onClick={() => toggleWish(p.id)} aria-label="Toggle wishlist">
                      {wishlist.has(p.id) ? '❤️' : '🤍'}
                    </button>

                    {p.old_price && <span className="sale-badge">SALE</span>}

                    {isOos && (
                      <div style={{position:'absolute',inset:0,background:'rgba(255,255,255,0.75)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <span style={{background:DARK,color:'white',padding:'6px 14px',borderRadius:8,fontSize:13,fontWeight:600}}>Out of Stock</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{padding:'13px 15px 15px'}}>
                    <div style={{fontSize:10,color:ORANGE,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:3}}>
                      {p.category === 'kitchen' ? 'Kitchenware' : p.category === 'fashion' ? 'Fashion' : 'Household'}
                    </div>
                    <div style={{fontWeight:600,fontSize:14,color:DARK,lineHeight:1.35,marginBottom:7}}>{p.name}</div>

                    {/* Rating */}
                    {p.rating > 0 && (
                      <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:7}}>
                        <span style={{color:'#fbbf24',fontSize:12}}>{'★'.repeat(Math.round(p.rating))}</span>
                        <span style={{fontSize:11,color:'#8892a0'}}>{p.rating} ({p.review_count})</span>
                      </div>
                    )}

                    {/* Low stock badge */}
                    {isLow && (
                      <div style={{display:'inline-block',background:'#fff3e6',border:'0.5px solid #ffd0a0',borderRadius:6,padding:'3px 9px',fontSize:11,color:'#c05000',fontWeight:600,marginBottom:9}}>
                        🔥 Only {availableStock} left!
                      </div>
                    )}

                    {/* Price */}
                    <div style={{display:'flex',alignItems:'baseline',gap:7,marginBottom:12}}>
                      <span style={{fontSize:17,fontWeight:800,color:DARK}}>{fmt(p.price)}</span>
                      {p.old_price && <span style={{fontSize:12,color:'#aab0bc',textDecoration:'line-through'}}>{fmt(p.old_price)}</span>}
                    </div>

                    {/* Add to cart */}
                    <button
                      className={`add-btn ${isAdded ? 'added' : ''} ${isOos ? 'oos' : ''}`}
                      onClick={() => addToCart(p)}
                      disabled={isOos}
                    >
                      {isAdded ? '✓ Added to Cart!' : isOos ? 'Out of Stock' : '🛒 Add to Cart'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── FOOTER ───────────────────────────────── */}
      <footer style={{background:DARK,textAlign:'center',padding:'32px 20px'}}>
        <div style={{fontWeight:800,color:'white',fontSize:20,marginBottom:7}}>
          tenova<span style={{color:ORANGE}}>10</span>
        </div>
        <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:8}}>
          Fashion · Kitchenware · Household · © {new Date().getFullYear()} tenova10
        </div>
        <div style={{fontSize:12,color:ORANGE,fontWeight:500}}>
          Crafted for 10/10 shopping experiences
        </div>
        <div style={{marginTop:16,display:'flex',justifyContent:'center',gap:20}}>
          <a href="/admin" style={{fontSize:12,color:'rgba(255,255,255,0.25)',textDecoration:'none'}}>Admin</a>
        </div>
      </footer>
    </>
  )
}
