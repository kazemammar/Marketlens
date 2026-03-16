// GET /api/forex/[pair]
// Returns forex rate for a currency pair via Finnhub
// Example: /api/forex/EUR-USD

import { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  const { pair } = await params
  void pair
  return Response.json({ todo: true })
}
