import { NextResponse } from 'next/server'
import { validateCart } from '@/lib/cartService'

export async function POST(request) {
  try {
    const { cart } = await request.json()

    const validation = await validateCart(cart)

    return NextResponse.json({
      cart: validation.cart,
      messages: validation.messages,
    })

  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}
