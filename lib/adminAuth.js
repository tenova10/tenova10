import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

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

function checkLegacyCookie(request) {
  const secret = getSecret()
  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!secret || !token) return false

  const expected = createAdminSessionToken()
  const tokenBuffer = Buffer.from(token)
  const expectedBuffer = Buffer.from(expected)

  return (
    tokenBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(tokenBuffer, expectedBuffer)
  )
}

/* Legacy cookie = full owner access, since only you know that secret */
const LEGACY_OWNER_PROFILE = {
  role: 'owner',
  can_manage_products: true,
  can_manage_orders: true,
  can_view_stats: true,
}

/* ── Core session resolver ──────────────────────────
   Tries a real Supabase session first, falls back to the
   legacy shared-password cookie. Returns enough info for
   both simple auth checks and fine-grained permission checks. */
export async function getAdminSession(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (token) {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (!userError && userData?.user) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('admin_profiles')
        .select('*')
        .eq('user_id', userData.user.id)
        .maybeSingle()

      if (!profileError && profile && !profile.is_locked) {
        return { authenticated: true, profile, legacy: false }
      }

      /* Valid Supabase login, but not a recognized/active admin */
      return { authenticated: false, profile: null, legacy: false }
    }
  }

  if (checkLegacyCookie(request)) {
    return { authenticated: true, profile: LEGACY_OWNER_PROFILE, legacy: true }
  }

  return { authenticated: false, profile: null, legacy: false }
}

/* Simple boolean check — "is this any valid admin at all" */
export async function isAdminRequest(request) {
  const session = await getAdminSession(request)
  return session.authenticated
}

export function unauthorizedResponse(message = 'Admin authentication required.') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbiddenResponse(message = 'You do not have permission to perform this action.') {
  return NextResponse.json({ error: message }, { status: 403 })
}

/* Fine-grained check — "is this admin allowed to do THIS specific thing".
   Owners (real or legacy) always pass. Staff must have the specific flag. */
export async function requirePermission(request, permission) {
  const session = await getAdminSession(request)

  if (!session.authenticated) {
    return { ok: false, response: unauthorizedResponse() }
  }

  if (session.profile.role === 'owner') {
    return { ok: true, profile: session.profile }
  }

  if (!session.profile[permission]) {
    return { ok: false, response: forbiddenResponse() }
  }

  return { ok: true, profile: session.profile }
}

/* Owner-only gate — no toggle involved, staff are blocked regardless of any permission flags */
export async function requireOwner(request) {
  const session = await getAdminSession(request)

  if (!session.authenticated) {
    return { ok: false, response: unauthorizedResponse() }
  }

  if (session.profile.role !== 'owner') {
    return { ok: false, response: forbiddenResponse('Only the main admin can manage categories.') }
  }

  return { ok: true, profile: session.profile }
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