import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdminRequest, unauthorizedResponse } from '@/lib/adminAuth'

export async function GET(request) {
  if (!isAdminRequest(request)) return unauthorizedResponse()

  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('product_id')
  if (!productId) return NextResponse.json({ error: 'product_id is required.' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request) {
  if (!isAdminRequest(request)) return unauthorizedResponse()

  try {
    const { product_id, label, stock } = await request.json()

    if (!product_id || !label?.trim()) {
      return NextResponse.json({ error: 'product_id and label are required.' }, { status: 400 })
    }

    const qty = Number.parseInt(stock, 10)
    if (!Number.isInteger(qty) || qty < 0) {
      return NextResponse.json({ error: 'Invalid quantity.' }, { status: 400 })
    }

    const { count } = await supabaseAdmin
      .from('product_variants')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', product_id)

    const { data, error } = await supabaseAdmin
      .from('product_variants')
      .insert({ product_id, label: label.trim(), stock: qty, sort_order: count || 0 })
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await supabaseAdmin
      .from('products')
      .update({ has_variants: true })
      .eq('id', product_id)

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  if (!isAdminRequest(request)) return unauthorizedResponse()

  try {
    const { id, label, stock } = await request.json()
    if (!id) return NextResponse.json({ error: 'Variant id is required.' }, { status: 400 })

    const updates = {}
    if (label !== undefined) updates.label = label.trim()
    if (stock !== undefined) {
      const qty = Number.parseInt(stock, 10)
      if (!Number.isInteger(qty) || qty < 0) {
        return NextResponse.json({ error: 'Invalid quantity.' }, { status: 400 })
      }

      const { data: existing } = await supabaseAdmin
        .from('product_variants')
        .select('reserved_stock')
        .eq('id', id)
        .single()

      if (existing && qty < Number(existing.reserved_stock || 0)) {
        return NextResponse.json(
          { error: `Stock cannot be lower than the ${existing.reserved_stock} currently reserved.` },
          { status: 400 }
        )
      }

      updates.stock = qty
    }

    const { data, error } = await supabaseAdmin
      .from('product_variants')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  if (!isAdminRequest(request)) return unauthorizedResponse()

  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Variant id is required.' }, { status: 400 })

    const { data: variant, error: fetchError } = await supabaseAdmin
      .from('product_variants')
      .select('product_id, reserved_stock')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    if (Number(variant.reserved_stock || 0) > 0) {
      return NextResponse.json(
        { error: 'This variant has active reservations and cannot be deleted yet.' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('product_variants')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const { count } = await supabaseAdmin
      .from('product_variants')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', variant.product_id)

    if (!count) {
      await supabaseAdmin
        .from('products')
        .update({ has_variants: false })
        .eq('id', variant.product_id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}