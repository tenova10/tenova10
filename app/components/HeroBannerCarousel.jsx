'use client'

import { useState, useEffect, useRef } from 'react'
import { ORANGE } from '@/lib/constants'

const ROTATE_MS = 5000

export default function HeroBannerCarousel() {
  const [banners, setBanners] = useState([])
  const [index, setIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/hero-banner')
        const data = await res.json()
        if (res.ok) setBanners(data || [])
      } catch (err) {
        console.error(err)
      }
      setLoaded(true)
    }
    load()
  }, [])

  useEffect(() => {
    if (banners.length < 2) return
    intervalRef.current = setInterval(() => {
      setIndex(i => (i + 1) % banners.length)
    }, ROTATE_MS)
    return () => clearInterval(intervalRef.current)
  }, [banners.length])

  if (!loaded) {
    return <div className="hero-section hero-default" />
  }

  if (banners.length === 0) {
    return (
      <div className="hero-section hero-default">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span>🚚 Free delivery on orders above ₦30,000</span>
          </div>
          <h1 className="hero-title">
            Shop <span style={{ color: ORANGE }}>10/10</span> products<br />you'll absolutely love
          </h1>
          <p className="hero-subtitle">
            Fashion, kitchenware & household essentials — curated for quality, priced for everyone.
          </p>
          <div className="hero-cta-row">
            <button
              className="primary-btn"
              onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Shop Now →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="hero-section hero-rotating">
      {banners.map((b, i) => (
        <div key={b.id} className={`hero-slide ${i === index ? 'hero-slide-active' : ''}`}>
          {b.image_url_desktop && (
            <div className="hero-bg hero-bg-desktop" style={{ backgroundImage: `url(${b.image_url_desktop})` }} />
          )}
          <div className="hero-bg hero-bg-mobile" style={{ backgroundImage: `url(${b.image_url_mobile || b.image_url_desktop})` }} />

          <div className="hero-content">
            {b.eyebrow_text && (
              <div className="hero-eyebrow"><span>{b.eyebrow_text}</span></div>
            )}
            <h1 className="hero-title">
              {b.headline}
              {b.accent_text && (<><br /><span style={{ color: ORANGE }}>{b.accent_text}</span></>)}
            </h1>
            {b.subtitle && <p className="hero-subtitle">{b.subtitle}</p>}
            <div className="hero-cta-row">
              {b.primary_cta_label && (
                <a href={b.primary_cta_link || '#products'} className="primary-btn" style={{ textDecoration: 'none' }}>
                  {b.primary_cta_label}
                </a>
              )}
              {b.secondary_cta_label && (
                <a href={b.secondary_cta_link || '#products'} className="hero-secondary-btn">
                  {b.secondary_cta_label}
                </a>
              )}
            </div>
          </div>
        </div>
      ))}

      {banners.length > 1 && (
        <div className="hero-dots">
          {banners.map((b, i) => (
            <button
              key={b.id}
              className={`hero-dot ${i === index ? 'hero-dot-active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}