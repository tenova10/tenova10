'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCart } from '../context/CartContext'
import { ORANGE, DARK, fmt } from '@/lib/constants'

export default function Navbar() {
  const { cartCount, cartTotal, cartOpen, setCartOpen, searchQ, setSearchQ } = useCart()
  const pathname = usePathname()
  const router = useRouter()

  const handleSearchChange = (value) => {
    setSearchQ(value)
    if (pathname !== '/') {
      router.push('/')
    }
  }

  return (
    <nav style={{ background: DARK, padding: '0 20px', position: 'sticky', top: 0, zIndex: 100 }}>
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0 }}>
          <img src="/white_logo.png" alt="tenova10" style={{ height: 32, width: 'auto' }} />
        </Link>

        <div className="navbar-search-wrap">
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'rgba(255,255,255,0.35)' }}>🔍</span>
          <input
            className="search-input"
            value={searchQ}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search — typos are totally OK!"
          />
        </div>

        <button
          onClick={() => setCartOpen(v => !v)}
          className="cart-btn navbar-cart"
          style={{
            background: cartOpen ? 'rgba(253,126,13,0.15)' : ORANGE,
            border: cartOpen ? `1.5px solid ${ORANGE}` : 'none',
          }}
        >
          <span style={{ fontSize: 18 }}>🛍️</span>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          <span style={{ fontWeight: 700, fontSize: 13 }}>{fmt(cartTotal)}</span>
        </button>
      </div>
    </nav>
  )
}