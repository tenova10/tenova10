import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdminRequest, unauthorizedResponse } from '@/lib/adminAuth'

function slugify(label) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

export async function GET(request) {
  if (!isAdminRequest(request)) return unauthorizedResponse()

  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request) {
  if (!isAdminRequest(request)) return unauthorizedResponse()

  try {
    const { label, emoji } = await request.json()

    if (!label?.trim()) {
      return NextResponse.json({ error: 'Category name is required.' }, { status: 400 })
    }

    const id = slugify(label)
    if (!id) {
      return NextResponse.json({ error: 'Category name must contain letters or numbers.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({ id, label: label.trim(), emoji: emoji || '📦', show_on_storefront: true })
      .select()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A category with a similar name already exists.' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  if (!isAdminRequest(request)) return unauthorizedResponse()

  try {
    const body = await request.json()

    /* Bulk "Show All" action */
    if (body.showAll) {
      const { data, error } = await supabaseAdmin
        .from('categories')
        .update({ show_on_storefront: true })
        .neq('id', '') // matches all rows
        .select()

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json(data)
    }

    /* Single category update */
    const { id, label, emoji, show_on_storefront } = body
    if (!id) return NextResponse.json({ error: 'Category id is required.' }, { status: 400 })

    const updates = {}
    if (label !== undefined) updates.label = label.trim()
    if (emoji !== undefined) updates.emoji = emoji
    if (show_on_storefront !== undefined) updates.show_on_storefront = show_on_storefront

    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}