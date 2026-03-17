/**
 * Shared "X min ago" utilities used by all warroom dashboard widgets.
 * Matches the style established in RiskGauge.
 */

export function timeAgo(updatedAt: number): string {
  const m = Math.floor((Date.now() - updatedAt) / 60_000)
  if (m < 1)  return 'just now'
  if (m === 1) return '1m ago'
  return `${m}m ago`
}

export function stalenessColor(updatedAt: number): string {
  const m = Math.floor((Date.now() - updatedAt) / 60_000)
  if (m < 5)  return 'var(--price-up)'
  if (m < 15) return 'var(--warning)'
  return 'var(--price-down)'
}
