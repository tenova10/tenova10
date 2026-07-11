import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requirePermission } from '@/lib/adminAuth'

export async function GET(request) {
  const permission = await requirePermission(request, 'can_manage_products')
  if (!permission.ok) return permission.response

  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('product_id')
  if (!productId) return NextResponse.json({ error: 'product_id is required.' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('product_images')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const permission = await requirePermission(request, 'can_manage_products')
  if (!permission.ok) return permission.response

  try {
    const { product_id, image_url } = await request.json()
    if (!product_id || !image_url) {
      return NextResponse.json({ error: 'product_id and image_url are required.' }, { status: 400 })
    }

    const { count } = await supabaseAdmin
      .from('product_images')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', product_id)

    const { data, error } = await supabaseAdmin
      .from('product_images')
      .insert({ product_id, image_url, sort_order: count || 0 })
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  const permission = await requirePermission(request, 'can_manage_products')
  if (!permission.ok) return permission.response

  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Image id is required.' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('product_images')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}