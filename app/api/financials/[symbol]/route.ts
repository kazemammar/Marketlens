import { NextResponse } from 'next/server'
import { getFinancials } from '@/lib/api/fmp'
import { getFinancialMetrics, getEarnings } from '@/lib/api/finnhub'
import { redis } from '@/lib/cache/redis'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'


const EDGE_HEADERS = cacheHeaders(300)
const CACHE_TTL = 86_400  // 24 hours — financials are quarterly, FMP has 250 calls/day free tier

const SYMBOL_RE = /^[A-Z0-9.=\-\/!]{1,20}$/i

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const limited = withRateLimit(req, 30)
  if (limited) return limited

  const { symbol } = await params
  if (!symbol || !SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
  }
  const cacheKey = `financials:v1:${symbol.toUpperCase()}`

  try {
    const cached = await redis.get(cacheKey)
    if (cached) return NextResponse.json(cached, { headers: EDGE_HEADERS })
  } catch { /* fall through */ }

  try {
    const [financials, metrics, earnings] = await Promise.allSettled([
      getFinancials(symbol, 'quarter'),
      getFinancialMetrics(symbol),
      getEarnings(symbol),
    ])

    const payload = {
      financials: financials.status === 'fulfilled' ? financials.value : null,
      metrics:    metrics.status    === 'fulfilled' ? metrics.value    : null,
      earnings:   earnings.status   === 'fulfilled' ? earnings.value   : [],
    }

    redis.set(cacheKey, payload, { ex: CACHE_TTL }).catch(() => {})
    return NextResponse.json(payload, { headers: EDGE_HEADERS })
  } catch (err) {
    console.error(`[api/financials/${symbol}]`, err)
    return NextResponse.json({ financials: null, metrics: null, earnings: [] }, { headers: EDGE_HEADERS })
  }
}
