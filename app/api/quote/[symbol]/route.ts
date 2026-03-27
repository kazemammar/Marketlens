export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getQuote } from '@/lib/api/finnhub'
import { getYahooQuote } from '@/lib/api/yahoo'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'


const EDGE_HEADERS = cacheHeaders(60)
// Futures symbols contain '=' (e.g. GC=F, CL=F) or '!' (e.g. UX1!)
function isFuturesSymbol(symbol: string) {
  return symbol.includes('=') || symbol.includes('!')
}

const SYMBOL_RE = /^[A-Z0-9.=\-\/!]{1,20}$/i

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const limited = withRateLimit(req, 60)
  if (limited) return limited

  const { symbol } = await params
  if (!symbol || !SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
  }

  try {
    if (isFuturesSymbol(symbol)) {
      const quote = await getYahooQuote(symbol)
      if (!quote) return NextResponse.json(null, { status: 404, headers: EDGE_HEADERS })
      return NextResponse.json({
        symbol,
        price:         quote.price,
        change:        quote.change,
        changePercent: quote.changePercent,
        previousClose: quote.previousClose,
        marketState:   quote.marketState,
      }, { headers: EDGE_HEADERS })
    }

    const quote = await getQuote(symbol)
    if (!quote) return NextResponse.json(null, { status: 404, headers: EDGE_HEADERS })
    return NextResponse.json(quote, { headers: EDGE_HEADERS })
  } catch {
    return NextResponse.json(null, { status: 500, headers: EDGE_HEADERS })
  }
}
