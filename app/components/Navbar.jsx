'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCart } from '../context/CartContext'
import { DARK, fmt } from '@/lib/constants'

export default function Navbar() {
  const { cartCount, cartTotal, cartOpen, setCartOpen, searchQ, setSearchQ } = useCart()
  const pathname = usePathname()
  const router = useRouter()
  const [docked, setDocked] = useState(false)

  useEffect(() => {
    const onScroll = () => setDocked(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleSearchChange = (value) => {
    setSearchQ(value)
    if (pathname !== '/') {
      router.push('/')
    }
  }

  return (
    <nav className={`site-navbar ${docked ? 'site-navbar-docked' : ''}`} style={{ background: DARK }}>
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0 }}>
          <img src="/logo.png" alt="tenova10" style={{ height: 32, width: 'auto' }} />
        </Link>

        <div className="navbar-search-wrap">
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'rgba(255,255,255,0.35)' }}>🔍</span>
          <input
            className="search-input"
            value={searchQ}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search — totally OK!"
          />
        </div>

        <button
          onClick={() => setCartOpen(v => !v)}
          className={`cart-btn-outline navbar-cart ${cartOpen ? 'cart-btn-active' : ''}`}
        >
          {/* <span className="cart-btn-icon">🛍️</span> */}

          <span className="cart-btn-icon" style={{ display: 'flex' }}>
            <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </span>

          
          {cartCount > 0 && <span className="cart-badge-circle">{cartCount}</span>}
          <span className="cart-btn-price">{fmt(cartTotal)}</span>
        </button>
      </div>
    </nav>
  )
}