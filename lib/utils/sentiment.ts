// Shared sentiment word lists and scoring — single source of truth

export const POSITIVE_WORDS = [
  'rally', 'surge', 'beat', 'growth', 'gain', 'soar', 'jump', 'rise',
  'record', 'upgrade', 'outperform', 'bullish', 'strong',
]

export const NEGATIVE_WORDS = [
  'war', 'crash', 'fall', 'cut', 'decline', 'drop', 'plunge', 'miss',
  'downgrade', 'weak', 'bearish', 'layoff', 'recall', 'slump', 'loss',
]

// Pre-compiled word-boundary regexes — avoids false positives like
// "gain" matching inside "against" or "miss" matching inside "commission".
const POS_RE = POSITIVE_WORDS.map(w => new RegExp(`\\b${w}`, 'i'))
const NEG_RE = NEGATIVE_WORDS.map(w => new RegExp(`\\b${w}`, 'i'))

/** Returns raw sentiment delta for a headline (positive = bullish, negative = bearish). */
export function scoreSentiment(headline: string): number {
  let score = 0
  for (const re of POS_RE) {
    if (re.test(headline)) score += 1
  }
  for (const re of NEG_RE) {
    if (re.test(headline)) score -= 1
  }
  return score
}

/** Classifies a headline as positive, negative, or neutral based on keyword hits. */
export function classifySentiment(headline: string): 'positive' | 'negative' | 'neutral' {
  const score = scoreSentiment(headline)
  if (score > 0) return 'positive'
  if (score < 0) return 'negative'
  return 'neutral'
}
