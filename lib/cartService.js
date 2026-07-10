import { supabaseAdmin } from '@/lib/supabaseAdmin'

function normalizeQuantity(item) {
  const qty = Number(item.qty ?? item.quantity)

  if (!Number.isInteger(qty) || qty <= 0) {
    return null
  }

  return qty
}

/* A cart line is uniquely identified by product + variant (if any) —
   two different variants of the same product are separate lines. */
function lineKey(item) {
  return item.variant_id ? `${item.id}::${item.variant_id}` : item.id
}

export async function validateCart(cart, { strict = false } = {}) {
  if (!Array.isArray(cart)) {
    throw new Error('Invalid cart.')
  }

  const normalizedInput = []
  const itemByKey = new Map()

  for (const item of cart) {
    const qty = normalizeQuantity(item)

    if (!item.id || !qty) {
      normalizedInput.push(item)
      continue
    }

    const key = lineKey(item)
    const existing = itemByKey.get(key)

    if (existing) {
      existing.qty += qty
    } else {
      const normalizedItem = {
        ...item,
        qty,
      }
      itemByKey.set(key, normalizedItem)
      normalizedInput.push(normalizedItem)
    }
  }

  if (normalizedInput.length === 0) {
    return {
      cart: [],
      messages: [],
      total: 0,
      valid: true,
    }
  }

  const ids = [...new Set(normalizedInput.map(item => item.id).filter(Boolean))]
  const variantIds = [...new Set(normalizedInput.map(item => item.variant_id).filter(Boolean))]

  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .in('id', ids)

  if (error) {
    throw error
  }

  let variantsById = new Map()
  if (variantIds.length > 0) {
    const { data: variants, error: variantError } = await supabaseAdmin
      .from('product_variants')
      .select('*')
      .in('id', variantIds)

    if (variantError) {
      throw variantError
    }

    variantsById = new Map((variants || []).map(v => [v.id, v]))
  }

  const dbProducts = new Map((products || []).map(product => [product.id, product]))
  const validatedCart = []
  const messages = []

  for (const item of normalizedInput) {
    const product = dbProducts.get(item.id)
    const requestedQty = normalizeQuantity(item)

    if (!requestedQty) {
      messages.push(`"${item.name || 'An item'}" was removed because the quantity was invalid.`)
      continue
    }

    if (!product || product.deleted_at) {
      messages.push(`"${item.name || 'An item'}" was removed because it is no longer available.`)
      continue
    }

    if (!product.is_active) {
      messages.push(`"${product.name}" is no longer available and was removed from your cart.`)
      continue
    }

    let variant = null
    let itemLabel = product.name

    if (product.has_variants) {
      variant = item.variant_id ? variantsById.get(item.variant_id) : null

      if (!variant || variant.product_id !== product.id) {
        messages.push(`"${product.name}" requires a variant selection and was removed from your cart. Please pick an option and add it again.`)
        continue
      }

      itemLabel = `${product.name} (${variant.label})`
    }

    const availableStock = variant
      ? Number(variant.stock || 0) - Number(variant.reserved_stock || 0)
      : Number(product.stock || 0) - Number(product.reserved_stock || 0)

    if (availableStock <= 0) {
      messages.push(`"${itemLabel}" is out of stock and was removed from your cart.`)
      continue
    }

    let qty = requestedQty

    if (qty > availableStock) {
      messages.push(
        `Quantity of "${itemLabel}" was reduced from ${qty} to ${availableStock} because only ${availableStock} remain available.`
      )
      qty = availableStock
    }

    if (Number(item.price) !== Number(product.price)) {
      messages.push(`"${product.name}" has a new price. Your cart total has been updated.`)
    }

    validatedCart.push({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: Number(product.price),
      image_url: product.image_url || '',
      category: product.category,
      qty,
      ...(variant ? { variant_id: variant.id, variant_label: variant.label } : {}),
    })
  }

  const total = validatedCart.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.qty),
    0
  )

  return {
    cart: validatedCart,
    messages,
    total,
    valid: !strict || messages.length === 0,
  }
}