// GET /api/quotes?symbols=SPY,QQQ,GLD,BINANCE:BTCUSDT
// Batch quote fetch — returns { [symbol]: QuoteRaw } map.
//
// Routing logic:
//  - BINANCE:* symbols → CoinGecko (free, no rate limit, 1 API call for all)
//  - Everything else  → Finnhub via getQuotesBatched
//    (checks Redis first; only calls Finnhub for cache misses, 4 at a time)
//
// Route-level Redis cache: the full response for a given sorted symbol set is
// cached under `quotes:batch:{key}` for 90 seconds. Concurrent requests for
// the same symbol set (e.g. TickerTape firing twice on hot-reload) return the
// cached payload without touching Finnhub at all.

import { NextRequest } from 'next/server'
import { getQuotesBatched, QuoteRaw } from '@/lib/api/finnhub'
import { getCryptoByIds } from '@/lib/api/coingecko'
import { redis } from '@/lib/cache/redis'

export const dynamic = 'force-dynamic'

const ROUTE_CACHE_TTL = 90 // seconds

// Map BINANCE: ticker symbols to CoinGecko IDs
const BINANCE_TO_CG: Record<string, string> = {
  'BINANCE:BTCUSDT':  'bitcoin',
  'BINANCE:ETHUSDT':  'ethereum',
  'BINANCE:SOLUSDT':  'solana',
  'BINANCE:BNBUSDT':  'binancecoin',
  'BINANCE:XRPUSDT':  'ripple',
  'BINANCE:ADAUSDT':  'cardano',
  'BINANCE:AVAXUSDT': 'avalanche-2',
  'BINANCE:DOGEUSDT': 'dogecoin',
}

export async function GET(req: NextRequest) {
  const raw     = req.nextUrl.searchParams.get('symbols') ?? ''
  const symbols = raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30)

  if (symbols.length === 0) {
    return Response.json({ error: 'No symbols provided' }, { status: 400 })
  }

  // Stable cache key: sort symbols so ?symbols=A,B and ?symbols=B,A share cache
  const sorted   = [...symbols].sort()
  const routeKey = `quotes:batch:${sorted.join(',')}`

  // ── Route-level Redis cache (full response) ──────────────────────────────
  try {
    const cached = await redis.get<Record<string, QuoteRaw>>(routeKey)
    if (cached) {
      console.log(`[/api/quotes] route cache HIT (${symbols.length} symbols)`)
      return Response.json(cached, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
      })
    }
  } catch { /* fall through */ }

  // ── Split: crypto (CoinGecko) vs Finnhub ────────────────────────────────
  const cryptoSymbols:  string[] = []
  const finnhubSymbols: string[] = []

  for (const sym of symbols) {
    if (BINANCE_TO_CG[sym]) {
      cryptoSymbols.push(sym)
    } else {
      finnhubSymbols.push(sym)
    }
  }

  const quotes: Record<string, QuoteRaw> = {}

  // ── Fetch crypto via CoinGecko (1 request, no Finnhub calls) ────────────
  if (cryptoSymbols.length > 0) {
    const cgIds = cryptoSymbols.map((s) => BINANCE_TO_CG[s])
    try {
      const coins = await getCryptoByIds(cgIds)
      const idToSymbol = Object.fromEntries(
        cryptoSymbols.map((s) => [BINANCE_TO_CG[s], s]),
      )
      for (const coin of coins) {
        const sym = idToSymbol[coin.id]
        if (!sym) continue
        const price = coin.currentPrice
        const prev  = price - coin.priceChange24h
        quotes[sym] = {
          price,
          previousClose: prev,
          change:        coin.priceChange24h,
          changePercent: coin.priceChangePercent24h,
          high:          coin.high24h,
          low:           coin.low24h,
          open:          prev,
          timestamp:     Date.now(),
        }
      }
      console.log(`[/api/quotes] crypto: ${Object.values(quotes).length}/${cryptoSymbols.length} via CoinGecko`)
    } catch (err) {
      console.error('[/api/quotes] CoinGecko failed:', err)
    }
  }

  // ── Fetch Finnhub symbols via batched, cache-first fetcher ───────────────
  if (finnhubSymbols.length > 0) {
    try {
      const finnhubMap = await getQuotesBatched(finnhubSymbols)
      let hits = 0
      for (const [sym, q] of finnhubMap) {
        // Market closed: Finnhub c=0 → fall back to previousClose
        const price = q.price > 0 ? q.price : q.previousClose
        if (price > 0) {
          quotes[sym] = { ...q, price }
          hits++
        }
      }
      console.log(`[/api/quotes] finnhub: ${hits}/${finnhubSymbols.length}`)
    } catch (err) {
      console.error('[/api/quotes] Finnhub batch failed:', err)
    }
  }

  // Cache the full response so concurrent/repeat calls skip all the above
  if (Object.keys(quotes).length > 0) {
    redis.set(routeKey, quotes, { ex: ROUTE_CACHE_TTL }).catch(() => {})
  }

  return Response.json(quotes, {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30' },
  })
}
