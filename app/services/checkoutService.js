/* ── Checkout Service ─────────────────────────────
   Pure business logic: Paystack initialization, reservation
   API calls, and payment popup wiring. No React state here —
   callers (CartContext) pass in callbacks and own all UI state. */

async function readApiResponse(response, fallbackMessage) {
  const contentType = response.headers.get('content-type') || ''
  const bodyText = await response.text()

  if (contentType.includes('application/json')) {
    try {
      return bodyText ? JSON.parse(bodyText) : {}
    } catch {
      throw new Error(fallbackMessage)
    }
  }

  console.error('Expected JSON but received:', bodyText.slice(0, 500))
  throw new Error(fallbackMessage)
}

/* Initializes a Paystack transaction + validates cart server-side.
   Throws an Error; if the server also returned a corrected cart/messages
   (e.g. stock changed), they're attached to the error so the caller
   can still update the UI. */
export async function initializeCheckout({ form, cart, total }) {
  const res = await fetch('/api/paystack/initialize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...form,
      cart: cart.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        qty: i.qty,
        ...(i.variant_id ? { variant_id: i.variant_id, variant_label: i.variant_label } : {}),
      })),
      total,
    }),
  })

  const data = await readApiResponse(
    res,
    'Checkout service returned an invalid response. Please try again.'
  )

  if (!res.ok) {
    const error = new Error(data.error || 'Please review your cart before paying.')
    error.cart = data.cart
    error.messages = data.messages
    throw error
  }

  return data // { cart, orderId, reference, total }
}

export async function createReservation(orderId) {
  const res = await fetch('/api/reservations/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  })

  const data = await readApiResponse(
    res,
    'Reservation service returned an invalid response. Please try again.'
  )

  if (!res.ok) {
    throw new Error(data.error || 'Unable to reserve inventory.')
  }

  return data // { expiresAt }
}

export async function releaseReservation({ orderId, reason = 'customer_released', cancelOrder = true }) {
  if (!orderId) return
  try {
    await fetch('/api/reservations/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, reason, cancelOrder }),
    })
  } catch (err) {
    console.error(err)
  }
}

/* Wires up the Paystack inline popup. Assumes window.PaystackPop
   already exists (loaded via <Script> in layout). Returns the handler
   so the caller can close it programmatically (e.g. on reservation timeout). */
export function openPaystackPopup({ form, amountNaira, reference, onSuccess, onClose }) {
  const handler = window.PaystackPop.setup({
    key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    email: form.email,
    amount: Math.round(Number(amountNaira) * 100), // kobo
    currency: 'NGN',
    ref: reference,
    metadata: {
      custom_fields: [
        { display_name: 'Customer Name',  variable_name: 'customer_name',  value: form.name },
        { display_name: 'Customer Phone', variable_name: 'customer_phone', value: form.phone },
      ],
    },
    callback: (response) => onSuccess(response),
    onClose: () => onClose(),
  })

  handler.openIframe()
  return handler
}