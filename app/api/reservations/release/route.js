import { NextResponse } from 'next/server'
import { releaseReservations } from '@/lib/reservationService'

export async function POST(request) {
  try {
    const { orderId, reason = 'customer_released', cancelOrder = true } = await request.json()

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing reservation data.' },
        { status: 400 }
      )
    }

    const result = await releaseReservations(orderId, {
      reason,
      cancelOrder,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })

  } catch (err) {
    console.error(err)

    return NextResponse.json(
      { error: err.message },
      { status: 400 }
    )
  }
}
