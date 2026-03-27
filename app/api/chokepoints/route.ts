export const dynamic = 'force-dynamic'

import { NextResponse }             from 'next/server'
import { cachedFetch }              from '@/lib/cache/redis'
import { analyzeChokepointIntel }   from '@/lib/api/chokepoints'
import type { ChokepointIntelPayload } from '@/lib/api/chokepoints'
import { withRateLimit }            from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'

const EDGE_HEADERS = cacheHeaders(600)

const CACHE_KEY = 'chokepoints:intel:v1'
const CACHE_TTL = 300  // 5 minutes

export async function GET(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  try {
    const data = await cachedFetch<ChokepointIntelPayload>(
      CACHE_KEY,
      CACHE_TTL,
      analyzeChokepointIntel,
    )
    return NextResponse.json(data, { headers: EDGE_HEADERS })
  } catch (err) {
    console.error('[api/chokepoints]', err)
    return NextResponse.json({ chokepoints: [], disruptedCount: 0, generatedAt: Date.now() }, { headers: EDGE_HEADERS })
  }
}
