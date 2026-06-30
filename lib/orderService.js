import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { validateCart } from '@/lib/cartService'

export async function findOrCreatePendingOrder({
  reference,
  name,
  email,
  phone,
  address,
  cart,
  total,
}) {
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString()

  const normalizedEmail = email.trim().toLowerCase()

  const { data: existing } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('customer_email', normalizedEmail)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .limit(1)
    .maybeSingle()

  if (existing) {
    // Update the existing order
    const { data: updated, error } = await supabaseAdmin
      .from('orders')
      .update({
        customer_name: name,
        customer_phone: phone,
        customer_address: address,
        items: cart,
        subtotal: total,
        total,
        expires_at: expiresAt,
        reservation_expires_at: null,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error


    return updated
  }

  // Create new pending order
  const { data: created, error } = await supabaseAdmin
    .from('orders')
    .insert({
      reference,
      customer_name: name,
      customer_email: normalizedEmail,
      customer_phone: phone,
      customer_address: address,
      items: cart,
      subtotal: total,
      total,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (error) throw error


  return created
}

export async function prepareCheckout({
  reference,
  name,
  email,
  phone,
  address,
  cart,
  total,
}) {
  if (!name?.trim() || !email?.trim() || !phone?.trim()) {
    throw new Error('Please fill in all required fields.')
  }

  const validation = await validateCart(cart, { strict: true })

  if (!validation.cart.length) {
    const error = new Error('Your cart is empty or no longer available.')
    error.cart = validation.cart
    error.messages = validation.messages
    throw error
  }

  if (!validation.valid) {
    const error = new Error(validation.messages[0] || 'Your cart changed. Please review it before paying.')
    error.cart = validation.cart
    error.messages = validation.messages
    throw error
  }

  if (Number(total) !== Number(validation.total)) {
    const error = new Error('Your cart total changed. Please review it before paying.')
    error.cart = validation.cart
    error.messages = ['Your cart total changed. Please review it before paying.']
    throw error
  }

  const order = await findOrCreatePendingOrder({
    reference,
    name: name.trim(),
    email,
    phone: phone.trim(),
    address: address?.trim() || '',
    cart: validation.cart,
    total: validation.total,
  })

  return {
    order,
    reference: order.reference,
    cart: validation.cart,
    total: validation.total,
  }
}
