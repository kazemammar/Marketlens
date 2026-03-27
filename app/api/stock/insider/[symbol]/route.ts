import { NextResponse } from 'next/server'
import { getInsiderTransactions } from '@/lib/api/finnhub'
import { redis } from '@/lib/cache/redis'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'


const EDGE_HEADERS = cacheHeaders(300)
const CACHE_TTL = 3_600  // 1 hour — SEC filings are not real-time

const SYMBOL_RE = /^[A-Z0-9.=\-\/!]{1,20}$/i

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const limited = withRateLimit(req, 60)
  if (limited) return limited

  const { symbol } = await params
  if (!symbol || !SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
  }
  const cacheKey = `insider:v1:${symbol.toUpperCase()}`

  try {
    const cached = await redis.get(cacheKey)
    if (cached) return NextResponse.json(cached, { headers: EDGE_HEADERS })
  } catch { /* fall through */ }

  try {
    const transactions = await getInsiderTransactions(symbol)
    redis.set(cacheKey, transactions, { ex: CACHE_TTL }).catch(() => {})
    return NextResponse.json(transactions, { headers: EDGE_HEADERS })
  } catch (err) {
    console.error('[api/stock/insider]', err)
    return NextResponse.json([], { headers: EDGE_HEADERS })
  }
}
