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
  // Finance-specific generic words — too common to drive clustering on their own
  'prices','price','rise','rises','rose','fell','fall','falls','down','high','low',
  'fears','fear','amid','surge','surges','surged','drop','drops','dropped',
  'week','day','year','month','first','time',
])

// ─── Semantic normalization ───────────────────────────────────────────────
//
// Multi-word phrases are collapsed to a single token before splitting so that
// "Federal Reserve raises rates 25bps" and "Fed hikes by quarter point" share
// enough significant words to meet the Jaccard threshold.

// Applied on the full lowercase string before tokenizing (longer phrases first)
const PHRASE_SUBS: Array<[RegExp, string]> = [
  [/\bfederal reserve\b/g,              'fed'],
  [/\beuropean central bank\b/g,        'ecb'],
  [/\bbank of england\b/g,              'boe'],
  [/\bbank of japan\b/g,                'boj'],
  [/\bpeople's bank of china\b/g,       'pboc'],
  [/\btrump administration\b/g,         'whitehouse'],
  [/\bbiden administration\b/g,         'whitehouse'],
  [/\binterest rates?\b/g,              'rate'],
  [/\bbasis points?\b/g,                'basispoints'],
  [/\bopec\+/g,                         'opec'],
  [/\bwhite house\b/g,                  'whitehouse'],
  [/\bwall street\b/g,                  'wallstreet'],
  [/\bsupply chain\b/g,                 'supplychain'],
  [/\btrade war\b/g,                    'tradewar'],
  [/\bdebt ceiling\b/g,                 'debtceiling'],
]

// Applied per-token after splitting (verb forms + synonyms → canonical root)
const WORD_SUBS: Record<string, string> = {
  // Rate / policy actions
  'raises':  'hike', 'raised':      'hike', 'hikes':       'hike', 'hiked':      'hike',
  'lifts':   'hike', 'lifted':      'hike',
  'cuts':    'cut',  'lowers':      'cut',  'lowered':     'cut',  'reduces':    'cut',
  'reduced': 'cut',  'slashes':     'cut',  'slashed':     'cut',  'trims':      'cut',  'trimmed': 'cut',
  'holds':   'hold', 'paused':      'pause','pauses':      'pause',
  // Rate terms
  'rates':   'rate', 'bps':         'basispoints',
  // Orgs
  'fomc':    'fed',
  // Commodities
  'crude':   'oil',  'brent':       'oil',  'wti':         'oil',
  'bullion': 'gold',
  // Equities / reporting
  'equities':'stocks','equity':     'stocks',
  'reports': 'report','posts':      'report','reported':   'report',
  'profit':  'earnings','profits':  'earnings','revenue':  'earnings',
  // Conflict / geopolitical
  'attacks': 'attack','attacked':   'attack',
  'sanctions':'sanction','sanctioned':'sanction',
  'tariffs': 'tariff',
  'invaded': 'invasion','invades':  'invasion',
  'negotiations':'talks','negotiation':'talks',
  'collapses':'fail','collapsed':   'fail',  'collapse':   'fail',
  'break':   'fail', 'breaks':     'fail',  'breakdown':  'fail',
}

// ─── Similarity helpers ───────────────────────────────────────────────────

function getSignificantWords(headline: string): Set<string> {
  let text = headline.toLowerCase()
  for (const [pattern, replacement] of PHRASE_SUBS) {
    text = text.replace(pattern, replacement)
  }
  const words = text
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .map(w => WORD_SUBS[w] ?? w)
  return new Set(words)
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
  return jaccardSimilarity(wordsA, wordsB) >= 0.33
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
