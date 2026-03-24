import { NextResponse } from 'next/server'
import { getIpoCalendar } from '@/lib/api/finnhub'
import { cachedFetch }    from '@/lib/cache/redis'

export async function GET() {
  try {
    const today = new Date()
    const from  = today.toISOString().slice(0, 10)
    const to    = new Date(today.getTime() + 30 * 86400_000).toISOString().slice(0, 10)

    const events = await cachedFetch(
      `ipo-calendar:${from}`,
      3600,
      () => getIpoCalendar(from, to),
    )

    return NextResponse.json(events)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
