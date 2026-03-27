/**
 * GET /api/init
 * ─────────────
 * Returns ALL homepage data in one JSON response.
 * Used as a Vercel Cron target (every 4–5 minutes) to keep the
 * "homepage:init" Redis cache perpetually warm.
 *
 * Response is the full HomepageData object (stocks, commodityStrip,
 * tickerQuotes, marketRadar) plus `cached: true/false`.
 *
 * The route itself is idempotent — rapid successive calls are cheap because
 * getHomepageData() checks Redis first and returns instantly on a cache hit.
 */

import { NextResponse }        from 'next/server'
import { getHomepageData }     from '@/lib/api/homepage'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'


const EDGE_HEADERS = cacheHeaders(120)
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const limited = withRateLimit(req, 60)
  if (limited) return limited

  const t0   = Date.now()
  const data = await getHomepageData()
  const ms   = Date.now() - t0

  return NextResponse.json({
    ...data,
    fetchMs:  ms,
    // Flag so callers can tell if this was a Redis hit or a live Finnhub fetch
    fromCache: ms < 100,
  }, { headers: EDGE_HEADERS })
}
