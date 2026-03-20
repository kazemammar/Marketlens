import { NextResponse } from 'next/server'
import { getRecommendations } from '@/lib/api/finnhub'
import { redis } from '@/lib/cache/redis'

const CACHE_TTL = 3_600  // 1 hour — analyst recs update at most once per trading day

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params
  const cacheKey = `recs:v1:${symbol.toUpperCase()}`

  try {
    const cached = await redis.get(cacheKey)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  try {
    const data = await getRecommendations(symbol)
    redis.set(cacheKey, data, { ex: CACHE_TTL }).catch(() => {})
    return NextResponse.json(data)
  } catch (err) {
    console.error(`[api/recommendations/${symbol}]`, err)
    return NextResponse.json([])
  }
}
