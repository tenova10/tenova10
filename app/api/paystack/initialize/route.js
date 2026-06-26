import { NextResponse } from 'next/server'
import { createClient }  from '@supabase/supabase-js'

// Use service role key so we can write orders server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { name, email, phone, address, cart, total } = await request.json()

    // Validate required fields
    if (!name || !email || !phone || !cart?.length || !total) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate unique Paystack reference
    const reference = `T10-${Date.now()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`

    // Create the order record in Supabase (status: pending until payment confirmed)
    const { error: orderError } = await supabase.from('orders').insert({
      reference,
      customer_name:    name,
      customer_email:   email,
      customer_phone:   phone,
      customer_address: address || '',
      items:            cart,
      subtotal:         total,
      total:            total,
      status:           'pending',
    })

    if (orderError) {
      console.error('Order creation failed:', orderError)
      return NextResponse.json({ error: 'Could not create order' }, { status: 500 })
    }

    // Return the reference — frontend will use this with Paystack popup
    return NextResponse.json({ reference })

  } catch (err) {
    console.error('Initialize error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
