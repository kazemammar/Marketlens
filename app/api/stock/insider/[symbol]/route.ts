import { NextResponse } from 'next/server'
import { getInsiderTransactions } from '@/lib/api/finnhub'
import { redis } from '@/lib/cache/redis'

const CACHE_TTL = 3_600  // 1 hour — SEC filings are not real-time

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params
  const cacheKey = `insider:v1:${symbol.toUpperCase()}`

  try {
    const cached = await redis.get(cacheKey)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  try {
    const transactions = await getInsiderTransactions(symbol)
    redis.set(cacheKey, transactions, { ex: CACHE_TTL }).catch(() => {})
    return NextResponse.json(transactions)
  } catch (err) {
    console.error('[api/stock/insider]', err)
    return NextResponse.json([])
  }
}
