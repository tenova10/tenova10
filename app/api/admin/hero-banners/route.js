import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireOwner } from '@/lib/adminAuth'

export async function GET(request) {
  const owner = await requireOwner(request)
  if (!owner.ok) return owner.response

  const { data, error } = await supabaseAdmin
    .from('hero_banners')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const owner = await requireOwner(request)
  if (!owner.ok) return owner.response

  try {
    const body = await request.json()

    if (!body.headline?.trim()) {
      return NextResponse.json({ error: 'Headline is required.' }, { status: 400 })
    }

    const { count } = await supabaseAdmin
      .from('hero_banners')
      .select('id', { count: 'exact', head: true })

    const { data, error } = await supabaseAdmin
      .from('hero_banners')
      .insert({
        eyebrow_text: body.eyebrow_text || '',
        headline: body.headline.trim(),
        accent_text: body.accent_text || '',
        subtitle: body.subtitle || '',
        image_url_desktop: body.image_url_desktop || '',
        image_url_mobile: body.image_url_mobile || '',
        primary_cta_label: body.primary_cta_label || '',
        primary_cta_link: body.primary_cta_link || '',
        secondary_cta_label: body.secondary_cta_label || '',
        secondary_cta_link: body.secondary_cta_link || '',
        is_active: Boolean(body.is_active),
        sort_order: count || 0,
      })
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  const owner = await requireOwner(request)
  if (!owner.ok) return owner.response

  try {
    const body = await request.json()
    const { id } = body
    if (!id) return NextResponse.json({ error: 'Banner id is required.' }, { status: 400 })

    const allowedFields = [
      'eyebrow_text', 'headline', 'accent_text', 'subtitle',
      'image_url_desktop', 'image_url_mobile',
      'primary_cta_label', 'primary_cta_link', 'secondary_cta_label', 'secondary_cta_link',
      'is_active', 'sort_order',
    ]
    const updates = {}
    for (const key of allowedFields) {
      if (body[key] !== undefined) updates[key] = body[key]
    }

    const { data, error } = await supabaseAdmin
      .from('hero_banners')
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
  const owner = await requireOwner(request)
  if (!owner.ok) return owner.response

  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'Banner id is required.' }, { status: 400 })

    const { data: banner } = await supabaseAdmin
      .from('hero_banners')
      .select('is_active')
      .eq('id', id)
      .maybeSingle()

    if (banner?.is_active) {
      return NextResponse.json({ error: 'Deactivate this banner before deleting it.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('hero_banners')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}