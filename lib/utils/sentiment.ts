// Shared sentiment word lists and scoring — single source of truth

export const POSITIVE_WORDS = [
  'rally', 'surge', 'beat', 'growth', 'gain', 'soar', 'jump', 'rise',
  'record', 'upgrade', 'outperform', 'bullish', 'strong',
]

export const NEGATIVE_WORDS = [
  'war', 'crash', 'fall', 'cut', 'decline', 'drop', 'plunge', 'miss',
  'downgrade', 'weak', 'bearish', 'layoff', 'recall', 'slump', 'loss',
]

/** Returns raw sentiment delta for a headline (positive = bullish, negative = bearish). */
export function scoreSentiment(headline: string): number {
  const lower = headline.toLowerCase()
  let score = 0
  for (const w of POSITIVE_WORDS) {
    if (lower.includes(w)) score += 1
  }
  for (const w of NEGATIVE_WORDS) {
    if (lower.includes(w)) score -= 1
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
