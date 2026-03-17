'use client'

import Link from 'next/link'
import type { PortfolioPosition } from '@/lib/hooks/usePortfolio'
import type { QuoteData }         from './PositionsTable'

// ─── Panel header ─────────────────────────────────────────────────────────

function PanelHeader() {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
        <polyline points="1,12 5,7 8,9 11,4 15,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="font-mono font-bold uppercase tracking-[0.14em] text-[var(--text)]" style={{ fontSize: '9px' }}>
        Day&apos;s Movers
      </span>
    </div>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────

function MoverRow({
  symbol, type, direction, changePercent, isWinner,
}: {
  symbol:        string
  type:          string
  direction:     'long' | 'short'
  changePercent: number
  isWinner:      boolean
}) {
  const color = isWinner ? 'var(--price-up)' : 'var(--price-down)'
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-[var(--border)] last:border-0 px-3">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <Link
        href={`/asset/${type}/${encodeURIComponent(symbol)}`}
        className="font-mono text-[11px] font-bold text-[var(--accent)] hover:underline min-w-[40px]"
      >
        {symbol}
      </Link>
      <span className={`rounded px-1 py-px font-mono text-[8px] font-semibold ${
        direction === 'long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
      }`}>
        {direction === 'long' ? 'L' : 'S'}
      </span>
      <span className="ml-auto font-mono text-[11px] tabular-nums font-semibold" style={{ color }}>
        {isWinner ? '+' : ''}{changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
      </span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────

export default function DayMovers({
  positions,
  quotes,
}: {
  positions: PortfolioPosition[]
  quotes:    Record<string, QuoteData>
}) {
  // Build mover list — win/loss flipped for short positions
  const movers = positions
    .filter((p) => quotes[p.symbol] != null)
    .map((p) => {
      const q           = quotes[p.symbol]
      const priceUp     = q.changePercent >= 0
      const isWinner    = (p.direction === 'long' && priceUp) || (p.direction === 'short' && !priceUp)
      // The "portfolio impact" pct: positive = made money, negative = lost money
      const impact      = p.direction === 'long' ? q.changePercent : -q.changePercent
      return { symbol: p.symbol, type: p.asset_type, direction: p.direction, changePercent: q.changePercent, impact, isWinner }
    })

  const winners = movers.filter((m) => m.isWinner).sort((a, b) => b.impact - a.impact).slice(0, 5)
  const losers  = movers.filter((m) => !m.isWinner).sort((a, b) => a.impact - b.impact).slice(0, 5)

  const hasMoverData = movers.length > 0

  return (
    <>
      <PanelHeader />
      <div className="flex-1 overflow-y-auto">
        {!hasMoverData ? (
          <div className="flex h-full items-center justify-center px-4 py-6">
            <p className="font-mono text-[11px] text-[var(--text-muted)] text-center">
              {positions.length < 2
                ? 'Add more positions to see movers'
                : 'Loading price data…'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-[var(--border)] h-full">
            {/* Winners */}
            <div className="flex flex-col">
              <div className="px-3 py-1.5 border-b border-[var(--border)]">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-wide" style={{ color: 'var(--price-up)' }}>
                  Winners
                </span>
              </div>
              {winners.length === 0 ? (
                <div className="flex flex-1 items-center justify-center px-3 py-4">
                  <p className="font-mono text-[10px] text-[var(--text-muted)] opacity-60 text-center">None today</p>
                </div>
              ) : (
                winners.map((m) => (
                  <MoverRow key={m.symbol} {...m} />
                ))
              )}
            </div>

            {/* Losers */}
            <div className="flex flex-col">
              <div className="px-3 py-1.5 border-b border-[var(--border)]">
                <span className="font-mono text-[9px] font-semibold uppercase tracking-wide" style={{ color: 'var(--price-down)' }}>
                  Losers
                </span>
              </div>
              {losers.length === 0 ? (
                <div className="flex flex-1 items-center justify-center px-3 py-4">
                  <p className="font-mono text-[10px] text-[var(--text-muted)] opacity-60 text-center">None today</p>
                </div>
              ) : (
                losers.map((m) => (
                  <MoverRow key={m.symbol} {...m} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
