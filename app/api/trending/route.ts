import { NextResponse }                          from 'next/server'
import { cachedFetch }                           from '@/lib/cache/redis'
import { getFinanceNews }                        from '@/lib/api/rss'
import { detectTrending, type TrendingPayload }  from '@/lib/utils/trending-keywords'

const CACHE_KEY = 'trending:keywords:v3'
const CACHE_TTL = 300  // 5 minutes

export async function GET() {
  try {
    const data = await cachedFetch<TrendingPayload>(CACHE_KEY, CACHE_TTL, async () => {
      const articles = await getFinanceNews()
      return detectTrending(articles)
    })
    return NextResponse.json(data)
  } catch (err) {
    console.error('[api/trending]', err)
    return NextResponse.json({ keywords: [], generatedAt: Date.now() })
  }
}
