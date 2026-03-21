import type { NewsArticle }                   from '@/lib/utils/types'
import { getSignificantWords, STOP_WORDS }     from '@/lib/utils/news-clustering'

// ─── Types ────────────────────────────────────────────────────────────────

export interface TrendingKeyword {
  keyword:        string
  currentCount:   number       // mentions in last 6 hours
  baselineCount:  number       // average mentions per 6-hour window in prior 24h
  spike:          number       // ratio: currentCount / baselineAvg
  severity:       'HIGH' | 'MED' | 'LOW'
  sources:        string[]     // unique sources mentioning this keyword recently
  sampleHeadline: string       // most recent headline containing this keyword
  firstSeen:      number       // timestamp of earliest recent mention
}

export interface TrendingPayload {
  keywords:    TrendingKeyword[]
  generatedAt: number
}

// ─── Constants ────────────────────────────────────────────────────────────

const WINDOW_MS   = 6  * 60 * 60 * 1_000   // 6-hour recent window
const BASELINE_MS = 24 * 60 * 60 * 1_000   // 24-hour lookback period

// Number of 6-hour windows in the baseline period (18 hours of baseline = 3 windows)
const BASELINE_WINDOWS = (BASELINE_MS - WINDOW_MS) / WINDOW_MS  // = 3

// Words that are structurally always present in financial news.
// A spike in these tells us nothing — filter them even if STOP_WORDS doesn't.
const ALWAYS_COMMON = new Set([
  'market', 'markets', 'stock', 'stocks', 'price', 'prices', 'share', 'shares',
  'company', 'companies', 'report', 'reports', 'year', 'years', 'billion', 'million',
  'percent', 'quarter', 'growth', 'profit', 'revenue', 'analyst', 'investors',
  'trading', 'trade', 'deal', 'global', 'world', 'today', 'week', 'month',
  'financial', 'economy', 'economic', 'business', 'industry', 'sector',
  'data', 'plan', 'expected', 'according', 'major', 'latest', 'first',
  'high', 'low', 'rise', 'fall', 'gain', 'loss', 'drop', 'surge', 'hit',
  'news', 'update', 'amid', 'following', 'despite', 'ahead',
  // Geographic / directional — appear in "South Korea", "North Sea", etc.
  'north', 'south', 'east', 'west', 'central', 'northern', 'southern', 'eastern', 'western',
  // Overly generic modifiers
  'former', 'current', 'next', 'back', 'end', 'top', 'key', 'big',
  'government', 'official', 'officials',
])

// ─── Helpers ──────────────────────────────────────────────────────────────

