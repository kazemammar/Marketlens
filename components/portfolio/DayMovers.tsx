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

// ─── Column header ────────────────────────────────────────────────────────

function ColHeader({ isWinner }: { isWinner: boolean }) {
  const color    = isWinner ? '#22c55e' : '#ef4444'
  const label    = isWinner ? 'Winners' : 'Losers'
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
        className="font-mono text-[9px] font-semibold uppercase tracking-wide"
        style={{ color, textShadow: `0 0 8px ${color}60` }}
      >
        {label}
      </span>
    </div>
  )
}

// ─── Mover card ───────────────────────────────────────────────────────────

function MoverCard({
  symbol, type, direction, changePercent, isWinner, delay,
}: {
  symbol:        string
  type:          string
  direction:     'long' | 'short'
  changePercent: number
  isWinner:      boolean
  delay:         number
}) {
  const colorHex = isWinner ? '#22c55e' : '#ef4444'
  const barPct   = Math.min(Math.abs(changePercent) / 5, 1) * 100

  return (
    <div
      className="animate-fade-up mx-2 mb-1.5 overflow-hidden rounded-md transition-colors duration-150 hover:bg-[var(--surface-2)]"
      style={{
        borderLeft:         `2px solid ${colorHex}90`,
        background:         `linear-gradient(to right, ${colorHex}08, transparent 70%)`,
        animationDelay:     `${delay}ms`,
        animationFillMode:  'both',
      }}
    >
      <div className="flex items-center gap-1.5 px-2 pt-1.5 pb-0.5">
        <Link
          href={`/asset/${type}/${encodeURIComponent(symbol)}`}
          className="font-mono text-[11px] font-bold hover:underline"
          style={{ color: 'var(--accent)' }}
        >
          {symbol}
        </Link>
        <span className={`rounded px-1 py-px font-mono text-[8px] font-bold ${
          direction === 'long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {direction === 'long' ? '▲ L' : '▼ S'}
        </span>
        <span
          className="ml-auto font-mono text-[11px] font-bold tabular-nums"
          style={{ color: colorHex, textShadow: `0 0 10px ${colorHex}50` }}
        >
          {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
        </span>
      </div>
      {/* P&L bar */}
      <div className="mx-2 mb-1.5 h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width:      `${barPct}%`,
            background: `linear-gradient(to right, ${colorHex}80, ${colorHex})`,
            boxShadow:  `0 0 6px ${colorHex}50`,
          }}
        />
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
      return { symbol: p.symbol, type: p.asset_type, direction: p.direction, changePercent: q.changePercent, impact, isWinner }
    })

  const winners      = movers.filter((m) => m.isWinner).sort((a, b) => b.impact - a.impact).slice(0, 5)
  const losers       = movers.filter((m) => !m.isWinner).sort((a, b) => a.impact - b.impact).slice(0, 5)
  const hasMoverData = movers.length > 0

  return (
    <>
      <PanelHeader />
      <div className="flex-1 overflow-y-auto">
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
            <div className="flex flex-col">
              <ColHeader isWinner={true} />
              {winners.length === 0 ? (
                <div className="flex flex-1 items-center justify-center px-3 py-4">
                  <p className="font-mono text-[10px] text-[var(--text-muted)] opacity-50 text-center">None today</p>
                </div>
              ) : (
                <div className="pt-1.5">
                  {winners.map((m, i) => <MoverCard key={m.symbol} {...m} delay={i * 50} />)}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <ColHeader isWinner={false} />
              {losers.length === 0 ? (
                <div className="flex flex-1 items-center justify-center px-3 py-4">
                  <p className="font-mono text-[10px] text-[var(--text-muted)] opacity-50 text-center">None today</p>
                </div>
              ) : (
                <div className="pt-1.5">
                  {losers.map((m, i) => <MoverCard key={m.symbol} {...m} delay={i * 50} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
