import { NextResponse } from 'next/server'
import { createClient }  from '@supabase/supabase-js'
import crypto            from 'crypto'

// Service role so we can update orders + stock server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const body      = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    // ── Verify webhook signature ───────────────
    const expectedHash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(body)
      .digest('hex')

    if (expectedHash !== signature) {
      console.warn('Paystack webhook: invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    console.log('Paystack event received:', event.event)

    // ── Handle successful charge ───────────────
    if (event.event === 'charge.success') {
      const { reference } = event.data

      // Fetch the pending order
      const { data: order, error: fetchErr } = await supabase
        .from('orders')
        .select('*')
        .eq('reference', reference)
        .single()

      if (fetchErr || !order) {
        console.error('Order not found for reference:', reference)
        return NextResponse.json({ received: true }) // Still 200 so Paystack doesn't retry forever
      }

      // Already processed (idempotency guard)
      if (order.status !== 'pending') {
        return NextResponse.json({ received: true })
      }

      // Mark order as paid
      await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('reference', reference)

      // Decrement stock for each ordered item
      for (const item of order.items) {
        const { data: product } = await supabase
          .from('products')
          .select('stock')
          .eq('id', item.id)
          .single()

        if (product) {
          const newStock = Math.max(0, product.stock - item.qty)
          await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', item.id)
        }
      }

      console.log(`✅ Order ${reference} marked paid. Stock updated.`)
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('Webhook error:', err)
    // Return 200 anyway — Paystack retries on non-200
    return NextResponse.json({ received: true })
  }
}
