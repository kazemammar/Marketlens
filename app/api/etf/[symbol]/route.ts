// GET /api/etf/[symbol]
// Returns ETF details, holdings, and performance via FMP

import { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  void symbol
  return Response.json({ todo: true })
}
