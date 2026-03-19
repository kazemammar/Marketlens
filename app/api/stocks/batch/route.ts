export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getQuotesBatched, getCompanyProfile } from '@/lib/api/finnhub'
import type { AssetCardData } from '@/lib/utils/types'

export async function GET(req: Request) {
  const url          = new URL(req.url)
  const symbolsParam = url.searchParams.get('symbols') ?? ''
  const symbols      = symbolsParam.split(',').map(s => s.trim()).filter(Boolean).slice(0, 30)

  if (symbols.length === 0) return NextResponse.json([])

  try {
    const quotes = await getQuotesBatched(symbols)
    const cards: AssetCardData[] = []

    for (const symbol of symbols) {
      const q = quotes.get(symbol)
      if (!q || q.price <= 0) continue

      let name = symbol
      try {
        const profile = await getCompanyProfile(symbol)
        if (profile?.name) name = profile.name
      } catch { /* use symbol as name */ }

      cards.push({
        symbol,
        name,
        type:          'stock',
        price:         q.price,
        change:        q.change   ?? 0,
        changePercent: q.changePercent ?? 0,
        currency:      'USD',
        open:          q.open  > 0 ? q.open  : q.price,
        high:          q.high  > 0 ? q.high  : q.price,
        low:           q.low   > 0 ? q.low   : q.price,
      })
    }

    return NextResponse.json(cards)
  } catch (err) {
    console.error('[stocks/batch]', err)
    return NextResponse.json([])
  }
}
