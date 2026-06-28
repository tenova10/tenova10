export async function fetchOrders() {
  const response = await fetch('/api/orders')

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error)
  }

  return result
}

export async function updateOrderStatus(id, status) {
  const response = await fetch('/api/orders', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id,
      status,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error)
  }

  return result
}