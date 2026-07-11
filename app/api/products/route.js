import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requirePermission } from '@/lib/adminAuth'


function sanitizeProductPayload(payload) {
  return {
    name: payload.name?.trim(),
    description: payload.description?.trim() || '',
    price: Number(payload.price),
    old_price:
      payload.old_price === null || payload.old_price === ''
        ? null
        : Number(payload.old_price),
    category: payload.category,
    stock: Number.parseInt(payload.stock, 10),
    image_url: payload.image_url || '',
    featured: Boolean(payload.featured),
  }
}

async function validateProductPayload(payload) {
  if (!payload.name) return 'Product name is required.'

  const { data: category } = await supabaseAdmin
    .from('categories')
    .select('id')
    .eq('id', payload.category)
    .maybeSingle()
  if (!category) return 'Invalid category.'

  if (!Number.isFinite(payload.price) || payload.price < 0) return 'Invalid price.'
  if (payload.old_price !== null && (!Number.isFinite(payload.old_price) || payload.old_price < 0)) return 'Invalid old price.'
  if (!Number.isInteger(payload.stock) || payload.stock < 0) return 'Invalid stock quantity.'
  return null
}

export async function POST(request) {
  try {
    const permission = await requirePermission(request, 'can_manage_products')
    if (!permission.ok) return permission.response

    const payload = sanitizeProductPayload(await request.json())
    const validationError = await validateProductPayload(payload)

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert(payload)
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

export async function PUT(request) {
  try {
    const permission = await requirePermission(request, 'can_manage_products')
    if (!permission.ok) return permission.response

    const body = await request.json()

    const { id } = body
    const payload = sanitizeProductPayload(body)
    const validationError = await validateProductPayload(payload)

    if (!id) {
      return NextResponse.json({ error: 'Product id is required.' }, { status: 400 })
    }

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('products')
      .select('reserved_stock')
      .eq('id', id)
      .single()

    if (existingError) throw existingError

    if (payload.stock < Number(existing.reserved_stock || 0)) {
      return NextResponse.json(
        { error: `Stock cannot be lower than the ${existing.reserved_stock} currently reserved.` },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(payload)
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

export async function PATCH(request) {
  try {
    const permission = await requirePermission(request, 'can_manage_products')
    if (!permission.ok) return permission.response

    const { id, is_active } = await request.json()

    if (!id || typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid product status update.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ is_active })
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

export async function GET(request) {
  try {
    const permission = await requirePermission(request, 'can_manage_products')
    if (!permission.ok) return permission.response

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

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

export async function DELETE(request) {
  try {
    const permission = await requirePermission(request, 'can_manage_products')
    if (!permission.ok) return permission.response

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Product id is required.' }, { status: 400 })
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('reserved_stock')
      .eq('id', id)
      .single()

    if (productError) throw productError

    if (Number(product.reserved_stock || 0) > 0) {
      return NextResponse.json(
        { error: 'This product has active reservations and cannot be deleted yet.' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('products')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true
    })

  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}
