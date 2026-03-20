// GET /api/forex/[pair]
// Placeholder — forex data is fetched directly by the asset page server component via Frankfurter.
// Use /api/market?tab=forex for the full forex cards list.

import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  const { pair } = await params
  void pair
  return NextResponse.json({ error: 'Not implemented — use /api/market?tab=forex for forex rates' }, { status: 501 })
}
