import { NextResponse } from 'next/server'
import { redis } from '@/lib/cache/redis'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { noCacheHeaders } from '@/lib/utils/cache-headers'


const NO_CACHE = noCacheHeaders()
interface StoredTokens {
  access_token: string
  refresh_token: string
}

/**
 * POST /api/auth/exchange-code
 * Exchanges a short-lived one-time code for Supabase session tokens.
 * Used by the iOS app after the OAuth callback redirect.
 */
export async function POST(request: Request) {
  const limited = withRateLimit(request, 10)
  if (limited) return limited

  const body = await request.json().catch(() => null)
  const code = body?.code

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing code' }, { status: 400, headers: NO_CACHE })
  }

  const key = `auth:otp:${code}`
  const tokens = await redis.get<StoredTokens>(key)

  if (!tokens) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401, headers: NO_CACHE })
  }

  // One-time use — delete immediately
  await redis.del(key)

  return NextResponse.json({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  }, { headers: NO_CACHE })
}
