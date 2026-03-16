import { NextRequest, NextResponse } from 'next/server'
import { searchSymbols } from '@/lib/api/finnhub'
import { searchCrypto } from '@/lib/api/coingecko'
import { DEFAULT_FOREX_PAIRS, DEFAULT_COMMODITIES } from '@/lib/utils/constants'
import { Asset } from '@/lib/utils/types'

export async function GET(req: NextRequest) {
  const q     = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10)

  if (!q || q.length < 1) {
    return NextResponse.json([])
  }

  const term = q.toLowerCase()

  // ── Run all three searches concurrently ───────────────────────────────
  const [finnhubResults, cgResults] = await Promise.allSettled([
    searchSymbols(q),
    searchCrypto(q),
  ])

  const stocks: Asset[] = []
  const etfs:   Asset[] = []

  if (finnhubResults.status === 'fulfilled') {
    for (const a of finnhubResults.value) {
      if (a.type === 'etf') etfs.push(a)
      else                  stocks.push(a)
    }
  }

  const crypto: Asset[] = cgResults.status === 'fulfilled' ? cgResults.value : []

  // ── Forex: filter DEFAULT_FOREX_PAIRS by symbol/name ─────────────────
  const forex: Asset[] = DEFAULT_FOREX_PAIRS
    .filter(
      (p) =>
        p.symbol.toLowerCase().includes(term) ||
        p.pair.toLowerCase().includes(term)   ||
        p.base.toLowerCase().includes(term)   ||
        p.quote.toLowerCase().includes(term),
    )
    .map((p): Asset => ({
      symbol: p.symbol,
      name:   p.pair,
      type:   'forex',
    }))

  // ── Commodities: filter DEFAULT_COMMODITIES by symbol/name ───────────
  const commodities: Asset[] = DEFAULT_COMMODITIES
    .filter(
      (c) =>
        c.symbol.toLowerCase().includes(term) ||
        c.name.toLowerCase().includes(term)   ||
        c.underlying.toLowerCase().includes(term),
    )
    .map((c): Asset => ({
      symbol: c.symbol,
      name:   `${c.name} (${c.underlying})`,
      type:   'commodity',
    }))

  // ── Merge: stocks/ETFs first, then crypto, forex, commodities ─────────
  const all: Asset[] = [
    ...stocks.slice(0, 8),
    ...crypto.slice(0, 6),
    ...forex,
    ...commodities,
    ...etfs.slice(0, 4),
  ].slice(0, limit)

  return NextResponse.json(all)
}
