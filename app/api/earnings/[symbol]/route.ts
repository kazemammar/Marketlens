import { NextResponse } from 'next/server'
import { getEarnings } from '@/lib/api/finnhub'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { redis } from '@/lib/cache/redis'

const CACHE_TTL = 3_600  // 1 hour — earnings calendar doesn't change intraday

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const limited = withRateLimit(req, 30)
  if (limited) return limited

  const { symbol } = await params
  const decoded = decodeURIComponent(symbol)
  const cacheKey = `earnings:v1:${decoded.toUpperCase()}`

  try {
    const cached = await redis.get(cacheKey)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  try {
    const earnings = await getEarnings(decoded)
    const payload = { earnings, symbol: decoded }
    redis.set(cacheKey, payload, { ex: CACHE_TTL }).catch(() => {})
    return NextResponse.json(payload)
  } catch (err) {
    console.error(`[api/earnings/${symbol}]`, err)
    return NextResponse.json({ earnings: [], symbol: decoded }, { status: 200 })
  }
}
