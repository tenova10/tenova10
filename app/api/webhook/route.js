import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { finalizePaidOrder } from '@/lib/paymentService'
import { releaseReservationsByReference } from '@/lib/reservationService'

export async function POST(request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    const expectedHash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(body)
      .digest('hex')

    const signatureBuffer = Buffer.from(signature || '')
    const expectedBuffer = Buffer.from(expectedHash)

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      console.warn('Paystack webhook: invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    console.log('Paystack event received:', event.event)

    if (event.event === 'charge.success') {
      const result = await finalizePaidOrder(event.data.reference)

console.log(
  "FINALIZE RPC RESULT:",
  JSON.stringify(result, null, 2)
)

if (result?.manualReview) {
  console.warn(
    `Payment ${event.data.reference} requires manual review: ${result.reason}`
  )
}
    }

    if (event.event === 'charge.failed') {
      await releaseReservationsByReference(event.data.reference, {
        reason: 'payment_failed',
        cancelOrder: true,
      })
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ received: true })
  }
}
