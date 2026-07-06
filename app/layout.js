import './globals.css'
import Script from 'next/script'
import { CartProvider } from './context/CartContext'
import Navbar from './components/Navbar'
import CartDrawer from './components/CartDrawer'
import CheckoutModal from './components/CheckoutModal'

export const metadata = {
  title: 'tenova10 — Shop 10/10 Products',
  description: 'Fashion, kitchenware & household essentials — curated for quality, priced for everyone.',
  keywords: ['fashion', 'kitchenware', 'household', 'Nigeria', 'online shopping'],
  openGraph: {
    title: 'tenova10',
    description: 'Shop 10/10 products you\'ll absolutely love.',
    type: 'website',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />
          <Navbar />
          {children}
          <CartDrawer />
          <CheckoutModal />
        </CartProvider>
      </body>
    </html>
  )
}