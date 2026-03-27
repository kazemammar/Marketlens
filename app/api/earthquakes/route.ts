import { NextResponse } from 'next/server'
import { getRecentEarthquakes } from '@/lib/api/usgs'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'

const EDGE_HEADERS = cacheHeaders(600)

export async function GET(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  try {
    const quakes = await getRecentEarthquakes()
    return NextResponse.json({ earthquakes: quakes, generatedAt: Date.now() }, { headers: EDGE_HEADERS })
  } catch {
    return NextResponse.json({ earthquakes: [], generatedAt: Date.now() })
  }
}
