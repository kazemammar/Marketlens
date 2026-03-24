import { NextResponse } from 'next/server'
import { getTechnicalIndicators } from '@/lib/api/twelvedata'
import { withRateLimit } from '@/lib/utils/rate-limit'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const limited = withRateLimit(req, 30)
  if (limited) return limited

  const { symbol } = await params
  try {
    const data = await getTechnicalIndicators(symbol.toUpperCase())
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ rsi: null, macd: null, bbands: null, atr: null, stochastic: null, ema20: null, ema50: null, sma200: null })
  }
}
