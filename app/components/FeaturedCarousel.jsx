'use client'

import { useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { fmt } from '@/lib/constants'

const COPIES = 6 // more duplicate copies = more buffer on both sides before a wrap is needed

export default function FeaturedCarousel({ products }) {
  const scrollerRef = useRef(null)
  const firstItemRef = useRef(null)
  const secondSetItemRef = useRef(null)
  const rafRef = useRef(null)
  const hoveredRef = useRef(false)
  const draggingRef = useRef(false)
  const interactingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartScrollRef = useRef(0)

  const originalCount = products.length
  const items = Array.from({ length: COPIES }, () => products).flat()

  const getSetWidth = useCallback(() => {
    if (!firstItemRef.current || !secondSetItemRef.current) return 0
    return secondSetItemRef.current.offsetLeft - firstItemRef.current.offsetLeft
  }, [])

  /* Symmetric wraparound: stay within the "safe zone" of copies [1 .. COPIES-2],
     which guarantees exactly one full setWidth of buffer on BOTH sides —
     not just one direction — before a silent jump is needed. */
  const normalizeScroll = useCallback(() => {
    const el = scrollerRef.current
    const setWidth = getSetWidth()
    if (!el || !setWidth) return

    const maxScroll = el.scrollWidth - el.clientWidth

    if (el.scrollLeft < setWidth) {
      el.scrollLeft += setWidth
    } else if (el.scrollLeft >= maxScroll - setWidth) {
      el.scrollLeft -= setWidth
    }
  }, [getSetWidth])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el || originalCount === 0) return

    let initFrame
    const speed = 40
    let last = performance.now()

    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now

      if (!hoveredRef.current && !draggingRef.current && !interactingRef.current) {
        el.scrollLeft += speed * dt
        normalizeScroll()
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    const tryInit = () => {
      const setWidth = getSetWidth()
      if (setWidth > 0) {
        // Start dead-center among the copies, so there's maximum equal buffer
        // in both directions from the very first frame.
        el.scrollLeft = setWidth * Math.floor(COPIES / 2)
        last = performance.now()
        rafRef.current = requestAnimationFrame(tick)
      } else {
        initFrame = requestAnimationFrame(tryInit)
      }
    }

    initFrame = requestAnimationFrame(tryInit)

    return () => {
      cancelAnimationFrame(initFrame)
      cancelAnimationFrame(rafRef.current)
    }
  }, [originalCount, getSetWidth, normalizeScroll])

  const onMouseDown = (e) => {
    draggingRef.current = true
    dragStartXRef.current = e.clientX
    dragStartScrollRef.current = scrollerRef.current.scrollLeft
  }
  const onMouseMove = (e) => {
    if (!draggingRef.current) return
    const dx = e.clientX - dragStartXRef.current
    scrollerRef.current.scrollLeft = dragStartScrollRef.current - dx
  }
  const endDrag = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    normalizeScroll()
  }

  const scrollByCards = (direction) => {
    const el = scrollerRef.current
    if (!el) return
    const card = el.querySelector('.featured-card')
    const cardWidth = card ? card.getBoundingClientRect().width + 20 : 260

    interactingRef.current = true
    el.scrollBy({ left: direction * cardWidth * 2, behavior: 'smooth' })

    setTimeout(() => {
      interactingRef.current = false
      normalizeScroll()
    }, 500)
  }

  if (originalCount === 0) return null

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => scrollByCards(-1)} aria-label="Scroll left" className="featured-arrow featured-arrow-left">‹</button>
      <button onClick={() => scrollByCards(1)} aria-label="Scroll right" className="featured-arrow featured-arrow-right">›</button>

      <div
        ref={scrollerRef}
        className="featured-slider"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={() => { endDrag(); hoveredRef.current = false }}
        onMouseEnter={() => { hoveredRef.current = true }}
        onScroll={normalizeScroll}
      >
        <div className="featured-track">
          {items.map((p, i) => (
            <div
              key={`${p.id}-${i}`}
              ref={i === 0 ? firstItemRef : i === originalCount ? secondSetItemRef : null}
              className="featured-card"
            >
              <Link
                href={`/product/${p.id}`}
                style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
                draggable={false}
              >
                <div className="featured-image">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} draggable={false} />
                  ) : (
                    <div style={{ fontSize: 60 }}>📦</div>
                  )}
                </div>
                <div className="featured-body">
                  <div className="featured-name">{p.name}</div>
                  <div className="featured-price">{fmt(p.price)}</div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}