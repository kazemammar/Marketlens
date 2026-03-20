// GET /api/crypto/[symbol]
// Placeholder — crypto data is fetched directly by the asset page server component via CoinGecko.
// Use /api/crypto/stats/[symbol] for on-chain stats.

import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params
  void symbol
  return NextResponse.json({ error: 'Not implemented — use /api/crypto/stats/[symbol] for on-chain data' }, { status: 501 })
}
