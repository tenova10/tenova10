import crypto from 'crypto'
import { NextResponse } from 'next/server'

const COOKIE_NAME = 'admin-session'

function getSecret() {
  return process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ''
}

export function createAdminSessionToken() {
  const secret = getSecret()
  const signature = crypto
    .createHmac('sha256', secret)
    .update('tenova10-admin-session')
    .digest('hex')

  return `v1.${signature}`
}

export function isAdminRequest(request) {
  const secret = getSecret()
  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!secret || !token) {
    return false
  }

  const expected = createAdminSessionToken()
  const tokenBuffer = Buffer.from(token)
  const expectedBuffer = Buffer.from(expected)

  return (
    tokenBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(tokenBuffer, expectedBuffer)
  )
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: 'Admin authentication required.' },
    { status: 401 }
  )
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 8,
    path: '/',
  }
}
