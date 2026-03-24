import { NextResponse } from 'next/server'
import { getFinanceNews } from '@/lib/api/rss'
import { redis } from '@/lib/cache/redis'
import { STOCK_SECTORS } from '@/lib/utils/sectors'
import { scoreSentiment, classifySentiment } from '@/lib/utils/sentiment'
import { withRateLimit } from '@/lib/utils/rate-limit'

const CACHE_KEY = 'sector-sentiment:v1'
const CACHE_TTL = 600 // 10 min

export interface SectorSentiment {
  name: string
  score: number           // -100 to +100 (normalized)
  articleCount: number
  positive: number
  negative: number
  neutral: number
  topHeadline: string
  headlineUrl: string
  prevScore: number | null // previous cache cycle score, for trend
}

export interface SectorSentimentPayload {
  sectors: SectorSentiment[]
  generatedAt: number
  totalArticles: number
}

export async function GET(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  // Return cached if fresh
  try {
    const cached = await redis.get<SectorSentimentPayload>(CACHE_KEY)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  const articles = await getFinanceNews()

  // Build ticker → sector lookup
  const tickerToSector = new Map<string, string>()
  for (const [sector, tickers] of Object.entries(STOCK_SECTORS)) {
    for (const t of tickers) tickerToSector.set(t, sector)
  }

  // Accumulate per-sector data in a single pass
  const sectorAcc = new Map<string, {
    rawScore: number
    count: number
    positive: number
    negative: number
    neutral: number
    topHeadline: string
    headlineUrl: string
  }>()

  let totalArticles = 0

  for (const article of articles) {
    const headline = article.headline
    const upper = headline.toUpperCase()

    // Match article to sectors via ticker mentions + relatedSymbols
    const matchedSectors = new Set<string>()
    for (const [ticker, sector] of tickerToSector) {
      if (ticker.length >= 2 && upper.includes(ticker)) {
        matchedSectors.add(sector)
      }
    }
    for (const sym of article.relatedSymbols ?? []) {
      const sector = tickerToSector.get(sym.toUpperCase())
      if (sector) matchedSectors.add(sector)
    }

    if (matchedSectors.size === 0) continue
    totalArticles++

    const rawDelta = scoreSentiment(headline)
    const classification = classifySentiment(headline)

    for (const sector of matchedSectors) {
      const existing = sectorAcc.get(sector)
      if (existing) {
        existing.rawScore += rawDelta
        existing.count++
        existing[classification]++
        // Keep the first (most recent) headline as top
        if (!existing.topHeadline) {
          existing.topHeadline = headline
          existing.headlineUrl = article.url
        }
      } else {
        sectorAcc.set(sector, {
          rawScore: rawDelta,
          count: 1,
          positive: classification === 'positive' ? 1 : 0,
          negative: classification === 'negative' ? 1 : 0,
          neutral: classification === 'neutral' ? 1 : 0,
          topHeadline: headline,
          headlineUrl: article.url,
        })
      }
    }
  }

  // Read previous cached payload for trend deltas
  let prevScores: Record<string, number> = {}
  try {
    const prev = await redis.get<SectorSentimentPayload>(CACHE_KEY)
    if (prev?.sectors) {
      prevScores = Object.fromEntries(prev.sectors.map(s => [s.name, s.score]))
    }
  } catch { /* no previous data */ }

  // Build and normalize sectors
  const sectors: SectorSentiment[] = []
  for (const [name, data] of sectorAcc) {
    if (data.count === 0) continue
    const rawAvg = data.rawScore / data.count
    const normalized = Math.max(-100, Math.min(100, Math.round(rawAvg * 33)))

    sectors.push({
      name,
      score: normalized,
      articleCount: data.count,
      positive: data.positive,
      negative: data.negative,
      neutral: data.neutral,
      topHeadline: data.topHeadline,
      headlineUrl: data.headlineUrl,
      prevScore: prevScores[name] ?? null,
    })
  }

  // Sort by absolute score descending (strongest signal first)
  sectors.sort((a, b) => Math.abs(b.score) - Math.abs(a.score))

  const payload: SectorSentimentPayload = { sectors, generatedAt: Date.now(), totalArticles }
  redis.set(CACHE_KEY, payload, { ex: CACHE_TTL }).catch(() => {})
  return NextResponse.json(payload)
}
