'use client'

import Link from 'next/link'
import type { PortfolioPosition } from '@/lib/hooks/usePortfolio'
import type { QuoteData }         from './PositionsTable'

// ─── Helpers ──────────────────────────────────────────────────────────────

function fmtPrice(price: number, type: string): string {
  if (type === 'forex') return price.toFixed(4)
  if (price < 1)        return `$${price.toFixed(4)}`
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtPnl(pnl: number): string {
  const abs  = Math.abs(pnl)
  const sign = pnl >= 0 ? '+' : '−'
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(2)}`
}

// ─── Panel header ─────────────────────────────────────────────────────────

function PanelHeader() {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
        <polyline points="1,12 5,7 8,9 11,4 15,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
        Day&apos;s Movers
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
    </div>
  )
}

// ─── Column header ────────────────────────────────────────────────────────

function ColHeader({ isWinner }: { isWinner: boolean }) {
  const color = isWinner ? '#22c55e' : '#ef4444'
  const label = isWinner ? 'Winners' : 'Losers'
  return (
    <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-1.5">
      <svg viewBox="0 0 10 10" fill="none" className="h-2.5 w-2.5 shrink-0" aria-hidden>
        {isWinner ? (
          <polyline points="1,7 4,3 7,5 9,1" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        ) : (
          <polyline points="1,2 4,6 7,4 9,8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        )}
      </svg>
      <span
        className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em]"
        style={{ color, textShadow: `0 0 8px ${color}60` }}
      >
        {isWinner ? '▲' : '▼'} {label}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
    </div>
  )
}

// ─── Empty column states ──────────────────────────────────────────────────

function EmptyWinners() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-3 py-4">
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" style={{ color: '#ef4444', opacity: 0.35 }} aria-hidden>
        <polyline points="1,5 5,9 8,7 11,10 15,6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <p className="font-mono text-[11px] text-[var(--text-muted)] opacity-50 text-center">None today</p>
    </div>
  )
}

function EmptyLosers() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-3 py-4">
      <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" style={{ color: '#22c55e' }} aria-hidden>
        <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <p
        className="font-mono text-[9px] font-semibold text-center"
        style={{ color: '#22c55e', textShadow: '0 0 10px #22c55e40' }}
      >
        Clean sweep!
      </p>
      <p className="font-mono text-[8px] text-[var(--text-muted)] opacity-40 text-center">No losers today</p>
    </div>
  )
}

// ─── Mover card ───────────────────────────────────────────────────────────

function MoverCard({
  symbol, type, direction, changePercent, price, quantity, avgCost, isWinner, delay, rank,
}: {
  symbol:        string
  type:          string
  direction:     'long' | 'short'
  changePercent: number
  price:         number
  quantity:      number | null
  avgCost:       number | null
  isWinner:      boolean
  delay:         number
  rank:          number
}) {
  const colorHex = isWinner ? '#22c55e' : '#ef4444'
  const barPct   = Math.min(Math.abs(changePercent) / 5, 1) * 100

  // P&L dollar if cost basis is available
  let pnlDollar: number | null = null
  if (quantity != null && avgCost != null && quantity > 0) {
    pnlDollar = direction === 'long'
      ? quantity * (price - avgCost)
      : quantity * (avgCost - price)
  }

  return (
    <div
      className="animate-fade-up mx-2 mb-1.5 overflow-hidden rounded border border-[var(--border)] cursor-default bg-[var(--surface-2)] transition-colors duration-150"
      style={{
        borderLeft:        `1.5px solid ${colorHex}55`,
        animationDelay:    `${delay}ms`,
        animationFillMode: 'both',
      }}
    >
      {/* Top row: rank + symbol + direction pill + price + change% */}
      <div className="flex items-center gap-1.5 px-2 pt-2 pb-0.5">
        {/* Rank */}
        <span className="w-4 shrink-0 text-right font-mono text-[10px] tabular-nums text-[var(--text-muted)] opacity-35">
          {rank}
        </span>

        <Link
          href={`/asset/${type}/${encodeURIComponent(symbol)}`}
          className="font-mono text-[12px] font-bold hover:underline shrink-0"
          style={{ color: colorHex }}
          onClick={(e) => e.stopPropagation()}
        >
          {symbol}
        </Link>

        {/* Direction pill */}
        <span className={`shrink-0 rounded px-1 py-px font-mono text-[8px] font-bold ${
          direction === 'long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {direction === 'long' ? '▲ L' : '▼ S'}
        </span>

        {/* Current price */}
        <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-[var(--text)] opacity-75">
          {fmtPrice(price, type)}
        </span>

        {/* Change % */}
        <span
          className="ml-auto shrink-0 font-mono text-[12px] font-bold tabular-nums"
          style={{ color: colorHex }}
        >
          {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
        </span>
      </div>

      {/* Bar + P&L dollar */}
      <div className="mx-2 mb-1.5 flex items-center gap-2">
        <div className="h-1 flex-1 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${barPct}%`, background: colorHex, opacity: 0.55 }}
          />
        </div>
        {pnlDollar != null && (
          <span
            className="shrink-0 font-mono text-[9px] tabular-nums text-[var(--text-muted)] opacity-50"
          >
            {fmtPnl(pnlDollar)}
          </span>
        )}
      </div>
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
  const movers = positions
    .filter((p) => quotes[p.symbol] != null)
    .map((p) => {
      const q        = quotes[p.symbol]
      const priceUp  = q.changePercent >= 0
      const isWinner = (p.direction === 'long' && priceUp) || (p.direction === 'short' && !priceUp)
      const impact   = p.direction === 'long' ? q.changePercent : -q.changePercent
      return {
        symbol:        p.symbol,
        type:          p.asset_type,
        direction:     p.direction,
        changePercent: q.changePercent,
        price:         q.price,
        quantity:      p.quantity,
        avgCost:       p.avg_cost,
        impact,
        isWinner,
      }
    })

  const winners      = movers.filter((m) => m.isWinner).sort((a, b) => b.impact - a.impact).slice(0, 5)
  const losers       = movers.filter((m) => !m.isWinner).sort((a, b) => a.impact - b.impact).slice(0, 5)
  const hasMoverData = movers.length > 0

  return (
    <>
      <PanelHeader />
      <div className="overflow-y-auto scrollbar-hide">
        {!hasMoverData ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 py-6">
            <div className="relative flex h-10 w-10 items-center justify-center">
              <div
                className="absolute h-10 w-10 rounded-full animate-ping"
                style={{ background: 'var(--accent)', opacity: 0.12 }}
              />
              <svg viewBox="0 0 16 16" fill="none" className="h-5 w-5" style={{ color: 'var(--accent)', opacity: 0.4 }} aria-hidden>
                <polyline points="1,12 5,7 8,9 11,4 15,2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="font-mono text-[11px] text-[var(--text-muted)] text-center">
              {positions.length < 2 ? 'Add more positions to see movers' : 'Loading price data…'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-[var(--border)] h-full">
            {/* Winners column */}
            <div className="flex flex-col">
              <ColHeader isWinner={true} />
              {winners.length === 0 ? (
                <EmptyWinners />
              ) : (
                <div className="pt-1.5">
                  {winners.map((m, i) => (
                    <MoverCard key={m.symbol} {...m} rank={i + 1} delay={i * 50} />
                  ))}
                </div>
              )}
            </div>

            {/* Losers column */}
            <div className="flex flex-col">
              <ColHeader isWinner={false} />
              {losers.length === 0 ? (
                <EmptyLosers />
              ) : (
                <div className="pt-1.5">
                  {losers.map((m, i) => (
                    <MoverCard key={m.symbol} {...m} rank={i + 1} delay={i * 50} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
