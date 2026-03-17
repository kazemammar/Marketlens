export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getQuote } from '@/lib/api/finnhub'
import { getYahooQuote } from '@/lib/api/yahoo'

// Futures symbols contain '=' (e.g. GC=F, CL=F) or '!' (e.g. UX1!)
function isFuturesSymbol(symbol: string) {
  return symbol.includes('=') || symbol.includes('!')
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params

  try {
    if (isFuturesSymbol(symbol)) {
      const quote = await getYahooQuote(symbol)
      if (!quote) return NextResponse.json(null, { status: 404 })
      return NextResponse.json({
        symbol,
        price:         quote.price,
        change:        quote.change,
        changePercent: quote.changePercent,
        previousClose: quote.previousClose,
        marketState:   quote.marketState,
      })
    }

    const quote = await getQuote(symbol)
    if (!quote) return NextResponse.json(null, { status: 404 })
    return NextResponse.json(quote)
  } catch {
    return NextResponse.json(null, { status: 500 })
  }
}
