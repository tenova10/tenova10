import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request) {
  try {
    const payload = await request.json()

    // Remove id if it exists so PostgreSQL generates it
    delete payload.id

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
    const body = await request.json()

    const { id, ...payload } = body

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
    const { id, is_active } = await request.json()

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

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
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
    const { id } = await request.json()

    const { error } = await supabaseAdmin
      .from('products')
      .delete()
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