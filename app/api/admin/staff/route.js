import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { requireOwner } from '@/lib/adminAuth'

export async function GET(request) {
  const owner = await requireOwner(request)
  if (!owner.ok) return owner.response

  const { data, error } = await supabaseAdmin
    .from('admin_profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const owner = await requireOwner(request)
  if (!owner.ok) return owner.response

  try {
    const { email, password, display_name, can_manage_products, can_manage_orders, can_view_stats } = await request.json()

    if (!email?.trim() || !password || password.length < 6) {
      return NextResponse.json({ error: 'A valid email and a password of at least 6 characters are required.' }, { status: 400 })
    }
    if (!display_name?.trim()) {
      return NextResponse.json({ error: 'Display name is required.' }, { status: 400 })
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('admin_profiles')
      .insert({
        user_id: created.user.id,
        display_name: display_name.trim(),
        role: 'staff',
        can_manage_products: Boolean(can_manage_products),
        can_manage_orders: Boolean(can_manage_orders),
        can_view_stats: Boolean(can_view_stats),
      })
      .select()
      .single()

    if (profileError) {
      /* Roll back the auth user if the profile insert fails, so we don't leave an orphaned account */
      await supabaseAdmin.auth.admin.deleteUser(created.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json(profile)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  const owner = await requireOwner(request)
  if (!owner.ok) return owner.response

  try {
    const { user_id, new_password, ...profileUpdates } = await request.json()

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required.' }, { status: 400 })
    }

    if (new_password) {
      if (new_password.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters.' }, { status: 400 })
      }
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password: new_password })
      if (passwordError) return NextResponse.json({ error: passwordError.message }, { status: 400 })
    }

    const allowedFields = ['display_name', 'is_locked', 'can_manage_products', 'can_manage_orders', 'can_view_stats']
    const updates = {}
    for (const key of allowedFields) {
      if (profileUpdates[key] !== undefined) updates[key] = profileUpdates[key]
    }

    if (Object.keys(updates).length === 0 && !new_password) {
      return NextResponse.json({ error: 'No changes provided.' }, { status: 400 })
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('admin_profiles')
        .update(updates)
        .eq('user_id', user_id)
        .eq('role', 'staff') // safety: this endpoint can never modify the owner's own row

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  const owner = await requireOwner(request)
  if (!owner.ok) return owner.response

  try {
    const { user_id } = await request.json()
    if (!user_id) return NextResponse.json({ error: 'user_id is required.' }, { status: 400 })

    const { data: profile } = await supabaseAdmin
      .from('admin_profiles')
      .select('role')
      .eq('user_id', user_id)
      .maybeSingle()

    if (profile?.role === 'owner') {
      return NextResponse.json({ error: 'The owner account cannot be deleted.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    /* admin_profiles row is removed automatically via ON DELETE CASCADE */
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}