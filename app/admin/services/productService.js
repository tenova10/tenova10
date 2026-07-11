import { adminFetch } from '@/lib/adminApiClient'

export async function fetchProducts() {
  const response = await adminFetch('/api/products')
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error)
  }

  return result
}

export async function createProduct(payload) {
  const response = await adminFetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error)
  }

  return result
}

export async function updateProduct(id, payload) {
  const response = await adminFetch('/api/products', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...payload }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error)
  }

  return result
}

export async function deleteProduct(id) {
  const response = await adminFetch('/api/products', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error)
  }

  return result
}

export async function toggleProduct(id, currentState) {
  const response = await adminFetch('/api/products', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, is_active: !currentState }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error)
  }

  return result
}