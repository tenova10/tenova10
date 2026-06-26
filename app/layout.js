import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
