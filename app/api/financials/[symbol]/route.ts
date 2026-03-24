import { NextResponse } from 'next/server'
import { getFinancials } from '@/lib/api/fmp'
import { getFinancialMetrics, getEarnings } from '@/lib/api/finnhub'
import { redis } from '@/lib/cache/redis'

const CACHE_TTL = 86_400  // 24 hours — financials are quarterly, FMP has 250 calls/day free tier

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params
  const cacheKey = `financials:v1:${symbol.toUpperCase()}`

  try {
    const cached = await redis.get(cacheKey)
    if (cached) return NextResponse.json(cached)
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
    return NextResponse.json(payload)
  } catch (err) {
    console.error(`[api/financials/${symbol}]`, err)
    return NextResponse.json({ financials: null, metrics: null, earnings: [] })
  }
}
