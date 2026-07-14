'use client'

import { usePathname } from 'next/navigation'
import StickyHeader from './StickyHeader'
import CartDrawer from './CartDrawer'
import CheckoutModal from './CheckoutModal'
import ReservationTimer from './ReservationTimer'

export default function AppShell({ children }) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/admin')

  if (isAdmin) {
    return <>{children}</>
  }

  return (
    <>
      <div className="site-frame">
        <StickyHeader />
        <div className="site-content-pad">
          {children}
        </div>
      </div>
      <CartDrawer />
      <CheckoutModal />
      <ReservationTimer />
    </>
  )
}