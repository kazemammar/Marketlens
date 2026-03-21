import type { NewsCluster } from '@/lib/utils/news-clustering'
import { getEntity }        from '@/lib/utils/entity-registry'

// ─── Types ────────────────────────────────────────────────────────────────

export interface MoveExplanation {
  type:        'explained' | 'silent_divergence'
  headline:    string | null
  source:      string | null
  sourceCount: number
  confidence:  number
  matchType:   'name' | 'keyword' | 'none'
}

// ─── Core function ────────────────────────────────────────────────────────

const TWELVE_HOURS = 12 * 60 * 60 * 1_000

export function explainMove(
  symbol:        string,
  changePercent: number,
  clusters:      NewsCluster[],
): MoveExplanation {
  const entity = getEntity(symbol)
  if (!entity || clusters.length === 0) {
    return { type: 'silent_divergence', headline: null, source: null, sourceCount: 0, confidence: 0, matchType: 'none' }
  }

  const cutoff = Date.now() - TWELVE_HOURS
  const recent = clusters.filter(c => c.latestAt > cutoff)

  // Direction hint — used to prefer clusters with matching sentiment keywords
  const isDown = changePercent < 0

  let best: { cluster: NewsCluster; confidence: number; matchType: 'name' | 'keyword' } | null = null

  for (const cluster of recent) {
    const text = `${cluster.headline} ${cluster.summary}`.toLowerCase()
    let confidence = 0
    let matchType: 'name' | 'keyword' = 'keyword'

    // ── Name match (highest confidence) ──
    if (text.includes(entity.name.toLowerCase())) {
      confidence = 95
      matchType  = 'name'
    }
    // ── Ticker symbol match ──
    else if (entity.id.length > 2 && text.includes(entity.id.toLowerCase())) {
      confidence = 90
      matchType  = 'name'
    }
    // ── Search term matches ──
    else {
      const matched = entity.searchTerms.filter(t => text.includes(t.toLowerCase()))
      if (matched.length >= 2) {
        confidence = 75
        matchType  = 'keyword'
      } else if (matched.length === 1) {
        // Only surface single-term matches for specific (long) terms
        confidence = matched[0].length > 6 ? 70 : 50
        matchType  = 'keyword'
      }
    }

    if (confidence === 0) continue

    // ── Multi-source confirmation boost ──
    if (cluster.sourceCount > 1) {
      confidence = Math.min(98, confidence + cluster.sourceCount * 2)
    }

    // ── HIGH-severity cluster boost ──
    if (cluster.severity === 'HIGH') {
      confidence = Math.min(98, confidence + 5)
    }

    // ── Direction alignment boost — prefer clusters whose text matches move direction ──
    const headlineLower = cluster.headline.toLowerCase()
    const downWords = ['fall', 'drop', 'decline', 'loss', 'cut', 'miss', 'warn', 'slump', 'crash', 'plunge', 'tariff', 'fine', 'lawsuit', 'sanction', 'ban']
    const upWords   = ['rise', 'gain', 'beat', 'record', 'rally', 'surge', 'upgrade', 'profit', 'growth', 'expand', 'contract', 'deal', 'launch', 'approve']
    const matchesDirection = isDown
      ? downWords.some(w => headlineLower.includes(w))
      : upWords.some(w => headlineLower.includes(w))
    if (matchesDirection) {
      confidence = Math.min(98, confidence + 3)
    }

    if (confidence > (best?.confidence ?? 0)) {
      best = { cluster, confidence, matchType }
    }
  }

  // Threshold: ≥55 to call it "explained"
  if (best && best.confidence >= 55) {
    return {
      type:        'explained',
      headline:    best.cluster.headline,
      source:      best.cluster.source,
      sourceCount: best.cluster.sourceCount,
      confidence:  best.confidence,
      matchType:   best.matchType,
    }
  }

  return {
    type:        'silent_divergence',
    headline:    null,
    source:      null,
    sourceCount: 0,
    confidence:  0,
    matchType:   'none',
  }
}
