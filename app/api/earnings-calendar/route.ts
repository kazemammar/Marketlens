import { NextResponse } from 'next/server'
import { getEarningsCalendar } from '@/lib/api/finnhub'
import { cachedFetch } from '@/lib/cache/redis'
import { withRateLimit } from '@/lib/utils/rate-limit'

export interface EarningsCalendarPayload {
  events: import('@/lib/api/finnhub').EarningsEvent[]
  generatedAt: number
}

export async function GET(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  try {
    const data = await cachedFetch<EarningsCalendarPayload>(
      'earnings-calendar:v1',
      3600,
      async () => {
        const now = new Date()
        // This week: from Monday to Friday
        const day = now.getDay()
        const monday = new Date(now)
        monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
        const friday = new Date(monday)
        friday.setDate(monday.getDate() + 4)
        const from = monday.toISOString().slice(0, 10)
        const to = friday.toISOString().slice(0, 10)
        const events = await getEarningsCalendar(from, to)
        return { events, generatedAt: Date.now() }
      }
    )
    return NextResponse.json(data)
  } catch (err) {
    console.error('[api/earnings-calendar]', err)
    return NextResponse.json({ events: [], generatedAt: Date.now() })
  }
}
