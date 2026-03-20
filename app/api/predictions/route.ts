import { NextResponse } from 'next/server'
import { getPredictionMarkets } from '@/lib/api/polymarket'
import type { PolymarketMarket } from '@/lib/api/polymarket'
import { redis } from '@/lib/cache/redis'

const CACHE_KEY = 'predictions:v1'
const CACHE_TTL = 300  // 5 min — prediction markets update continuously

export async function GET() {
  try {
    const cached = await redis.get<PolymarketMarket[]>(CACHE_KEY)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  try {
    const markets = await getPredictionMarkets()
    const top8 = markets.slice(0, 8)
    redis.set(CACHE_KEY, top8, { ex: CACHE_TTL }).catch(() => {})
    return NextResponse.json(top8)
  } catch (err) {
    console.error('[predictions] route error:', err)
    return NextResponse.json([] as PolymarketMarket[])
  }
}
