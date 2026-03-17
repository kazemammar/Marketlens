import { NextRequest, NextResponse } from 'next/server'
import { getFinanceNews } from '@/lib/api/rss'
import { NewsArticle } from '@/lib/utils/types'

// Keyword sets for each category filter
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  stocks:      ['stock', 'shares', 'equity', 'nasdaq', 's&p', 'dow', 'ipo', 'earnings', 'dividend', 'wall street'],
  crypto:      ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'defi', 'nft', 'web3', 'altcoin', 'btc', 'eth', 'solana'],
  forex:       ['dollar', 'euro', 'yen', 'pound', 'forex', 'currency', 'fx', 'exchange rate', 'fed', 'ecb'],
  commodities: ['oil', 'gold', 'silver', 'copper', 'wheat', 'corn', 'natural gas', 'commodity', 'crude', 'brent'],
  macro:       ['inflation', 'interest rate', 'gdp', 'recession', 'central bank', 'federal reserve', 'economic', 'cpi', 'jobs report', 'unemployment'],
}

function matchesCategory(article: NewsArticle, category: string): boolean {
  if (category === 'all') return true
  const keywords = CATEGORY_KEYWORDS[category]
  if (!keywords) return true

  const haystack = `${article.headline} ${article.summary}`.toLowerCase()
  return keywords.some((kw) => haystack.includes(kw))
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category')?.toLowerCase() ?? 'all'
  const page     = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10))
  const perPage  = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10)))

  try {
    const all      = await getFinanceNews()
    const filtered = category === 'all' ? all : all.filter((a) => matchesCategory(a, category))

    // Paginate
    const start = (page - 1) * perPage
    const slice = filtered.slice(start, start + perPage)

    return NextResponse.json({
      articles: slice,
      total:    filtered.length,
      page,
      hasMore:  start + perPage < filtered.length,
    })
  } catch (err) {
    console.error('[api/news]', err)
    return NextResponse.json({ articles: [], total: 0, page: 1, hasMore: false })
  }
}
