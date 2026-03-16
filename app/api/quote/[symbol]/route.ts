// GET /api/quote/[symbol]
// Returns live quote for a stock or ETF symbol via Finnhub
// Cached in Redis

import { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  void symbol
  return Response.json({ todo: true })
}
