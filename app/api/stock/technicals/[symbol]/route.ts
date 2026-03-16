export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAggregateIndicators, getSupportResistance } from '@/lib/api/finnhub'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params
  try {
    const [indicators, levels] = await Promise.allSettled([
      getAggregateIndicators(symbol),
      getSupportResistance(symbol),
    ])
    return NextResponse.json({
      indicators: indicators.status === 'fulfilled' ? indicators.value : null,
      supportResistance: levels.status === 'fulfilled' ? levels.value : [],
    })
  } catch (err) {
    console.error('[api/stock/technicals]', err)
    return NextResponse.json({ indicators: null, supportResistance: [] })
  }
}
