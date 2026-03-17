import { NextResponse } from 'next/server'
import { getCompanyNews } from '@/lib/api/finnhub'
import { getNewsForSymbol, getRelatedNewsForAsset } from '@/lib/api/rss'
import { analyzeSentiment } from '@/lib/api/groq'
import { AssetType } from '@/lib/utils/types'
import { withRateLimit } from '@/lib/utils/rate-limit'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  const { symbol } = await params
  const url  = new URL(req.url)
  const type = (url.searchParams.get('type') ?? 'stock') as AssetType

  try {
    let headlines: string[] = []

    if (type === 'stock' || type === 'etf') {
      const to   = new Date()
      const from = new Date(to.getTime() - 14 * 24 * 60 * 60 * 1000)
      const fmt  = (d: Date) => d.toISOString().slice(0, 10)
      const articles = await getCompanyNews(symbol, fmt(from), fmt(to))
      headlines = articles.map((a) => a.headline)
    }

    if (headlines.length === 0) {
      const articles = await getNewsForSymbol(symbol)
      headlines = articles.map((a) => a.headline)
    }

    // Supplement with keyword-matched related news when we have < 5 headlines
    // This fixes commodity/forex/crypto pages that have no direct symbol matches
    if (headlines.length < 5) {
      const related = await getRelatedNewsForAsset(symbol, type)
      const seen = new Set(headlines.map((h) => h.toLowerCase().slice(0, 50)))
      for (const a of related) {
        const key = a.headline.toLowerCase().slice(0, 50)
        if (!seen.has(key)) {
          headlines.push(a.headline)
          seen.add(key)
        }
      }
    }

    if (headlines.length === 0) {
      return NextResponse.json({
        symbol,
        label:      'Neutral',
        score:      50,
        summary:    'No recent news found to analyze.',
        keySignals: [],
        analyzedAt: Date.now(),
      })
    }

    const sentiment = await analyzeSentiment(symbol, headlines)
    return NextResponse.json(sentiment)
  } catch (err) {
    console.error(`[api/sentiment/${symbol}]`, err)
    return NextResponse.json(
      { symbol, label: 'Neutral', score: 50, summary: 'Analysis unavailable.', keySignals: [], analyzedAt: Date.now() },
      { status: 200 },
    )
  }
}
