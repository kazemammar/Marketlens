export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cachedFetch } from '@/lib/cache/redis'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'


const EDGE_HEADERS = cacheHeaders(300)
const CACHE_TTL = 30 * 60

interface FngDataPoint {
  value:                string
  value_classification: string
  timestamp:            string
}

export async function GET(req: Request) {
  const limited = withRateLimit(req, 60)
  if (limited) return limited

  try {
    const data = await cachedFetch<{ current: FngDataPoint; history: FngDataPoint[] }>(
      'crypto:feargreed',
      CACHE_TTL,
      async () => {
        const res = await fetch('https://api.alternative.me/fng/?limit=30&format=json')
        if (!res.ok) throw new Error(`FNG API HTTP ${res.status}`)
        const json = await res.json() as { data: FngDataPoint[] }
        return { current: json.data[0], history: json.data.slice(0, 30) }
      },
    )
    return NextResponse.json(data, { headers: EDGE_HEADERS })
  } catch (err) {
    console.error('[crypto/fear-greed]', err)
    return NextResponse.json({ current: null, history: [] }, { headers: EDGE_HEADERS })
  }
}
