// GET /api/market-pulse
// Derives the live pulse from the Market Brief's narrative + affectedAssets.
// This eliminates a separate Groq call — the Brief already generates exactly
// what the pulse needs (a one-liner + asset chips).
// Falls back to the top RSS headline if no Brief is cached yet.

import { NextResponse } from 'next/server'
import { getFinanceNews } from '@/lib/api/rss'
import { redis }          from '@/lib/cache/redis'
import { withRateLimit }  from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'
import type { MarketBriefPayload } from '@/app/api/market-brief/route'

const EDGE_HEADERS = cacheHeaders(120)

const BRIEF_CACHE_KEY = 'market-brief:daily'

export interface PulseAsset {
  symbol:    string
  type:      'stock' | 'crypto' | 'forex' | 'commodity' | 'etf'
  direction: 'up' | 'down' | 'volatile'
}

export interface MarketPulsePayload {
  pulse:          string
  affectedAssets: PulseAsset[]
  generatedAt:    number
}

export async function GET(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  // Try to derive pulse from the cached Market Brief
  try {
    const brief = await redis.get<MarketBriefPayload>(BRIEF_CACHE_KEY)
    if (brief) {
      const pulse = brief.narrative || brief.brief?.split('.')[0] || 'Markets active — monitoring key developments.'
      const assets: PulseAsset[] = (brief.affectedAssets ?? []).slice(0, 5).map((a) => ({
        symbol: a.symbol,
        type: a.type,
        direction: a.direction,
      }))

      const payload: MarketPulsePayload = {
        pulse,
        affectedAssets: assets,
        generatedAt: brief.generatedAt,
      }
      return NextResponse.json(payload, { headers: EDGE_HEADERS })
    }
  } catch { /* fall through */ }

  // Fallback: top RSS headline (no Groq call)
  let headline = 'Markets active — monitoring key developments.'
  try {
    const articles = await getFinanceNews()
    if (articles.length > 0) headline = articles[0].headline
  } catch { /* use default */ }

  const fallback: MarketPulsePayload = {
    pulse: headline,
    affectedAssets: [],
    generatedAt: Date.now(),
  }
  return NextResponse.json(fallback, { headers: EDGE_HEADERS })
}
