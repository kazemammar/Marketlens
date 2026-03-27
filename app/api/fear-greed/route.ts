import { NextResponse } from 'next/server'
import { getFearGreedData } from '@/lib/api/cnn-fear-greed'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'

const EDGE_HEADERS = cacheHeaders(300)

export async function GET(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  try {
    const data = await getFearGreedData()
    if (!data) return NextResponse.json({ error: 'Data unavailable' }, { status: 503 })
    return NextResponse.json(data, { headers: EDGE_HEADERS })
  } catch (err) {
    console.error('[api/fear-greed]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
