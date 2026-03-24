import { NextResponse } from 'next/server'
import { getFinanceNews } from '@/lib/api/rss'
import { redis } from '@/lib/cache/redis'
import { STOCK_SECTORS } from '@/lib/utils/sectors'
import { withRateLimit } from '@/lib/utils/rate-limit'

const CACHE_KEY = 'news-sentiment:sectors:v1'
const CACHE_TTL = 600 // 10 min

const POSITIVE_WORDS = ['rally', 'surge', 'beat', 'growth', 'gain', 'soar', 'jump', 'rise', 'record', 'upgrade', 'outperform', 'bullish', 'strong']
const NEGATIVE_WORDS = ['war', 'crash', 'fall', 'cut', 'decline', 'drop', 'plunge', 'miss', 'downgrade', 'weak', 'bearish', 'layoff', 'recall', 'slump', 'loss']

interface SectorSentiment {
  name: string
  score: number
  articleCount: number
  topHeadline: string
}

export async function GET(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  try {
    const cached = await redis.get<{ sectors: SectorSentiment[]; generatedAt: number }>(CACHE_KEY)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  const articles = await getFinanceNews()

  // Build ticker → sector lookup
  const tickerToSector = new Map<string, string>()
  for (const [sector, tickers] of Object.entries(STOCK_SECTORS)) {
    for (const t of tickers) tickerToSector.set(t, sector)
  }

  // Assign articles to sectors and calculate sentiment
  const sectorData = new Map<string, { score: number; count: number; topHeadline: string }>()

  for (const article of articles) {
    const headline = article.headline
    const upper = headline.toUpperCase()

    // Find which sectors this article relates to
    const matchedSectors = new Set<string>()
    for (const [ticker, sector] of tickerToSector) {
      if (upper.includes(ticker) && ticker.length >= 2) {
        matchedSectors.add(sector)
      }
    }
    // Also check relatedSymbols
    for (const sym of article.relatedSymbols ?? []) {
      const sector = tickerToSector.get(sym.toUpperCase())
      if (sector) matchedSectors.add(sector)
    }

    if (matchedSectors.size === 0) continue

    // Determine headline sentiment
    const lower = headline.toLowerCase()
    let sentimentScore = 0
    for (const w of POSITIVE_WORDS) {
      if (lower.includes(w)) sentimentScore += 1
    }
    for (const w of NEGATIVE_WORDS) {
      if (lower.includes(w)) sentimentScore -= 1
    }

    for (const sector of matchedSectors) {
      const existing = sectorData.get(sector)
      if (existing) {
        existing.score += sentimentScore
        existing.count++
        if (!existing.topHeadline) existing.topHeadline = headline
      } else {
        sectorData.set(sector, { score: sentimentScore, count: 1, topHeadline: headline })
      }
    }
  }

  // Normalize scores to -100 to +100
  const sectors: SectorSentiment[] = []
  for (const [name, data] of sectorData) {
    if (data.count === 0) continue
    // Normalize: score per article, scaled to -100..100 range
    const rawAvg = data.score / data.count
    const normalized = Math.max(-100, Math.min(100, Math.round(rawAvg * 33)))
    sectors.push({
      name,
      score: normalized,
      articleCount: data.count,
      topHeadline: data.topHeadline,
    })
  }

  sectors.sort((a, b) => b.score - a.score)

  const payload = { sectors, generatedAt: Date.now() }
  redis.set(CACHE_KEY, payload, { ex: CACHE_TTL }).catch(() => {})
  return NextResponse.json(payload)
}
