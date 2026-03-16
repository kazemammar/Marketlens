// GET /api/quotes?symbols=SPY,QQQ,GLD,BINANCE:BTCUSDT
// Batch quote fetch — returns { [symbol]: QuoteRaw } map.
//
// Routing logic:
//  - BINANCE:* symbols → CoinGecko (free, no rate limit, 1 API call for all)
//  - Everything else  → Finnhub via getQuotesBatched
//    (checks Redis first; only Finnhub-calls cache misses, 5 at a time)

import { NextRequest } from 'next/server'
import { getQuotesBatched, QuoteRaw } from '@/lib/api/finnhub'
import { getCryptoByIds } from '@/lib/api/coingecko'

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

  // ── Split: crypto (CoinGecko) vs Finnhub ─────────────────────────────────
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

  // ── Fetch crypto via CoinGecko (1 request, no Finnhub calls) ─────────────
  if (cryptoSymbols.length > 0) {
    const cgIds = cryptoSymbols.map((s) => BINANCE_TO_CG[s])
    try {
      const coins = await getCryptoByIds(cgIds)
      // Re-map from CoinGecko ID back to BINANCE: symbol
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

  // ── Fetch Finnhub symbols via batched, cache-first fetcher ────────────────
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

  return Response.json(quotes, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=10' },
  })
}
