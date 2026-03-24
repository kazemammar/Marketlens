import { NextResponse } from 'next/server'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

/**
 * Token-bucket style in-memory rate limiter.
 * Returns true if the request is allowed, false if it should be rejected.
 */
export function rateLimit(
  key:      string,
  limit:    number = 60,
  windowMs: number = 60_000,
): boolean {
  const now   = Date.now()
  const entry = rateLimitMap.get(key)

  // Periodic GC — purge expired entries when the map grows large
  if (rateLimitMap.size > 1_000) {
    for (const [k, v] of rateLimitMap) {
      if (v.resetAt < now) rateLimitMap.delete(k)
    }
  }

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) return false

  entry.count++
  return true
}

/**
 * Convenience wrapper for Next.js route handlers.
 * Returns a 429 Response if the IP is over the limit, otherwise null.
 */
export function withRateLimit(req: Request, limit = 60) {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip        = forwarded?.split(',')[0]?.trim() ?? 'unknown'

  if (!rateLimit(ip, limit)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  return null
}
