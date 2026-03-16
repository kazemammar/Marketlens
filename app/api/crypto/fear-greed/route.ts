export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cachedFetch } from '@/lib/cache/redis'

const CACHE_TTL = 30 * 60

interface FngDataPoint {
  value:                string
  value_classification: string
  timestamp:            string
}

export async function GET() {
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
    return NextResponse.json(data)
  } catch (err) {
    console.error('[crypto/fear-greed]', err)
    return NextResponse.json({ current: null, history: [] })
  }
}
