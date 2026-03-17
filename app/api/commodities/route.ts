// GET /api/commodities
// Returns real futures prices for major commodities via Yahoo Finance

import { NextResponse } from 'next/server'
import { getYahooQuotesBatch } from '@/lib/api/yahoo'
import { DEFAULT_COMMODITIES } from '@/lib/utils/constants'
import { cachedFetch, cacheKey } from '@/lib/cache/redis'

export const dynamic = 'force-dynamic'

export async function GET() {
  const data = await cachedFetch(
    cacheKey.commodities(),
    300,
    async () => {
      const symbols = DEFAULT_COMMODITIES.map((c) => c.symbol)
      const quotes  = await getYahooQuotesBatch(symbols)
      return DEFAULT_COMMODITIES.flatMap((cfg) => {
        const q = quotes.find((qq) => qq.symbol === cfg.symbol)
        if (!q || q.price <= 0) return []
        return [{
          symbol:        cfg.symbol,
          name:          cfg.name,
          currency:      cfg.currency,
          underlying:    cfg.underlying,
          price:         q.price,
          change:        q.change,
          changePercent: q.changePercent,
          previousClose: q.previousClose,
        }]
      })
    },
  )
  return NextResponse.json(data)
}
