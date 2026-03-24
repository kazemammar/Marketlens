import { NextResponse } from 'next/server'
import { getEconomicCalendar } from '@/lib/api/finnhub'
import { cachedFetch } from '@/lib/cache/redis'
import { withRateLimit } from '@/lib/utils/rate-limit'

export interface EconomicCalendarPayload {
  events: import('@/lib/api/finnhub').EconomicEvent[]
  generatedAt: number
}

export async function GET(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  try {
    const data = await cachedFetch<EconomicCalendarPayload>(
      'economic-calendar:v1',
      3600,
      async () => {
        const now = new Date()
        const from = now.toISOString().slice(0, 10)
        const to = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10)
        const events = await getEconomicCalendar(from, to)
        return { events, generatedAt: Date.now() }
      }
    )
    return NextResponse.json(data)
  } catch (err) {
    console.error('[api/economic-calendar]', err)
    return NextResponse.json({ events: [], generatedAt: Date.now() })
  }
}
