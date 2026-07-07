'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import {
  initializeCheckout,
  createReservation,
  releaseReservation,
  openPaystackPopup,
} from '../services/checkoutService'

const CHECKOUT_RESERVATION_KEY = 'tenova10_checkout_reservation'

export const fmtTimeRemaining = (seconds) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

const CartContext = createContext(null)

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}

export function CartProvider({ children }) {
  /* ── Cart / wishlist state ── */
  const [cart, setCart]                 = useState([])
  const [wishlist, setWishlist]         = useState(new Set())
  const [addedId, setAddedId]           = useState(null)
  const [toast, setToast]               = useState(null)
  const [cartMessages, setCartMessages] = useState([])
  const [stockById, setStockById]       = useState({})
  const [categoriesById, setCategoriesById] = useState({})

  /* ── Search (shared so Navbar can host the input on every page) ── */
  const [searchQ, setSearchQ] = useState('')

  /* ── Checkout / cart-panel UI state (orchestration only — API calls live in checkoutService) ── */
  const [cartOpen, setCartOpen]                       = useState(false)
  const [checkoutOpen, setCheckoutOpen]                = useState(false)
  const [form, setForm]                                = useState({ name: '', email: '', phone: '', address: '' })
  const [paying, setPaying]                            = useState(false)
  const [checkoutReservation, setCheckoutReservation]  = useState(null)
  const [timeLeft, setTimeLeft]                        = useState(0)
  const paystackHandlerRef  = useRef(null)
  const paymentCompletedRef = useRef(false)

  const showToast = useCallback((msg, duration = 3500) => {
    setToast(msg)
    setTimeout(() => setToast(null), duration)
  }, [])

  /* ── Restore + validate cart on mount ── */
  useEffect(() => {
    const restoreCart = async () => {
      try {
        const saved = localStorage.getItem('tenova10_cart')
        if (!saved) return

        const storedCart = JSON.parse(saved)

        const response = await fetch('/api/cart/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cart: storedCart }),
        })

        const result = await response.json()

        if (!response.ok) {
          console.error(result.error)
          setCart(storedCart)
          return
        }

        setCart(result.cart)
        localStorage.setItem('tenova10_cart', JSON.stringify(result.cart))
        setCartMessages(result.messages)
      } catch (err) {
        console.error(err)
      }
    }
    restoreCart()
  }, [])

  /* ── Persist cart to localStorage ── */
  useEffect(() => {
    try { localStorage.setItem('tenova10_cart', JSON.stringify(cart)) } catch {}
  }, [cart])

  /* ── Restore an in-progress checkout reservation (survives navigation/refresh) ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHECKOUT_RESERVATION_KEY)
      if (!saved) return

      const reservation = JSON.parse(saved)

      if (!reservation?.expiresAt || new Date(reservation.expiresAt).getTime() <= Date.now()) {
        localStorage.removeItem(CHECKOUT_RESERVATION_KEY)
        return
      }

      if (reservation.form) setForm(reservation.form)

      setCheckoutReservation(reservation)
      setCheckoutOpen(true)
      showToast('You have an unfinished checkout. Complete payment before the timer expires.', 5000)
    } catch {
      localStorage.removeItem(CHECKOUT_RESERVATION_KEY)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Lightweight live stock map (id, stock, reserved_stock) ──
     Powers stock validation app-wide, independent of any page's own product fetch. */
  useEffect(() => {
    const loadStock = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, stock, reserved_stock')

      if (!error && data) {
        const map = {}
        data.forEach(p => { map[p.id] = { stock: p.stock, reserved_stock: p.reserved_stock } })
        setStockById(map)
      }
    }
    loadStock()

    const channel = supabase
      .channel('cart-stock-live')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'products',
      }, payload => {
        setStockById(prev => ({
          ...prev,
          [payload.new.id]: { stock: payload.new.stock, reserved_stock: payload.new.reserved_stock },
        }))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  /* ── Categories (for emoji/label lookups app-wide) ── */
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch('/api/categories')
        const data = await res.json()
        if (res.ok) {
          const map = {}
          data.forEach(c => { map[c.id] = c })
          setCategoriesById(map)
        }
      } catch (err) {
        console.error(err)
      }
    }
    loadCategories()
  }, [])

  const getAvailableStock = useCallback((product) => {
    const live = stockById[product.id]
    const stock    = live ? live.stock          : product.stock
    const reserved = live ? live.reserved_stock : (product.reserved_stock || 0)
    return Number(stock || 0) - Number(reserved || 0)
  }, [stockById])

  /* ── Cart actions ── */
  const addToCart = useCallback((product) => {
    const availableStock = getAvailableStock(product)
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
  }, [getAvailableStock, showToast])

  const updateQty = useCallback((id, delta) => {
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i
      const newQty = i.qty + delta
      if (newQty <= 0) return null

      const availableStock = getAvailableStock(i)
      if (newQty > availableStock) {
        showToast(`Only ${availableStock} available!`)
        return i
      }
      return { ...i, qty: newQty }
    }).filter(Boolean))
  }, [getAvailableStock, showToast])

  const removeFromCart = useCallback((id) => {
    setCart(prev => prev.filter(i => i.id !== id))
  }, [])

  const toggleWish = useCallback((id) => {
    setWishlist(w => {
      const n = new Set(w)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }, [])

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const cartTotal = cart.reduce((s, i) => s + Number(i.price) * i.qty, 0)

  /* ── Re-validate cart against live stock/prices (used after reservation expiry, etc.) ── */
  const validateCurrentCart = useCallback(async () => {
    try {
      const response = await fetch('/api/cart/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  /* ── Reservation countdown / auto-expiry ── */
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
      await releaseReservation({
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
  }, [checkoutReservation, validateCurrentCart, showToast])

  const closeCheckout = useCallback(async () => {
    if (checkoutReservation?.orderId) {
      await releaseReservation({
        orderId: checkoutReservation.orderId,
        reason: 'checkout_closed',
        cancelOrder: true,
      })
      localStorage.removeItem(CHECKOUT_RESERVATION_KEY)
      setCheckoutReservation(null)
      setPaying(false)
    }
    setCheckoutOpen(false)
  }, [checkoutReservation])

  /* ── Checkout orchestration ──────────────────────
     All Paystack/reservation/order API calls live in checkoutService.
     This function only coordinates UI state around those calls. */
  const handleCheckout = useCallback(async (e) => {
    e?.preventDefault?.()
    if (paying) return

    if (!form.name || !form.email || !form.phone) {
      showToast('Please fill in all required fields.')
      return
    }

    setPaying(true)
    paymentCompletedRef.current = false

    try {
      const checkout = await initializeCheckout({ form, cart, total: cartTotal })

      setCart(checkout.cart)
      localStorage.setItem('tenova10_cart', JSON.stringify(checkout.cart))

      const reservation = await createReservation(checkout.orderId)

      const activeReservation = {
        orderId: checkout.orderId,
        reference: checkout.reference,
        expiresAt: reservation.expiresAt,
        form,
      }

      setCheckoutReservation(activeReservation)
      localStorage.setItem(CHECKOUT_RESERVATION_KEY, JSON.stringify(activeReservation))

      const handler = openPaystackPopup({
        form,
        amountNaira: checkout.total,
        reference: checkout.reference,
        onSuccess: (response) => {
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

          releaseReservation({
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
    } catch (err) {
      if (err.cart) {
        setCart(err.cart)
        localStorage.setItem('tenova10_cart', JSON.stringify(err.cart))
      }
      if (err.messages?.length) setCartMessages(err.messages)
      showToast(err.message || 'Could not start payment. Please try again.', 5000)
      setPaying(false)
    }
  }, [paying, form, cart, cartTotal, showToast])

  const value = {
    // cart / wishlist
    cart, setCart,
    wishlist, toggleWish,
    addedId,
    toast, showToast,
    cartMessages, setCartMessages,
    addToCart, updateQty, removeFromCart,
    cartCount, cartTotal,
    getAvailableStock,
    validateCurrentCart,
    categoriesById,

    // search
    searchQ, setSearchQ,

    // cart panel
    cartOpen, setCartOpen,

    // checkout
    checkoutOpen, setCheckoutOpen, closeCheckout,
    form, setForm,
    paying,
    checkoutReservation, timeLeft,
    handleCheckout,
  }

  return (
    <CartContext.Provider value={value}>
      {children}
      {toast && <div className="toast">{toast}</div>}
    </CartContext.Provider>
  )
}