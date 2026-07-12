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
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, height: 60 }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0 }}>
          <img src="/white_logo.png" alt="tenova10" style={{ height: 36, width: 'auto' }} />
        </Link>

        {/* <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, background: ORANGE, transform: 'rotate(45deg)' }} />
          <span style={{ color: 'white', fontWeight: 800, fontSize: 19, letterSpacing: '-0.3px' }}>
            tenova<span style={{ color: ORANGE }}>10</span>
          </span>
        </Link> */}

        {/* Search */}
        <div style={{ flex: 1, position: 'relative', maxWidth: 500, margin: '0 auto' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'rgba(255,255,255,0.35)' }}>🔍</span>
          <input
            className="search-input"
            value={searchQ}
            onChange={e => handleSearchChange(e.target.value)}
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
          <span style={{ fontSize: 18 }}>🛍️</span>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          <span style={{ fontWeight: 700, fontSize: 13 }}>{fmt(cartTotal)}</span>
        </button>
      </div>
    </nav>
  )
}