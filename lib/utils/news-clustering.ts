import type { NewsArticle } from '@/lib/utils/types'
import { getSourceMeta, type SourceMeta } from '@/lib/utils/source-registry'
import { classifySeverity } from '@/lib/utils/severity-keywords'

// ─── Types ────────────────────────────────────────────────────────────────

export interface NewsCluster {
  id:              string          // from primary article
  headline:        string          // from highest-tier source
  summary:         string          // from highest-tier source
  url:             string          // URL of primary article
  source:          string          // name of primary (best tier) source
  sourceMeta:      SourceMeta      // tier/type metadata of primary source
  imageUrl?:       string          // best available image across cluster
  publishedAt:     number          // earliest article timestamp in cluster
  latestAt:        number          // latest article timestamp in cluster
  articles:        NewsArticle[]   // all articles in cluster
  sourceCount:     number          // number of unique sources
  allSources:      string[]        // list of source names
  severity:        'HIGH' | 'MED' | 'LOW'
  relatedSymbols?: string[]
}

// ─── Stop words ───────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the','a','is','and','to','of','in','for','on','with','by','at','from','has',
  'have','been','was','were','will','are','this','that','an','it','its','not',
  'but','or','as','after','before','says','said','could','would','more','than',
  'into','over','about','new','up','out','he','she','they','their','his','her',
  'may','can','us','no','do','if','what','all','so','just','how','who','when',
  'where','why','also','most','some','very','much','even','did','be','get','had',
  'other','only',
])

// ─── Similarity helpers ───────────────────────────────────────────────────

function getSignificantWords(headline: string): Set<string> {
  return new Set(
    headline
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w)),
  )
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  const intersection = new Set([...a].filter(x => b.has(x)))
  const union = new Set([...a, ...b])
  return intersection.size / union.size
}

const SIX_HOURS = 6 * 60 * 60 * 1_000

function shouldCluster(a: NewsArticle, b: NewsArticle): boolean {
  if (Math.abs(a.publishedAt - b.publishedAt) > SIX_HOURS) return false
  const wordsA = getSignificantWords(a.headline)
  const wordsB = getSignificantWords(b.headline)
  return jaccardSimilarity(wordsA, wordsB) >= 0.4
}

// ─── Severity ordering ────────────────────────────────────────────────────

const SEV_ORDER: Record<string, number> = { HIGH: 3, MED: 2, LOW: 1 }

// ─── Main clustering function ─────────────────────────────────────────────

export function clusterArticles(articles: NewsArticle[]): NewsCluster[] {
  // Newest first — seed each cluster with the most recent article
  const sorted = [...articles].sort((a, b) => b.publishedAt - a.publishedAt)

  const clusters: NewsCluster[] = []
  const assigned = new Set<string>()

  for (const article of sorted) {
    if (assigned.has(article.id)) continue

    // Start a new cluster from this article
    const members: NewsArticle[] = [article]
    assigned.add(article.id)

    // Find matching candidates (different source, within time window, similar headline)
    for (const candidate of sorted) {
      if (assigned.has(candidate.id)) continue
      if (candidate.source === article.source) continue  // no same-source clustering
      if (shouldCluster(article, candidate)) {
        members.push(candidate)
        assigned.add(candidate.id)
      }
    }

    // Sort by tier (lowest = most authoritative), then by recency within tier
    const withMeta = members.map(a => ({ article: a, meta: getSourceMeta(a.source) }))
    withMeta.sort((a, b) =>
      a.meta.tier !== b.meta.tier
        ? a.meta.tier - b.meta.tier
        : b.article.publishedAt - a.article.publishedAt,
    )
    const primary = withMeta[0]

    // Best image: first article (by tier) that has a valid image
    const bestImage = withMeta.find(m => m.article.imageUrl)?.article.imageUrl

    // Highest severity across all articles in cluster
    const severities = members.map(a => classifySeverity(`${a.headline} ${a.summary}`))
    const highestSev = severities.sort((a, b) => (SEV_ORDER[b] ?? 0) - (SEV_ORDER[a] ?? 0))[0] ?? 'LOW'

    // Unique sources
    const allSources = [...new Set(members.map(a => a.source))]

    // Merged related symbols
    const allSymbols = [...new Set(members.flatMap(a => a.relatedSymbols ?? []))]

    clusters.push({
      id:             primary.article.id,
      headline:       primary.article.headline,
      summary:        primary.article.summary,
      url:            primary.article.url,
      source:         primary.article.source,
      sourceMeta:     primary.meta,
      imageUrl:       bestImage,
      publishedAt:    Math.min(...members.map(a => a.publishedAt)),
      latestAt:       Math.max(...members.map(a => a.publishedAt)),
      articles:       members,
      sourceCount:    allSources.length,
      allSources,
      severity:       highestSev,
      relatedSymbols: allSymbols.length > 0 ? allSymbols : undefined,
    })
  }

  // Sort: most recently updated first, then severity descending
  return clusters.sort((a, b) => {
    if (b.latestAt !== a.latestAt) return b.latestAt - a.latestAt
    return (SEV_ORDER[b.severity] ?? 0) - (SEV_ORDER[a.severity] ?? 0)
  })
}
