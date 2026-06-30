import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdminRequest, unauthorizedResponse } from '@/lib/adminAuth'

const ORDER_STATUSES = new Set([
  'pending',
  'paid',
  'shipped',
  'delivered',
  'cancelled',
  'expired',
  'payment_review',
])

export async function GET(request) {
  try {
    if (!isAdminRequest(request)) return unauthorizedResponse()

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(data)

  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}

export async function PATCH(request) {
  try {
    if (!isAdminRequest(request)) return unauthorizedResponse()

    const { id, status } = await request.json()

    if (!id || !ORDER_STATUSES.has(status)) {
      return NextResponse.json(
        { error: 'Invalid order status update.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(data)

  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}
