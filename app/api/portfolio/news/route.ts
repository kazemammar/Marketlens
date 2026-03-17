import { NextResponse }              from 'next/server'
import { createServerSupabase }       from '@/lib/supabase/server'
import { withRateLimit }              from '@/lib/utils/rate-limit'
import { getRelatedNewsForAsset }     from '@/lib/api/rss'
import { getAssetKeywords }           from '@/lib/utils/news-helpers'
import { redis }                      from '@/lib/cache/redis'
import type { NewsArticle }           from '@/lib/utils/types'

// ─── Severity classification ──────────────────────────────────────────────

const HIGH_KW = ['war','attack','strike','sanction','blockade','invasion','missile','drone','crisis','crash','collapse','emergency','default','coup','explosion','seized']
const MED_KW  = ['tariff','trade','regulation','election','gdp','inflation','rate hike','rate cut','deficit','devaluation','recession','unemployment','fomc','opec']

function severity(text: string): 'HIGH' | 'MED' | 'LOW' {
  const t = text.toLowerCase()
  if (HIGH_KW.some((kw) => t.includes(kw))) return 'HIGH'
  if (MED_KW.some((kw)  => t.includes(kw))) return 'MED'
  return 'LOW'
}

// ─── Types ────────────────────────────────────────────────────────────────

export interface PortfolioNewsArticle {
  headline:         string
  summary:          string
  source:           string
  url:              string
  imageUrl?:        string
  publishedAt:      number
  severity:         'HIGH' | 'MED' | 'LOW'
  matchedPositions: Array<{ symbol: string; direction: 'long' | 'short' }>
}

interface PositionRow {
  symbol:     string
  asset_type: string
  direction:  'long' | 'short'
}

// ─── Route ────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Check per-user cache
  const cacheKey = `portfolio:news:${user.id}`
  try {
    const cached = await redis.get<{ articles: PortfolioNewsArticle[]; generatedAt: number }>(cacheKey)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  // Fetch positions
  const { data: positions, error } = await supabase
    .from('portfolio_positions')
    .select('symbol, asset_type, direction')
    .eq('user_id', user.id)

  if (error || !positions || positions.length === 0) {
    return NextResponse.json({ articles: [], generatedAt: Date.now() })
  }

  const rows = positions as PositionRow[]

  // Fetch news for each position in parallel
  const results = await Promise.allSettled(
    rows.map((p) => getRelatedNewsForAsset(p.symbol, p.asset_type))
  )

  // Merge + deduplicate by URL
  const urlMap = new Map<string, { article: NewsArticle; positions: PositionRow[] }>()

  results.forEach((result, idx) => {
    if (result.status !== 'fulfilled') return
    const pos = rows[idx]
    for (const article of result.value) {
      if (!article.url) continue
      const existing = urlMap.get(article.url)
      if (existing) {
        // Add this position to the match list if not already there
        if (!existing.positions.some((p) => p.symbol === pos.symbol)) {
          existing.positions.push(pos)
        }
      } else {
        urlMap.set(article.url, { article, positions: [pos] })
      }
    }
  })

  // Build tagged articles
  const articles: PortfolioNewsArticle[] = []

  for (const { article, positions: matched } of urlMap.values()) {
    const text = `${article.headline} ${article.summary}`

    // Verify each matched position actually has keyword overlap
    const verifiedPositions = matched.filter((p) => {
      const keywords = getAssetKeywords(p.symbol, p.asset_type)
      const t = text.toLowerCase()
      return keywords.some((kw) => t.includes(kw.toLowerCase()))
    })

    articles.push({
      headline:         article.headline,
      summary:          article.summary,
      source:           article.source,
      url:              article.url,
      imageUrl:         article.imageUrl,
      publishedAt:      article.publishedAt,
      severity:         severity(text),
      matchedPositions: verifiedPositions.map((p) => ({
        symbol:    p.symbol,
        direction: p.direction,
      })),
    })
  }

  // Sort by recency, cap at 50
  articles.sort((a, b) => b.publishedAt - a.publishedAt)
  const top50 = articles.slice(0, 50)

  const payload = { articles: top50, generatedAt: Date.now() }

  redis.set(cacheKey, payload, { ex: 300 }).catch(() => {})

  return NextResponse.json(payload)
}

export async function DELETE(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const cacheKey = `portfolio:news:${user.id}`
  await redis.del(cacheKey).catch(() => {})
  return NextResponse.json({ success: true })
}
