export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getQuotesBatched, getCompanyProfile } from '@/lib/api/finnhub'
import { redis } from '@/lib/cache/redis'
import type { AssetCardData } from '@/lib/utils/types'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'


const EDGE_HEADERS = cacheHeaders(60)
// ─── Route-level cache ────────────────────────────────────────────────────────
// One cache entry per unique symbol set (sorted, so order-independent).
// Strips the _t (tick/refresh) param so manual refreshes still hit the cache
// — the per-symbol Redis quotes (TTL 15 min) handle freshness for those.

const CACHE_TTL     = 1_800           // keep stale data 30 min
const REFRESH_AFTER = 10 * 60 * 1_000 // background refresh if > 10 min old

function cacheKey(symbols: string[]): string {
  return `stocks:batch:v2:${[...symbols].sort().join(',')}`
}

function lockKey(symbols: string[]): string {
  return `stocks:batch:lock:${[...symbols].sort().join(',')}`
}

interface CachedBatch {
  data:      AssetCardData[]
  fetchedAt: number
}

// ─── Data builder ─────────────────────────────────────────────────────────────

async function buildBatch(symbols: string[]): Promise<AssetCardData[]> {
  // Quotes + all company profiles in parallel — never sequential
  const [quotesMap, profiles] = await Promise.all([
    getQuotesBatched(symbols),
    Promise.all(
      symbols.map(s => getCompanyProfile(s).catch(() => null))
    ),
  ])

  const cards: AssetCardData[] = []
  symbols.forEach((symbol, i) => {
    const q = quotesMap.get(symbol)
    if (!q || q.price <= 0) return
    cards.push({
      symbol,
      name:          profiles[i]?.name ?? symbol,
      type:          'stock',
      price:         q.price,
      change:        q.change        ?? 0,
      changePercent: q.changePercent ?? 0,
      currency:      'USD',
      open:          q.open  > 0 ? q.open  : q.price,
      high:          q.high  > 0 ? q.high  : q.price,
      low:           q.low   > 0 ? q.low   : q.price,
    })
  })
  return cards
}

// ─── Background refresh ───────────────────────────────────────────────────────

function triggerBackgroundRefresh(symbols: string[]): void {
  void (async () => {
    const lk   = lockKey(symbols)
    const lock = await redis.set(lk, 1, { ex: 120, nx: true }).catch(() => null)
    if (!lock) return

    try {
      const data = await buildBatch(symbols)
      if (data.length > 0) {
        await redis.set(
          cacheKey(symbols),
          { data, fetchedAt: Date.now() } satisfies CachedBatch,
          { ex: CACHE_TTL },
        )
        console.log(`[stocks/batch] background refresh done: ${symbols.length} symbols`)
      }
    } catch (err) {
      console.warn('[stocks/batch] background refresh failed', err)
    } finally {
      redis.del(lk).catch(() => {})
    }
  })()
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const limited = withRateLimit(req, 30)
  if (limited) return limited

  const url          = new URL(req.url)
  const symbolsParam = url.searchParams.get('symbols') ?? ''
  const symbols      = symbolsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 60)

  if (symbols.length === 0) return NextResponse.json([], { headers: EDGE_HEADERS })

  const ck = cacheKey(symbols)

  // 1. Check route-level cache
  try {
    const cached = await redis.get<CachedBatch>(ck)
    if (cached?.data) {
      const ageMs = Date.now() - cached.fetchedAt
      console.log(`[stocks/batch] cache ${ageMs < REFRESH_AFTER ? 'FRESH' : 'STALE'} symbols=${symbols.length} age=${Math.round(ageMs / 1000)}s`)

      if (ageMs >= REFRESH_AFTER) triggerBackgroundRefresh(symbols)

      return NextResponse.json(cached.data, { headers: EDGE_HEADERS })
    }
  } catch { /* fallthrough */ }

  // 2. Cold start — blocking fetch
  console.log(`[stocks/batch] cold fetch symbols=${symbols.length}`)
  try {
    const data = await buildBatch(symbols)
    if (data.length > 0) {
      redis.set(ck, { data, fetchedAt: Date.now() } satisfies CachedBatch, { ex: CACHE_TTL }).catch(() => {})
    }
    return NextResponse.json(data, { headers: EDGE_HEADERS })
  } catch (err) {
    console.error('[stocks/batch]', err)
    return NextResponse.json([], { headers: EDGE_HEADERS })
  }
}
