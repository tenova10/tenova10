import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request) {
  try {
    const { email, reference } = await request.json()

    if (!email?.trim() || !reference?.trim()) {
      return NextResponse.json({ error: 'Please enter both your email and order reference.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('reference, status, items, total, customer_name, created_at, paid_at')
      .eq('reference', reference.trim())
      .eq('customer_email', email.trim().toLowerCase())
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json({ error: 'No order found matching that email and reference.' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}