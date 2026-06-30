import { NextResponse } from 'next/server'
import {
  cleanupExpiredPendingOrders,
  cleanupExpiredReservations,
} from '@/lib/reservationService'

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET

  if (!secret) return false

  const authHeader = request.headers.get('authorization') || ''
  return authHeader === `Bearer ${secret}`
}

export async function POST(request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized.' },
        { status: 401 }
      )
    }

    const releasedReservations = await cleanupExpiredReservations()
    const expiredOrders = await cleanupExpiredPendingOrders()

    return NextResponse.json({
      success: true,
      releasedReservations,
      expiredOrders,
    })

  } catch (err) {
    console.error(err)

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}
