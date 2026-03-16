/**
 * GET /api/init
 * ─────────────
 * Pre-warms the Redis quote cache for every symbol the homepage needs.
 *
 * Intended uses:
 *  1. Vercel Cron (every 4 minutes) — keeps cache perpetually warm so the
 *     server-side page.tsx warmup always finds Redis hits, not Finnhub misses.
 *  2. Manual warmup after a deployment or Redis flush.
 *
 * The route itself has a 240-second Redis route cache so that rapid successive
 * calls (e.g., multiple cron firings) are no-ops after the first.
 */

import { NextResponse }           from 'next/server'
import { warmupHomepageQuotes }   from '@/lib/api/warmup'
import { redis }                  from '@/lib/cache/redis'

export const dynamic = 'force-dynamic'

const ROUTE_CACHE_KEY = 'init:v1'
const ROUTE_CACHE_TTL = 240  // 4 min — re-warms before 5-min quote TTL expires

export async function GET() {
  // ── Fast path: already warmed recently ──────────────────────────────────
  try {
    const cached = await redis.get<{ symbols: number; updatedAt: number }>(ROUTE_CACHE_KEY)
    if (cached) {
      return NextResponse.json({ ...cached, cached: true })
    }
  } catch { /* fall through */ }

  // ── Slow path: warm the cache ─────────────────────────────────────────
  const t0     = Date.now()
  const quotes = await warmupHomepageQuotes()
  const ms     = Date.now() - t0

  const payload = {
    symbols:   quotes.size,
    updatedAt: Date.now(),
    ms,
    cached:    false,
  }

  redis.set(ROUTE_CACHE_KEY, payload, { ex: ROUTE_CACHE_TTL }).catch(() => {})

  return NextResponse.json(payload)
}
