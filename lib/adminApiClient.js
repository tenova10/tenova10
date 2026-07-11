import { supabase } from '@/lib/supabase'

export async function adminFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()

  const headers = {
    ...(options.headers || {}),
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }

  return fetch(url, { ...options, headers })
}