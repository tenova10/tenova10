import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function finalizePaidOrder(reference) {
  const { data, error } = await supabaseAdmin.rpc(
    'finalize_paid_order',
    {
      p_reference: reference,
    }
  )

  if (error) {
    throw error
  }

  return data
}
