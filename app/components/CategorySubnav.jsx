'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useCart } from '../context/CartContext'

const MAX_VISIBLE = 6

export default function CategorySubnav({ docked }) {
  const { categoriesById } = useCart()
  const [panelOpen, setPanelOpen] = useState(false)
  const panelRef = useRef(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const onDocumentClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setPanelOpen(false)
      }
    }
    document.addEventListener('click', onDocumentClick)
    return () => document.removeEventListener('click', onDocumentClick)
  }, [])

  const togglePanel = (e) => {
    e.stopPropagation()
    setPanelOpen(v => !v)
  }

  const goToCategory = (catId) => {
    setPanelOpen(false)
    router.push(catId === 'all' ? '/' : `/?cat=${catId}`)
    if (pathname === '/') {
      setTimeout(() => {
        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    }
  }

  const categories = Object.values(categoriesById)
  const visibleCategories = categories.slice(0, MAX_VISIBLE)

  return (
    <div className={`category-subnav ${docked ? 'category-subnav-docked' : ''}`}>
      <div className="category-panel-wrap" ref={panelRef}>
        <button type="button" className="category-panel-trigger" onClick={togglePanel}>
          <span>☰</span>
          <span className="category-panel-label">Categories</span>
        </button>
        {panelOpen && (
          <div className="category-panel-dropdown">
            <button type="button" className="category-panel-item" onClick={() => goToCategory('all')}>
              ⊞ All Products
            </button>
            {categories.map(c => (
              <button key={c.id} type="button" className="category-panel-item" onClick={() => goToCategory(c.id)}>
                <span>{c.emoji}</span> {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="category-subnav-scroll">
        <button type="button" className="category-subnav-link" onClick={() => goToCategory('all')}>
          <span className="category-subnav-icon">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <rect x="0" y="0" width="6" height="6" rx="1.5" />
              <rect x="10" y="0" width="6" height="6" rx="1.5" />
              <rect x="0" y="10" width="6" height="6" rx="1.5" />
              <rect x="10" y="10" width="6" height="6" rx="1.5" />
            </svg>
          </span>
          All
        </button>

        {visibleCategories.map(c => (
          <button key={c.id} type="button" className="category-subnav-link" onClick={() => goToCategory(c.id)}>
            <span>{c.emoji}</span> {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}