// Extract unigrams + meaningful bigrams from a single headline
function extractTerms(headline: string): string[] {
  const unigrams = [...getSignificantWords(headline)].filter(w => !ALWAYS_COMMON.has(w))

  // Build bigrams from non-stop, non-common words only
  const words = headline
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w) && !ALWAYS_COMMON.has(w))

  const bigrams: string[] = []
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`)
  }

  return [...unigrams, ...bigrams]
}

// Jaccard similarity between two word sets
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  const intersection = [...a].filter(w => b.has(w)).length
  const union = new Set([...a, ...b]).size
  return intersection / union
}

// ─── Story deduplication ──────────────────────────────────────────────────
//
// Many trending terms come from the same story (e.g. "elon", "musk",
// "twitter", "jury", "elon musk", "jury finds" all from one headline cluster).
// Group keywords whose sample headlines are similar (Jaccard ≥ 0.25), then
// keep only the most representative term per story group.

function deduplicateByStory(keywords: TrendingKeyword[]): TrendingKeyword[] {
  const assigned = new Set<number>()
  const result: TrendingKeyword[] = []

  for (let i = 0; i < keywords.length; i++) {
    if (assigned.has(i)) continue

    const wordsI = getSignificantWords(keywords[i].sampleHeadline)
    const group  = [i]

    for (let j = i + 1; j < keywords.length; j++) {
      if (assigned.has(j)) continue
      const wordsJ = getSignificantWords(keywords[j].sampleHeadline)
      if (jaccard(wordsI, wordsJ) >= 0.25) {
        group.push(j)
        assigned.add(j)
      }
    }
    assigned.add(i)

    const groupKws = group.map(idx => keywords[idx])

    // Merge all sources across the story group
    const allSources = [...new Set(groupKws.flatMap(k => k.sources))]

    // Pick best representative: prefer bigrams first, then highest spike
    const rep = [...groupKws].sort((a, b) => {
      const aBig = a.keyword.includes(' ') ? 1 : 0
      const bBig = b.keyword.includes(' ') ? 1 : 0
      if (bBig !== aBig) return bBig - aBig
      return b.spike - a.spike
    })[0]

    // Recalculate severity with merged source count
    const spike = rep.spike
    let severity: TrendingKeyword['severity'] = 'LOW'
    if      (spike >= 5 && allSources.length >= 4) severity = 'HIGH'
    else if (spike >= 3 || allSources.length >= 3) severity = 'MED'

    result.push({
      ...rep,
      sources:  allSources,
      severity,
    })
  }

  // Re-sort by spike after deduplication
  return result.sort((a, b) => b.spike - a.spike || b.sources.length - a.sources.length)
}

// ─── Core function ────────────────────────────────────────────────────────

interface TermData {
  count:     number
  sources:   Set<string>
  headline:  string   // most recent headline (updated as we scan newest-first)
  firstSeen: number
}

export function detectTrending(articles: NewsArticle[]): TrendingPayload {
  const now            = Date.now()
  const recentCutoff   = now - WINDOW_MS
  const baselineCutoff = now - BASELINE_MS

  const recent   = articles.filter(a => a.publishedAt >= recentCutoff)
  const baseline = articles.filter(a => a.publishedAt >= baselineCutoff && a.publishedAt < recentCutoff)

  // ── Count recent term frequency ──────────────────────────────────────────
  const recentCounts = new Map<string, TermData>()

  // Sort newest-first so the first headline we store is the most recent
  const recentSorted = [...recent].sort((a, b) => b.publishedAt - a.publishedAt)

  for (const article of recentSorted) {
    for (const term of extractTerms(article.headline)) {
      const existing = recentCounts.get(term)
      if (existing) {
        existing.count++
        existing.sources.add(article.source)
        if (article.publishedAt < existing.firstSeen) existing.firstSeen = article.publishedAt
      } else {
        recentCounts.set(term, {
          count:     1,
          sources:   new Set([article.source]),
          headline:  article.headline,
          firstSeen: article.publishedAt,
        })
      }
    }
  }

  // ── Count baseline term frequency ────────────────────────────────────────
  const baselineCounts = new Map<string, number>()
  for (const article of baseline) {
    for (const term of extractTerms(article.headline)) {
      baselineCounts.set(term, (baselineCounts.get(term) ?? 0) + 1)
    }
  }

  // ── Detect spikes ────────────────────────────────────────────────────────
  const trending: TrendingKeyword[] = []

  for (const [term, data] of recentCounts) {
    // Minimum signal quality: ≥3 mentions from ≥2 distinct sources
    if (data.count < 3)        continue
    if (data.sources.size < 2) continue

    const baselineTotal = baselineCounts.get(term) ?? 0
    const baselineAvg   = baselineTotal / BASELINE_WINDOWS

    const spike = baselineAvg > 0
      ? data.count / baselineAvg
      : data.count * 3  // novel term — no prior baseline

    // Filter: spike must be at least 2× above the per-window baseline
    if (baselineAvg > 0 && spike < 2.0) continue

    let severity: TrendingKeyword['severity'] = 'LOW'
    if      (spike >= 5 && data.sources.size >= 4) severity = 'HIGH'
    else if (spike >= 3 || data.sources.size >= 3) severity = 'MED'

    trending.push({
      keyword:        term,
      currentCount:   data.count,
      baselineCount:  Math.round(baselineAvg * 10) / 10,
      spike:          Math.round(spike * 10) / 10,
      severity,
      sources:        [...data.sources],
      sampleHeadline: data.headline,
      firstSeen:      data.firstSeen,
    })
  }

  // Sort by spike ratio, then deduplicate to one entry per story
  trending.sort((a, b) => b.spike - a.spike || b.sources.length - a.sources.length)
  const deduped = deduplicateByStory(trending)

  return {
    keywords:    deduped.slice(0, 12),
    generatedAt: now,
  }
}
