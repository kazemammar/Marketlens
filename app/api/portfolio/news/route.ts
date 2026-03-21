import { NextResponse }              from 'next/server'
import { createServerSupabase }       from '@/lib/supabase/server'
import { withRateLimit }              from '@/lib/utils/rate-limit'
import { getRelatedNewsForAsset }     from '@/lib/api/rss'
import { getAssetKeywords }           from '@/lib/utils/news-helpers'
import { redis }                      from '@/lib/cache/redis'
import type { NewsArticle }           from '@/lib/utils/types'
import { classifySeverity }           from '@/lib/utils/severity-keywords'
import { clusterArticles }            from '@/lib/utils/news-clustering'
import type { SourceMeta }            from '@/lib/utils/source-registry'

// ─── Types ────────────────────────────────────────────────────────────────

export interface PortfolioNewsArticle {
  id:               string
  headline:         string
  summary:          string
  source:           string
  url:              string
  imageUrl?:        string
  publishedAt:      number
  severity:         'HIGH' | 'MED' | 'LOW'
  matchedPositions: Array<{ symbol: string; direction: 'long' | 'short' }>
}

export interface PortfolioNewsCluster {
  id:               string
  headline:         string
  summary:          string
  source:           string
  sourceMeta:       SourceMeta
  url:              string
  imageUrl?:        string
  publishedAt:      number
  latestAt:         number
  severity:         'HIGH' | 'MED' | 'LOW'
  sourceCount:      number
  allSources:       string[]
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
  const cacheKey = `portfolio:news:v2:${user.id}`
  try {
    const cached = await redis.get<{ clusters: PortfolioNewsCluster[]; generatedAt: number }>(cacheKey)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  // Fetch positions
  const { data: positions, error } = await supabase
    .from('portfolio_positions')
    .select('symbol, asset_type, direction')
    .eq('user_id', user.id)

  if (error || !positions || positions.length === 0) {
    return NextResponse.json({ clusters: [], generatedAt: Date.now() })
  }

  const rows = positions as PositionRow[]

  // Fetch news for each position in parallel
  const results = await Promise.allSettled(
    rows.map((p) => getRelatedNewsForAsset(p.symbol, p.asset_type))
  )

  // Merge + deduplicate by URL, track which positions match each article
  const urlMap = new Map<string, { article: NewsArticle; positions: PositionRow[] }>()

  results.forEach((result, idx) => {
    if (result.status !== 'fulfilled') return
    const pos = rows[idx]
    for (const article of result.value) {
      if (!article.url) continue
      const existing = urlMap.get(article.url)
      if (existing) {
        if (!existing.positions.some((p) => p.symbol === pos.symbol)) {
          existing.positions.push(pos)
        }
      } else {
        urlMap.set(article.url, { article, positions: [pos] })
      }
    }
  })

  // Build tagged articles (with id for clustering)
  const articles: PortfolioNewsArticle[] = []

  for (const { article, positions: matched } of urlMap.values()) {
    const text = `${article.headline} ${article.summary}`

    const verifiedPositions = matched.filter((p) => {
      const keywords = getAssetKeywords(p.symbol, p.asset_type)
      const t = text.toLowerCase()
      return keywords.some((kw) => t.includes(kw.toLowerCase()))
    })

    articles.push({
      id:               article.id,
      headline:         article.headline,
      summary:          article.summary,
      source:           article.source,
      url:              article.url,
      imageUrl:         article.imageUrl,
      publishedAt:      article.publishedAt,
      severity:         classifySeverity(text),
      matchedPositions: verifiedPositions.map((p) => ({
        symbol:    p.symbol,
        direction: p.direction,
      })),
    })
  }

  // Sort by recency, take top 50 before clustering
  articles.sort((a, b) => b.publishedAt - a.publishedAt)
  const top50 = articles.slice(0, 50)

  // Build position lookup for merging across cluster articles
  const articleById = new Map(top50.map(a => [a.id, a]))

  // Cluster the articles
  const rawClusters = clusterArticles(top50 as unknown as NewsArticle[])

  const clusters: PortfolioNewsCluster[] = rawClusters.map(cluster => {
    // Merge matchedPositions from all articles in this cluster
    const posMap = new Map<string, { symbol: string; direction: 'long' | 'short' }>()
    for (const a of cluster.articles) {
      const orig = articleById.get(a.id)
      if (orig) {
        for (const pos of orig.matchedPositions) {
          posMap.set(pos.symbol, pos)
        }
      }
    }

    return {
      id:               cluster.id,
      headline:         cluster.headline,
      summary:          cluster.summary,
      source:           cluster.source,
      sourceMeta:       cluster.sourceMeta,
      url:              cluster.url,
      imageUrl:         cluster.imageUrl,
      publishedAt:      cluster.publishedAt,
      latestAt:         cluster.latestAt,
      severity:         cluster.severity,
      sourceCount:      cluster.sourceCount,
      allSources:       cluster.allSources,
      matchedPositions: [...posMap.values()],
    }
  })

  const payload = { clusters, generatedAt: Date.now() }

  redis.set(cacheKey, payload, { ex: 300 }).catch(() => {})

  return NextResponse.json(payload)
}

export async function DELETE(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Bust both old and new cache keys
  const cacheKey    = `portfolio:news:${user.id}`
  const cacheKeyV2  = `portfolio:news:v2:${user.id}`
  await Promise.allSettled([redis.del(cacheKey), redis.del(cacheKeyV2)])
  return NextResponse.json({ success: true })
}
