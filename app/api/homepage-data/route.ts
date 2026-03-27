import { NextResponse } from 'next/server'
import { cachedFetch } from '@/lib/cache/redis'
import { cacheHeaders } from '@/lib/utils/cache-headers'
import { withRateLimit } from '@/lib/utils/rate-limit'

const EDGE_HEADERS = cacheHeaders(60)

// Bundles multiple small data points into one response so the homepage
// makes 1 API call instead of 4+ for the quick panels.
export async function GET(req: Request) {
  const limited = withRateLimit(req, 30)
  if (limited) return limited

  try {
    const data = await cachedFetch('homepage:bundle:v1', 60, async () => {
      const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://marketlens.live'
      const [fearGreed, risk, trending, commodities] = await Promise.allSettled([
        fetch(`${base}/api/fear-greed`).then(r => r.json()).catch(() => null),
        fetch(`${base}/api/market-risk`).then(r => r.json()).catch(() => null),
        fetch(`${base}/api/trending`).then(r => r.json()).catch(() => null),
        fetch(`${base}/api/commodities-strip`).then(r => r.json()).catch(() => null),
      ])

      return {
        fearGreed: fearGreed.status === 'fulfilled' ? fearGreed.value : null,
        risk: risk.status === 'fulfilled' ? risk.value : null,
        trending: trending.status === 'fulfilled' ? trending.value : null,
        commodities: commodities.status === 'fulfilled' ? commodities.value : null,
        bundledAt: Date.now(),
      }
    })

    return NextResponse.json(data, { headers: EDGE_HEADERS })
  } catch {
    return NextResponse.json(
      { fearGreed: null, risk: null, trending: null, commodities: null, bundledAt: Date.now() },
      { headers: EDGE_HEADERS },
    )
  }
}
