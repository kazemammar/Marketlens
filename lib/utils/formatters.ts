// ─── Price formatting ─────────────────────────────────────────────────────

/**
 * Format a price with 2 decimal places and a currency symbol.
 * Falls back to USD if no currency is provided.
 */
export function formatPrice(value: number | null | undefined, currency = 'USD'): string {
  if (value == null || isNaN(value)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value)
}

/**
 * Format a raw number as a currency string without symbol (for tables).
 */
export function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return '0.00'
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

// ─── Percentage formatting ────────────────────────────────────────────────

/**
 * Format a decimal fraction as a percentage string, e.g. 0.0512 → "+5.12%"
 * If the value is already a percent (e.g. 5.12), pass asDecimal=false.
 */
export function formatPercent(value: number | null | undefined, asDecimal = true): string {
  if (value == null || isNaN(value)) return '+0.00%'
  const pct = asDecimal ? value * 100 : value
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}

/**
 * Same as formatPercent but without a leading sign.
 */
export function formatPercentAbs(value: number | null | undefined, asDecimal = true): string {
  if (value == null || isNaN(value)) return '0.00%'
  const pct = asDecimal ? value * 100 : value
  return `${Math.abs(pct).toFixed(2)}%`
}

// ─── Large number abbreviation ────────────────────────────────────────────

/**
 * Abbreviate large numbers: 1_200_000 → "1.2M", 450_000_000_000 → "450B".
 */
export function formatCompact(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '0'
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`
  if (abs >= 1e9)  return `${sign}${(abs / 1e9).toFixed(2)}B`
  if (abs >= 1e6)  return `${sign}${(abs / 1e6).toFixed(2)}M`
  if (abs >= 1e3)  return `${sign}${(abs / 1e3).toFixed(2)}K`
  return `${sign}${abs.toFixed(2)}`
}

// ─── Relative time ────────────────────────────────────────────────────────

/**
 * Return a human-readable relative time string from a unix timestamp (ms).
 * e.g. 1_700_000_000_000 → "3 hours ago"
 */
export function formatRelativeTime(timestampMs: number | null | undefined): string {
  if (timestampMs == null || isNaN(timestampMs)) return '—'
  const diffMs  = Date.now() - timestampMs
  const diffSec = Math.floor(diffMs / 1_000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr  = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr  / 24)

  if (diffSec < 60)  return 'just now'
  if (diffMin < 60)  return `${diffMin}m ago`
  if (diffHr  < 24)  return `${diffHr}h ago`
  if (diffDay < 7)   return `${diffDay}d ago`

  return new Date(timestampMs).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  diffDay > 365 ? 'numeric' : undefined,
  })
}

/**
 * Format a unix timestamp (ms) as a short date/time string.
 */
export function formatDateTime(timestampMs: number | null | undefined): string {
  if (timestampMs == null || isNaN(timestampMs)) return '—'
  return new Date(timestampMs).toLocaleString('en-US', {
    month:  'short',
    day:    'numeric',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

// ─── Change helpers ───────────────────────────────────────────────────────

/**
 * Return Tailwind color class based on whether a value is positive/negative.
 */
export function changeColor(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'text-slate-400'
  if (value > 0) return 'text-green-500'
  if (value < 0) return 'text-red-500'
  return 'text-slate-400'
}

/**
 * Format a price change with sign, e.g. +1.23 or -0.45.
 */
export function formatChange(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return '0.00'
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}`
}
