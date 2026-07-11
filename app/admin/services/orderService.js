import { adminFetch } from '@/lib/adminApiClient'

export async function fetchOrders() {
  const response = await adminFetch('/api/orders')
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error)
  }

  return result
}

export async function updateOrderStatus(id, status) {
  const response = await adminFetch('/api/orders', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error)
  }

  return result
}