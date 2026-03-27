// GET /api/forex/[pair]
// Placeholder — forex data is fetched directly by the asset page server component via Frankfurter.
// Use /api/market?tab=forex for the full forex cards list.

import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'


const EDGE_HEADERS = cacheHeaders(300)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pair: string }> }
) {
  const limited = withRateLimit(req, 60)
  if (limited) return limited

  const { pair } = await params
  void pair
  return NextResponse.json({ error: 'Not implemented — use /api/market?tab=forex for forex rates' }, { status: 501, headers: EDGE_HEADERS })
}
