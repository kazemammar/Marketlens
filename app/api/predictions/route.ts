export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getPredictionMarkets } from '@/lib/api/polymarket'
import type { PolymarketMarket } from '@/lib/api/polymarket'

export async function GET() {
  try {
    const markets = await getPredictionMarkets()
    console.log('[predictions] markets count:', markets.length, 'first:', markets[0]?.question)
    // Return top 8 by volume
    return NextResponse.json(markets.slice(0, 8))
  } catch (err) {
    console.error('[predictions] route error:', err)
    // Graceful fallback — return empty array
    return NextResponse.json([] as PolymarketMarket[])
  }
}
