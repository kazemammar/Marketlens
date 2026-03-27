import { NextResponse } from 'next/server'
import { getTechnicalIndicators } from '@/lib/api/twelvedata'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'


const EDGE_HEADERS = cacheHeaders(120)
const SYMBOL_RE = /^[A-Z0-9.=\-/]{1,20}$/i

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const limited = withRateLimit(req, 30)
  if (limited) return limited

  const { symbol } = await params
  if (!symbol || !SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400, headers: EDGE_HEADERS })
  }
  try {
    const data = await getTechnicalIndicators(symbol.toUpperCase())
    return NextResponse.json(data, { headers: EDGE_HEADERS })
  } catch {
    return NextResponse.json({ rsi: null, macd: null, bbands: null, atr: null, stochastic: null, ema20: null, ema50: null, sma200: null }, { headers: EDGE_HEADERS })
  }
}
