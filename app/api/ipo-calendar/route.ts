import { NextResponse } from 'next/server'
import { getIpoCalendar } from '@/lib/api/finnhub'
import { cachedFetch }    from '@/lib/cache/redis'
import { cacheHeaders } from '@/lib/utils/cache-headers'
import { withRateLimit } from '@/lib/utils/rate-limit'

const EDGE_HEADERS = cacheHeaders(3600)

export async function GET(req: Request) {
  const limited = withRateLimit(req, 60)
  if (limited) return limited

  try {
    const today = new Date()
    const from  = today.toISOString().slice(0, 10)
    const to    = new Date(today.getTime() + 30 * 86400_000).toISOString().slice(0, 10)

    const events = await cachedFetch(
      `ipo-calendar:${from}`,
      3600,
      () => getIpoCalendar(from, to),
    )

    return NextResponse.json(events, { headers: EDGE_HEADERS })
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
