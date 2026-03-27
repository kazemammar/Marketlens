import { NextResponse } from 'next/server'
import { getCompanyNews } from '@/lib/api/finnhub'
import { getNewsForSymbol } from '@/lib/api/rss'
import { AssetType } from '@/lib/utils/types'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'

const EDGE_HEADERS = cacheHeaders(60)
const SYMBOL_RE = /^[A-Z0-9.=\-\/!]{1,20}$/i

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const limited = withRateLimit(req, 60)
  if (limited) return limited

  const { symbol } = await params
  if (!symbol || !SYMBOL_RE.test(symbol)) {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
  }
  const url    = new URL(req.url)
  const type   = (url.searchParams.get('type') ?? 'stock') as AssetType

  try {
    let articles

    if (type === 'stock' || type === 'etf') {
      // Finnhub company news — last 30 days
      const to   = new Date()
      const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)

const EDGE_HEADERS = cacheHeaders(60)
      const fmt  = (d: Date) => d.toISOString().slice(0, 10)

      articles = await getCompanyNews(symbol, fmt(from), fmt(to))

      // Fall back to RSS if Finnhub returned nothing
      if (articles.length === 0) {
        articles = await getNewsForSymbol(symbol)
      }
    } else {
      articles = await getNewsForSymbol(symbol)
    }

    return NextResponse.json(articles.slice(0, 10))
  } catch (err) {
    console.error(`[api/news/${symbol}]`, err)
    return NextResponse.json([], { status: 200, headers: EDGE_HEADERS })
  }
}
