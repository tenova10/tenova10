import './globals.css'
import Script from 'next/script'
import { CartProvider } from './context/CartContext'
import AppShell from './components/AppShell'
import CartDrawer from './components/CartDrawer'
import CheckoutModal from './components/CheckoutModal'
import ReservationTimer from './components/ReservationTimer'


export const metadata = {
  title: 'tenova10 — Shop 10/10 Products',
  description: 'Fashion, kitchenware & household essentials — curated for quality, priced for everyone.',
  keywords: ['fashion', 'kitchenware', 'household', 'Nigeria', 'online shopping'],
  openGraph: {
    title: 'tenova10',
    description: 'Shop 10/10 products you\'ll absolutely love.',
    type: 'website',
  },
  icons: {
    icon: '/favicon.webp',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />
          <AppShell>{children}</AppShell>
          <CartDrawer />
          <CheckoutModal />
          <ReservationTimer />
        </CartProvider>
      </body>
    </html>
  )
}