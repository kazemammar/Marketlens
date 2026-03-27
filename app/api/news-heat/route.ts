import { NextResponse } from 'next/server'
import { getFinanceNews } from '@/lib/api/rss'
import { cachedFetch } from '@/lib/cache/redis'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'

const EDGE_HEADERS = cacheHeaders(600)

// Region detection keywords → coordinates
const REGION_COORDS: Record<string, { lat: number; lng: number; keywords: string[] }> = {
  'Middle East':     { lat: 30, lng: 44, keywords: ['iran', 'iraq', 'saudi', 'israel', 'gaza', 'hamas', 'hezbollah', 'yemen', 'houthi', 'hormuz', 'opec', 'uae', 'qatar', 'bahrain', 'oman', 'lebanon', 'syria', 'tehran', 'riyadh'] },
  'Ukraine':         { lat: 49, lng: 32, keywords: ['ukraine', 'kyiv', 'zelensky', 'crimea', 'donbas'] },
  'Russia':          { lat: 56, lng: 38, keywords: ['russia', 'moscow', 'putin', 'kremlin', 'rouble', 'ruble'] },
  'China':           { lat: 35, lng: 105, keywords: ['china', 'beijing', 'shanghai', 'pboc', 'xi jinping', 'yuan', 'renminbi', 'ccp'] },
  'Taiwan':          { lat: 24, lng: 121, keywords: ['taiwan', 'tsmc', 'taipei', 'strait'] },
  'Japan':           { lat: 36, lng: 140, keywords: ['japan', 'boj', 'yen', 'nikkei', 'tokyo'] },
  'India':           { lat: 22, lng: 78, keywords: ['india', 'rbi', 'rupee', 'modi', 'mumbai', 'sensex'] },
  'Europe':          { lat: 50, lng: 10, keywords: ['ecb', 'eurozone', 'euro area', 'germany', 'france', 'uk ', 'britain', 'boe', 'london', 'ftse', 'dax', 'cac'] },
  'US East':         { lat: 40, lng: -74, keywords: ['fed', 'fomc', 'powell', 'wall street', 'nasdaq', 'nyse', 'congress', 'white house', 'treasury', 'washington'] },
  'US West':         { lat: 37, lng: -122, keywords: ['silicon valley', 'california', 'apple', 'google', 'meta', 'nvidia', 'tesla'] },
  'Brazil':          { lat: -15, lng: -48, keywords: ['brazil', 'petrobras', 'real', 'bovespa'] },
  'Africa':          { lat: 0, lng: 20, keywords: ['africa', 'nigeria', 'south africa', 'kenya', 'egypt', 'mining', 'cobalt'] },
  'Southeast Asia':  { lat: 5, lng: 110, keywords: ['asean', 'singapore', 'indonesia', 'malaysia', 'vietnam', 'philippines', 'malacca'] },
  'Korea':           { lat: 37, lng: 127, keywords: ['korea', 'samsung', 'kospi', 'won', 'pyongyang', 'kim jong'] },
}

export interface NewsHeatPoint {
  region: string
  lat: number
  lng: number
  intensity: number
  articleCount: number
}

export async function GET(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  try {
    const data = await cachedFetch(
      'news-heat:v1',
      600, // 10 min cache
      async () => {
        const articles = await getFinanceNews()
        const regionCounts: Record<string, number> = {}

        for (const article of articles) {
          const text = (article.headline + ' ' + (article.summary ?? '')).toLowerCase()
          for (const [region, { keywords }] of Object.entries(REGION_COORDS)) {
            const matches = keywords.filter(kw => text.includes(kw)).length
            if (matches > 0) {
              regionCounts[region] = (regionCounts[region] ?? 0) + matches
            }
          }
        }

        const maxCount = Math.max(...Object.values(regionCounts), 1)
        const heatPoints: NewsHeatPoint[] = Object.entries(REGION_COORDS)
          .filter(([region]) => regionCounts[region] > 0)
          .map(([region, coords]) => ({
            region,
            lat: coords.lat,
            lng: coords.lng,
            intensity: Math.round((regionCounts[region] / maxCount) * 100),
            articleCount: regionCounts[region],
          }))
          .sort((a, b) => b.intensity - a.intensity)

        return { heatPoints, generatedAt: Date.now(), totalArticles: articles.length }
      },
    )

    return NextResponse.json(data, { headers: EDGE_HEADERS })
  } catch {
    return NextResponse.json({ heatPoints: [], generatedAt: Date.now(), totalArticles: 0 })
  }
}
