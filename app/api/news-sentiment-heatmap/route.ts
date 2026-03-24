import { NextResponse } from 'next/server'
import { getFinanceNews } from '@/lib/api/rss'
import { cachedFetch } from '@/lib/cache/redis'
import { STOCK_SECTORS } from '@/lib/utils/sectors'
import { withRateLimit } from '@/lib/utils/rate-limit'

const CACHE_KEY = 'news-sentiment-heatmap:v1'
const CACHE_TTL = 600 // 10 min

const POSITIVE_WORDS = ['surge', 'rally', 'gain', 'beat', 'record', 'upgrade', 'soar', 'jump', 'rise', 'growth', 'outperform', 'bullish', 'strong']
const NEGATIVE_WORDS = ['crash', 'plunge', 'miss', 'downgrade', 'cut', 'loss', 'decline', 'fall', 'drop', 'weak', 'bearish', 'slump', 'layoff', 'recall']

interface SectorSentimentHeatmap {
  name: string
  positive: number
  negative: number
  neutral: number
  total: number
}

function classifyHeadline(headline: string): 'positive' | 'negative' | 'neutral' {
  const lower = headline.toLowerCase()
  let score = 0
  for (const w of POSITIVE_WORDS) {
    if (lower.includes(w)) score += 1
  }
  for (const w of NEGATIVE_WORDS) {
    if (lower.includes(w)) score -= 1
  }
  if (score > 0) return 'positive'
  if (score < 0) return 'negative'
  return 'neutral'
}

export async function GET(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  try {
    const payload = await cachedFetch(CACHE_KEY, CACHE_TTL, async () => {
      const articles = await getFinanceNews()

      // Build ticker -> sector lookup
      const tickerToSector = new Map<string, string>()
      for (const [sector, tickers] of Object.entries(STOCK_SECTORS)) {
        for (const t of tickers) tickerToSector.set(t, sector)
      }

      // Accumulate per-sector sentiment counts
      const sectorCounts = new Map<string, { positive: number; negative: number; neutral: number }>()
      for (const sector of Object.keys(STOCK_SECTORS)) {
        sectorCounts.set(sector, { positive: 0, negative: 0, neutral: 0 })
      }

      for (const article of articles) {
        const upper = article.headline.toUpperCase()

        // Match article to sectors via ticker mentions
        const matchedSectors = new Set<string>()
        for (const [ticker, sector] of tickerToSector) {
          if (ticker.length >= 2 && upper.includes(ticker)) {
            matchedSectors.add(sector)
          }
        }

        if (matchedSectors.size === 0) continue

        const sentiment = classifyHeadline(article.headline)

        for (const sector of matchedSectors) {
          const counts = sectorCounts.get(sector)
          if (counts) counts[sentiment] += 1
        }
      }

      const sectors: SectorSentimentHeatmap[] = Object.keys(STOCK_SECTORS).map((name) => {
        const counts = sectorCounts.get(name) ?? { positive: 0, negative: 0, neutral: 0 }
        return {
          name,
          positive: counts.positive,
          negative: counts.negative,
          neutral: counts.neutral,
          total: counts.positive + counts.negative + counts.neutral,
        }
      })

      return { sectors, generatedAt: Date.now() }
    })

    return NextResponse.json(payload)
  } catch (err) {
    console.error('[news-sentiment-heatmap] Error:', (err as Error).message)
    return NextResponse.json({ sectors: [], generatedAt: Date.now() }, { status: 500 })
  }
}
