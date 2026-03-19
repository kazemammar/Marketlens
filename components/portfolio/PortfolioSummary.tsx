'use client'

import type { PortfolioPosition } from '@/lib/hooks/usePortfolio'

interface QuoteData {
  price:         number
  change:        number
  changePercent: number
}

// ─── Formatters ───────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtCurrency(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000_000) return `$${fmt(abs / 1_000_000_000, 2)}B`
  if (abs >= 1_000_000)     return `$${fmt(abs / 1_000_000, 2)}M`
  if (abs >= 1_000)         return `$${fmt(abs / 1_000, 1)}K`
  return `$${fmt(abs)}`
}

function sign(n: number): string {
  return n >= 0 ? '+' : '−'
}

// ─── No-cost-data state ───────────────────────────────────────────────────

function NoCostBar({
  total, longs, shorts,
}: { total: number; longs: number; shorts: number }) {
  return (
    <div
      className="animate-fade-up flex h-10 items-center gap-3 px-3 sm:px-4 overflow-x-auto scrollbar-hide"
      style={{
        borderBottom: '1px solid var(--border)',
        borderLeft:   '3px solid var(--accent)',
        background:   'linear-gradient(135deg, rgba(16,185,129,0.05), rgba(16,185,129,0.01) 60%, transparent)',
      }}
    >
      <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">
        {total} position{total !== 1 ? 's' : ''} · {longs}L&thinsp;/&thinsp;{shorts}S
      </span>

      {total > 0 && (
        <>
          <span className="shrink-0 h-3 w-px bg-[var(--border)]" />
          <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)] opacity-60">
            Add cost basis for P&amp;L tracking →
          </span>
        </>
      )}
    </div>
  )
}

// ─── Spark bars ───────────────────────────────────────────────────────────

