import { NextResponse } from 'next/server'
import { getTechnicalIndicators } from '@/lib/api/twelvedata'
import { withRateLimit } from '@/lib/utils/rate-limit'

const SYMBOL_RE = /^[A-Z0-9.=\-/]{1,20}$/i

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const limited = withRateLimit(req, 30)
  if (limited) return limited

  const { symbol } = await params
  if (!symbol || !SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
  }
  try {
    const data = await getTechnicalIndicators(symbol.toUpperCase())
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ rsi: null, macd: null, bbands: null, atr: null, stochastic: null, ema20: null, ema50: null, sma200: null })
  }
}
