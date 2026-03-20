// GET /api/etf/[symbol]
// Placeholder — ETF detail data is fetched directly by the asset page server component.
// Use /api/etf/holdings/[symbol] for holdings and /api/etf/overview/[symbol] for overview.

import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  void symbol
  return NextResponse.json({ error: 'Not implemented — use /api/etf/holdings/[symbol] or /api/etf/overview/[symbol]' }, { status: 501 })
}