function SparkBars({
  movers,
}: {
  movers: Array<{ impact: number; tracked: boolean }>
}) {
  return (
    <div className="hidden sm:flex items-end gap-px h-[24px] shrink-0">
      {movers.slice(0, 10).map((m, i) => {
        const h    = Math.max(3, Math.min(24, Math.abs(m.impact) * 8))
        const win  = m.impact >= 0
        const color = !m.tracked
          ? '#6b7280'
          : win ? '#22c55e' : '#ef4444'
        return (
          <div
            key={i}
            className="w-[4px] rounded-sm shrink-0"
            style={{
              height:     `${h}px`,
              background: color,
              opacity:    m.tracked ? 0.85 : 0.35,
              boxShadow:  m.tracked ? `0 0 4px ${color}60` : 'none',
            }}
          />
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────

export default function PortfolioSummary({
  positions,
  quotes,
}: {
  positions: PortfolioPosition[]
  quotes:    Record<string, QuoteData>
}) {
  const total  = positions.length
  const longs  = positions.filter((p) => p.direction === 'long').length
  const shorts = positions.filter((p) => p.direction === 'short').length

  const tracked = positions.filter(
    (p) => p.quantity != null && p.avg_cost != null && quotes[p.symbol]
  )

  if (tracked.length === 0) {
    return <NoCostBar total={total} longs={longs} shorts={shorts} />
  }

  // ── Compute totals ───────────────────────────────────────────────────
  let totalValue = 0
  let totalCost  = 0
  let todayPnl   = 0

  for (const p of tracked) {
    const q   = quotes[p.symbol]
    const qty = p.quantity!
    const avg = p.avg_cost!

    totalValue += qty * q.price
    totalCost  += qty * avg

    const todayChange = qty * q.change
    todayPnl += p.direction === 'long' ? todayChange : -todayChange
  }

  const allTimePnl    = totalValue - totalCost
  const allTimePnlPct = totalCost > 0 ? (allTimePnl / totalCost) * 100 : 0
  const todayPnlPct   = totalCost > 0 ? (todayPnl / totalCost) * 100 : 0

  const todayColor   = todayPnl >= 0   ? '#22c55e' : '#ef4444'
  const allTimeColor = allTimePnl >= 0 ? '#22c55e' : '#ef4444'
  const partial      = tracked.length < total

  // ── Best / worst performer ───────────────────────────────────────────
  const withQuotes = positions.filter((p) => quotes[p.symbol])
  const moversAll  = withQuotes.map((p) => {
    const q      = quotes[p.symbol]
    const impact = p.direction === 'long' ? q.changePercent : -q.changePercent
    return {
      symbol:  p.symbol,
      impact,
      tracked: p.quantity != null && p.avg_cost != null,
    }
  })

  const sorted  = [...moversAll].sort((a, b) => b.impact - a.impact)
  const best    = sorted[0]
  const worst   = sorted[sorted.length - 1]
  const hasMov  = moversAll.length > 0 && best !== worst

  return (
    <div
      className="animate-fade-up"
      style={{
        borderBottom: '1px solid var(--border)',
        borderLeft:   `3px solid ${todayColor}`,
        background:   todayPnl >= 0
          ? 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02) 60%, transparent)'
          : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02) 60%, transparent)',
      }}
    >
      <div className="px-3 sm:px-4 py-2.5">

        {/* ── Desktop: single flex row ─────────────────────────────────── */}
        <div className="hidden sm:flex items-center gap-0">

          {/* Total value */}
          <div className="flex flex-col shrink-0 pr-4">
            <span className="font-mono text-[8px] uppercase tracking-wide text-[var(--text-muted)] leading-none mb-0.5">Value</span>
            <span
              className="font-mono text-[22px] font-bold tabular-nums text-[var(--text)] leading-none"
              style={{ textShadow: `0 0 20px ${todayColor}40` }}
            >
              {fmtCurrency(totalValue)}
            </span>
          </div>

          <span className="shrink-0 h-8 w-px bg-[var(--border)] mx-4" />

          {/* Today P&L */}
          <div className="flex flex-col shrink-0 pr-4">
            <span className="font-mono text-[8px] uppercase tracking-wide text-[var(--text-muted)] leading-none mb-0.5">Today</span>
            <span
              className="font-mono text-[16px] font-bold tabular-nums leading-none"
              style={{ color: todayColor, textShadow: `0 0 12px ${todayColor}50` }}
            >
              {todayPnl >= 0 ? '▲' : '▼'}&thinsp;{sign(todayPnl)}{fmtCurrency(todayPnl)}&thinsp;({sign(todayPnlPct)}{fmt(Math.abs(todayPnlPct))}%)
            </span>
          </div>

          <span className="shrink-0 h-8 w-px bg-[var(--border)] mx-4" />

          {/* All-time P&L */}
          <div className="flex flex-col shrink-0 pr-4">
            <span className="font-mono text-[8px] uppercase tracking-wide text-[var(--text-muted)] leading-none mb-0.5">All-Time</span>
            <span
              className="font-mono text-[14px] font-bold tabular-nums leading-none"
              style={{ color: allTimeColor, textShadow: `0 0 12px ${allTimeColor}40` }}
            >
              {allTimePnl >= 0 ? '▲' : '▼'}&thinsp;{sign(allTimePnl)}{fmtCurrency(allTimePnl)}&thinsp;({sign(allTimePnlPct)}{fmt(Math.abs(allTimePnlPct))}%)
            </span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Secondary: best/worst + tracking + spark */}
          <div className="flex items-center gap-3 shrink-0">

            {hasMov && (
              <div className="flex items-center gap-3">
                {/* Best */}
                <div className="group relative flex items-center gap-1.5 cursor-default">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: '#22c55e', boxShadow: '0 0 4px #22c55e80' }} />
                  <span className="font-mono text-[12px] font-semibold tabular-nums" style={{ color: '#22c55e', textShadow: '0 0 10px #22c55e40' }}>
                    ↑&thinsp;{best.symbol}&thinsp;{best.impact >= 0 ? '+' : ''}{fmt(best.impact)}%
                  </span>
                  <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--surface-2)] border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)] opacity-0 transition-opacity duration-100 group-hover:opacity-100 z-50">
                    Best performer today
                  </div>
                </div>
                {/* Worst */}
                <div className="group relative flex items-center gap-1.5 cursor-default">
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: '#ef4444', boxShadow: '0 0 4px #ef444480' }} />
                  <span className="font-mono text-[12px] font-semibold tabular-nums" style={{ color: '#ef4444', textShadow: '0 0 10px #ef444430' }}>
                    ↓&thinsp;{worst.symbol}&thinsp;{worst.impact >= 0 ? '+' : ''}{fmt(worst.impact)}%
                  </span>
                  <div className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--surface-2)] border border-[var(--border)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-muted)] opacity-0 transition-opacity duration-100 group-hover:opacity-100 z-50">
                    Worst performer today
                  </div>
                </div>
              </div>
            )}

            {partial && (
              <>
                <span className="h-4 w-px bg-[var(--border)]" />
                <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-50">
                  tracking {tracked.length}/{total}
                </span>
              </>
            )}

            {moversAll.length > 0 && (
              <>
                <span className="h-4 w-px bg-[var(--border)]" />
                <SparkBars movers={moversAll} />
              </>
            )}
          </div>
        </div>

        {/* ── Mobile: stacked ──────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-1 overflow-hidden sm:hidden">

          {/* Row 1: value */}
          <span
            className="font-mono text-[20px] font-bold tabular-nums text-[var(--text)] leading-none"
            style={{ textShadow: `0 0 16px ${todayColor}40` }}
          >
            {fmtCurrency(totalValue)}
          </span>

          {/* Row 2: today + all-time */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-[8px] uppercase tracking-wide text-[var(--text-muted)]">Today</span>
              <span
                className="font-mono text-[13px] font-bold tabular-nums"
                style={{ color: todayColor, textShadow: `0 0 10px ${todayColor}50` }}
              >
                {todayPnl >= 0 ? '▲' : '▼'}&thinsp;{sign(todayPnl)}{fmtCurrency(todayPnl)}&thinsp;({sign(todayPnlPct)}{fmt(Math.abs(todayPnlPct))}%)
              </span>
            </div>
            <span className="h-3 w-px bg-[var(--border)]" />
            <div className="flex items-baseline gap-1">
              <span className="font-mono text-[8px] uppercase tracking-wide text-[var(--text-muted)]">All-Time</span>
              <span
                className="font-mono text-[12px] font-bold tabular-nums"
                style={{ color: allTimeColor }}
              >
                {sign(allTimePnl)}{fmtCurrency(allTimePnl)}&thinsp;({sign(allTimePnlPct)}{fmt(Math.abs(allTimePnlPct))}%)
              </span>
            </div>
          </div>

          {/* Row 3: best/worst */}
          {(hasMov || partial) && (
            <div className="flex items-center gap-2 flex-wrap">
              {hasMov && (
                <>
                  <span className="font-mono text-[11px] font-semibold" style={{ color: '#22c55e' }}>↑&thinsp;{best.symbol}&thinsp;{best.impact >= 0 ? '+' : ''}{fmt(best.impact)}%</span>
                  <span className="font-mono text-[11px] font-semibold" style={{ color: '#ef4444' }}>↓&thinsp;{worst.symbol}&thinsp;{worst.impact >= 0 ? '+' : ''}{fmt(worst.impact)}%</span>
                </>
              )}
              {partial && (
                <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-50">
                  tracking {tracked.length}/{total}
                </span>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
