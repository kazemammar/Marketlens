import { NextResponse } from 'next/server'
import { getTrendingSymbols } from '@/lib/api/stocktwits'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'

const EDGE_HEADERS = cacheHeaders(300)

export async function GET(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  try {
    const symbols = await getTrendingSymbols()
    return NextResponse.json({ symbols, generatedAt: Date.now() }, { headers: EDGE_HEADERS })
  } catch {
    return NextResponse.json({ symbols: [], generatedAt: Date.now() })
  }
}
