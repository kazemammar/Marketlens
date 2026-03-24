import { NextResponse } from 'next/server'
import { redis } from '@/lib/cache/redis'

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
  const body = await request.json().catch(() => null)
  const code = body?.code

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }

  const key = `auth:otp:${code}`
  const tokens = await redis.get<StoredTokens>(key)

  if (!tokens) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
  }

  // One-time use — delete immediately
  await redis.del(key)

  return NextResponse.json({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  })
}
