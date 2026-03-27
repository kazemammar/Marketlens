// GET /api/etf/[symbol]
// Placeholder — ETF detail data is fetched directly by the asset page server component.
// Use /api/etf/holdings/[symbol] for holdings and /api/etf/overview/[symbol] for overview.

import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'


const EDGE_HEADERS = cacheHeaders(300)
const SYMBOL_RE = /^[A-Z0-9.=\-\/!]{1,20}$/i

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const limited = withRateLimit(req, 60)
  if (limited) return limited

  const { symbol } = await params
  if (!symbol || !SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
  }
  void symbol
  return NextResponse.json({ error: 'Not implemented — use /api/etf/holdings/[symbol] or /api/etf/overview/[symbol]' }, { status: 501, headers: EDGE_HEADERS })
}
