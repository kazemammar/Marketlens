export const dynamic = 'force-dynamic'

import { NextResponse }        from 'next/server'
import { getCompanyNews, getCompanyProfile } from '@/lib/api/finnhub'
import { getNewsForSymbol }    from '@/lib/api/rss'
import { analyzeAssetContext } from '@/lib/api/groq'
import type { AssetType }      from '@/lib/utils/types'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params
  const url  = new URL(req.url)
  const type = (url.searchParams.get('type') ?? 'stock') as AssetType

  try {
    let headlines: string[] = []
    let metadata: { industry?: string; name?: string } = {}

    if (type === 'stock' || type === 'etf') {
      const profile = await getCompanyProfile(symbol).catch(() => null)
      if (profile) metadata = { industry: profile.finnhubIndustry, name: profile.name }

      const to   = new Date()
      const from = new Date(to.getTime() - 14 * 24 * 60 * 60 * 1000)
      const fmt  = (d: Date) => d.toISOString().slice(0, 10)
      const articles = await getCompanyNews(symbol, fmt(from), fmt(to)).catch(() => [])
      headlines = articles.map((a) => a.headline)
    }

    // Supplement with RSS headlines
    const rssArticles  = await getNewsForSymbol(symbol).catch(() => [])
    const rssHeadlines = rssArticles.map((a) => a.headline)
    headlines = [...new Set([...headlines, ...rssHeadlines])].slice(0, 25)

    if (headlines.length === 0) {
      return NextResponse.json({
        symbol,
        factors:    [],
        summary:    'No recent news available for context analysis.',
        analyzedAt: Date.now(),
      })
    }

    const context = await analyzeAssetContext(symbol, type, headlines, metadata)
    return NextResponse.json(context)
  } catch (err) {
    console.error(`[api/asset-context/${symbol}]`, err)
    return NextResponse.json({
      symbol,
      factors:    [],
      summary:    'Context analysis unavailable.',
      analyzedAt: Date.now(),
    })
  }
}
