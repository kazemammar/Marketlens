import { NextRequest, NextResponse } from 'next/server'
import { getSocialSentiment } from '@/lib/api/finnhub'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'


const EDGE_HEADERS = cacheHeaders(300)
const SYMBOL_RE = /^[A-Z0-9.=\-]{1,12}$/i

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const limited = withRateLimit(req, 60)
  if (limited) return limited

  const { symbol } = await params
  if (!symbol || !SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400, headers: EDGE_HEADERS })
  }

  try {
    const data = await getSocialSentiment(symbol.toUpperCase())
    return NextResponse.json(data, { headers: EDGE_HEADERS })
  } catch {
    return NextResponse.json({ reddit: [], twitter: [] }, { headers: EDGE_HEADERS })
  }
}
