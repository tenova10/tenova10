import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function createReservations(orderId) {
  const { data, error } = await supabaseAdmin.rpc(
    'reserve_order_inventory',
    {
      p_order_id: orderId,
      p_ttl_minutes: 10,
    }
  )

  if (error) {
    throw error
  }

  return data
}

export async function releaseReservations(orderId, {
  reason = 'released',
  cancelOrder = false,
} = {}) {
  const { data, error } = await supabaseAdmin.rpc(
    'release_order_reservations',
    {
      p_order_id: orderId,
      p_reason: reason,
      p_cancel_order: cancelOrder,
    }
  )

  if (error) {
    throw error
  }

  return data
}

export async function releaseReservationsByReference(reference, {
  reason = 'payment_failed',
  cancelOrder = true,
} = {}) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('reference', reference)
    .maybeSingle()

  if (orderError) {
    throw orderError
  }

  if (!order) {
    return {
      success: false,
      reason: 'order_not_found',
    }
  }

  return releaseReservations(order.id, {
    reason,
    cancelOrder,
  })
}

export async function cleanupExpiredReservations() {
  const { data, error } = await supabaseAdmin.rpc('cleanup_expired_reservations')

  if (error) {
    throw error
  }

  return data
}

export async function cleanupExpiredPendingOrders() {
  const { data, error } = await supabaseAdmin.rpc('cleanup_expired_pending_orders')

  if (error) {
    throw error
  }

  return data
}
