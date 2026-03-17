'use client'

import type { PortfolioPosition } from '@/lib/hooks/usePortfolio'

interface QuoteData {
  price:         number
  change:        number
  changePercent: number
}

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtCurrency(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${fmt(n / 1_000_000_000, 2)}B`
  if (Math.abs(n) >= 1_000_000)     return `$${fmt(n / 1_000_000, 2)}M`
  if (Math.abs(n) >= 1_000)         return `$${fmt(n / 1_000, 1)}K`
  return `$${fmt(n)}`
}

export default function PortfolioSummary({
  positions,
  quotes,
}: {
  positions: PortfolioPosition[]
  quotes:    Record<string, QuoteData>
}) {
  const total = positions.length
  const longs  = positions.filter((p) => p.direction === 'long').length
  const shorts = positions.filter((p) => p.direction === 'short').length

  // Positions with full cost data
  const tracked = positions.filter(
    (p) => p.quantity != null && p.avg_cost != null && quotes[p.symbol]
  )

  if (tracked.length === 0) {
    return (
      <div className="flex h-10 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-3 sm:px-4 overflow-x-auto scrollbar-hide">
        <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
          {total} position{total !== 1 ? 's' : ''} · {longs} long, {shorts} short
        </span>
        {total > 0 && (
          <>
            <span className="shrink-0 h-3 w-px bg-[var(--border)]" />
            <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)] opacity-60">
              Add cost basis for P&amp;L tracking
            </span>
          </>
        )}
      </div>
    )
  }

  // Calculate totals for tracked positions
  let totalValue   = 0
  let totalCost    = 0
  let todayPnl     = 0

  for (const p of tracked) {
    const q   = quotes[p.symbol]
    const qty = p.quantity!
    const avg = p.avg_cost!

    const marketValue = qty * q.price
    const costBasis   = qty * avg

    totalValue += marketValue
    totalCost  += costBasis

    // Today's change: for longs, positive when price up; for shorts, flip
    const todayChange = qty * q.change
    todayPnl += p.direction === 'long' ? todayChange : -todayChange
  }

  const allTimePnl     = totalValue - totalCost
  const allTimePnlPct  = totalCost > 0 ? (allTimePnl / totalCost) * 100 : 0
  const todayPnlPct    = totalCost > 0 ? (todayPnl / totalCost) * 100 : 0

  const todayColor    = todayPnl >= 0    ? 'var(--price-up)' : 'var(--price-down)'
  const allTimeColor  = allTimePnl >= 0  ? 'var(--price-up)' : 'var(--price-down)'

  const partial = tracked.length < total

  return (
    <div
      className="flex h-10 items-center gap-3 border-b border-[var(--border)] px-3 sm:px-4 overflow-x-auto scrollbar-hide transition-colors"
      style={{
        background: todayPnl >= 0
          ? 'rgba(var(--price-up-rgb, 34, 197, 94), 0.04)'
          : 'rgba(var(--price-down-rgb, 239, 68, 68), 0.04)',
      }}
    >
      {/* Total value */}
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Value</span>
        <span className="font-mono text-[11px] font-semibold text-[var(--text)]">{fmtCurrency(totalValue)}</span>
      </div>

      <span className="shrink-0 h-3 w-px bg-[var(--border)]" />

      {/* Today P&L */}
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Today</span>
        <span className="font-mono text-[11px] font-semibold tabular-nums" style={{ color: todayColor }}>
          {todayPnl >= 0 ? '+' : ''}{fmtCurrency(todayPnl)} ({todayPnl >= 0 ? '+' : ''}{fmt(todayPnlPct)}%)
        </span>
      </div>

      <span className="shrink-0 h-3 w-px bg-[var(--border)]" />

      {/* All-time P&L */}
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-wide text-[var(--text-muted)]">All-Time</span>
        <span className="font-mono text-[11px] font-semibold tabular-nums" style={{ color: allTimeColor }}>
          {allTimePnl >= 0 ? '+' : ''}{fmtCurrency(allTimePnl)} ({allTimePnl >= 0 ? '+' : ''}{fmt(allTimePnlPct)}%)
        </span>
      </div>

      {partial && (
        <>
          <span className="shrink-0 h-3 w-px bg-[var(--border)]" />
          <span className="shrink-0 font-mono text-[9px] text-[var(--text-muted)] opacity-60">
            tracking {tracked.length}/{total}
          </span>
        </>
      )}
    </div>
  )
}
