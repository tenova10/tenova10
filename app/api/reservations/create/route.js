import { NextResponse } from 'next/server'

import { createReservations } from '@/lib/reservationService'

export async function POST(request) {
  try {
    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing reservation data.' },
        { status: 400 }
      )
    }

    const reservation = await createReservations(orderId)

    return NextResponse.json({
      success: true,
      expiresAt: reservation?.expiresAt,
    })

  } catch (err) {
    console.error(err)

    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 400,
      }
    )
  }
}
