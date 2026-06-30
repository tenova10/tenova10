import { NextResponse } from 'next/server'
import { prepareCheckout } from '@/lib/orderService'

export async function POST(request) {
  try {
    const { name, email, phone, address, cart, total } = await request.json()

    if (!name || !email || !phone || !cart?.length || !total) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const reference =
  `T10-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 8)
    .toUpperCase()}`

const checkout = await prepareCheckout({
  reference,
  name,
  email,
  phone,
  address,
  cart,
  total,
})

    return NextResponse.json({
  reference: checkout.reference,
  orderId: checkout.order.id,
  cart: checkout.cart,
  total: checkout.total,
})

  } catch (err) {
    console.error(err)

    return NextResponse.json(
      {
        error: err.message || 'Unable to start checkout.',
        messages: err.messages || [],
        cart: err.cart || null,
      },
      {
        status: 400
      }
    )
  }
}
