'use client'

import { useState, useEffect } from 'react'
import Navbar from './Navbar'
import CategorySubnav from './CategorySubnav'

export default function StickyHeader() {
  const [docked, setDocked] = useState(false)

  useEffect(() => {
    const onScroll = () => setDocked(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className={`site-sticky-header ${docked ? 'site-sticky-header-docked' : ''}`}>
      <Navbar docked={docked} />
      <CategorySubnav docked={docked} />
    </div>
  )
}