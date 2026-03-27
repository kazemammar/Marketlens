import { NextResponse } from 'next/server'
import { getSymbolSentiment } from '@/lib/api/stocktwits'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'

const EDGE_HEADERS = cacheHeaders(600)

const FALLBACK = { bullish: 0, bearish: 0, totalMessages: 0, sentiment: 'neutral' as const, sentimentScore: 50 }

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const limited = withRateLimit(req, 30)
  if (limited) return limited

  const { symbol } = await params
  try {
    const sentiment = await getSymbolSentiment(symbol.toUpperCase())
    return NextResponse.json(
      sentiment ?? { symbol: symbol.toUpperCase(), ...FALLBACK },
      { headers: EDGE_HEADERS },
    )
  } catch {
    return NextResponse.json({ symbol: symbol.toUpperCase(), ...FALLBACK })
  }
}
