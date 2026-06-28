import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request) {
  try {
    const { cart } = await request.json()

    if (!Array.isArray(cart)) {
      return NextResponse.json(
        { error: 'Invalid cart.' },
        { status: 400 }
      )
    }

    if (cart.length === 0) {
      return NextResponse.json({
        cart: [],
        messages: [],
      })
    }

    const ids = cart.map(item => item.id)

    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .in('id', ids)

    if (error) {
      throw error
    }

    const dbProducts = new Map(products.map(p => [p.id, p]))

    const validatedCart = []
    const messages = []

    for (const item of cart) {
      const product = dbProducts.get(item.id)

      // Product deleted
      if (!product) {
        messages.push(
          `"${item.name}" was removed because it is no longer available.`
        )
        continue
      }

      // Product hidden
      if (!product.is_active) {
        messages.push(
          `"${product.name}" is no longer available and was removed from your cart.`
        )
        continue
      }

      // Out of stock
      if (product.stock <= 0) {
        messages.push(
          `"${product.name}" is out of stock and was removed from your cart.`
        )
        continue
      }

      let qty = item.qty

      // Quantity reduced
      if (qty > product.stock) {
        messages.push(
          `Quantity of "${product.name}" was reduced from ${qty} to ${product.stock} because only ${product.stock} remain in stock.`
        )
        qty = product.stock
      }

      // Price changed
      if (Number(item.price) !== Number(product.price)) {
        messages.push(
          `"${product.name}" has a new price. Your cart total has been updated.`
        )
      }

      validatedCart.push({
        ...product,
        qty,
      })
    }

    return NextResponse.json({
      cart: validatedCart,
      messages,
    })

  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}