import { NextResponse } from 'next/server'
import { getCompanyNews } from '@/lib/api/finnhub'
import { getNewsForSymbol } from '@/lib/api/rss'
import { analyzeSentiment } from '@/lib/api/groq'
import { AssetType } from '@/lib/utils/types'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params
  const url  = new URL(_req.url)
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
