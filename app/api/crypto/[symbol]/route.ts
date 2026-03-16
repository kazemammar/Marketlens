// GET /api/crypto/[symbol]
// Returns crypto price and metadata via CoinGecko
// No API key required for basic endpoints

import { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  void symbol
  return Response.json({ todo: true })
}
