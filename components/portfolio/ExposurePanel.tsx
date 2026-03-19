'use client'

import Link from 'next/link'
import type { PortfolioPosition } from '@/lib/hooks/usePortfolio'
import type { QuoteData }         from './PositionsTable'

// ─── Constants ────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  stock:     '#10b981',
  crypto:    '#8b5cf6',
  forex:     '#38bdf8',
  commodity: '#f59e0b',
  etf:       '#64748b',
}

const TYPE_LABEL: Record<string, string> = {
  stock: 'Stock', crypto: 'Crypto', forex: 'Forex', commodity: 'Cmdty', etf: 'ETF',
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function fmtPrice(price: number, type: string): string {
  if (type === 'forex') return price.toFixed(4)
  if (price < 1)        return `$${price.toFixed(4)}`
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Panel header ─────────────────────────────────────────────────────────

function PanelHeader() {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5"/>
        <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5"/>
        <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
      </svg>
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
        Exposure
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
    </div>
  )
}

// ─── Position mini-card ───────────────────────────────────────────────────

function PositionCard({
  position,
  quote,
}: {
  position:  PortfolioPosition
  quote:     QuoteData | undefined
}) {
  const changePercent = quote?.changePercent ?? 0
  const isUp          = changePercent >= 0
  const changeColor   = isUp ? '#22c55e' : '#ef4444'
  const hasQuote      = quote != null

  return (
    <Link
      href={`/asset/${position.asset_type}/${encodeURIComponent(position.symbol)}`}
      className="flex w-[72px] flex-col gap-0.5 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 transition-colors duration-150 hover:bg-[var(--surface-3,var(--surface-2))]"
      style={{ borderLeft: `2px solid ${changeColor}60` }}
    >
      {/* Symbol + direction arrow */}
      <div className="flex items-center gap-1">
        <span
          className="font-mono text-[9px] font-bold leading-none"
          style={{ color: changeColor }}
        >
          {position.direction === 'long' ? '▲' : '▼'}
        </span>
        <span className="font-mono text-[10px] font-bold leading-none truncate text-[var(--text)]">
          {position.symbol}
        </span>
      </div>

      {/* Current price */}
      {hasQuote && quote.price > 0 && (
        <span className="font-mono text-[9px] tabular-nums leading-none text-[var(--text-muted)]">
          {fmtPrice(quote.price, position.asset_type)}
        </span>
      )}

      {/* Day change % */}
      {hasQuote && (
        <span
          className="font-mono text-[9px] font-bold tabular-nums leading-none"
          style={{ color: changeColor }}
        >
          {isUp ? '+' : ''}{changePercent.toFixed(2)}%
        </span>
      )}
    </Link>
  )
}

// ─── Component ────────────────────────────────────────────────────────────

export default function ExposurePanel({
  positions,
  quotes,
}: {
  positions: PortfolioPosition[]
  quotes:    Record<string, QuoteData>
}) {
  if (positions.length === 0) {
    return (
      <>
        <PanelHeader />
        <div className="flex flex-1 items-center justify-center px-4 py-6">
          <p className="font-mono text-[11px] text-[var(--text-muted)]">No positions</p>
        </div>
      </>
    )
  }

  // ── Net direction ─────────────────────────────────────────────────────
  let netScore       = 0
  const hasValueData = positions.some((p) => p.quantity != null && quotes[p.symbol])

  if (hasValueData) {
    let longVal = 0, shortVal = 0
    for (const p of positions) {
      const q = quotes[p.symbol]
      const v = (q && p.quantity != null) ? p.quantity * q.price : 1
      if (p.direction === 'long') longVal += v
      else shortVal += v
    }
    const total = longVal + shortVal
    netScore = total > 0 ? ((longVal - shortVal) / total) * 100 : 0
  } else {
    const longCount  = positions.filter((p) => p.direction === 'long').length
    const shortCount = positions.filter((p) => p.direction === 'short').length
    netScore = positions.length > 0 ? ((longCount - shortCount) / positions.length) * 100 : 0
  }

  const absNet        = Math.abs(netScore)
  const isLong        = netScore >= 0
  const fillPct       = absNet / 2   // each side is 50% of bar width
  const fillColor     = isLong ? '#22c55e' : '#ef4444'
  const directionWord = isLong ? 'Long' : 'Short'

  // ── Group by asset type ───────────────────────────────────────────────
  const byType: Record<string, PortfolioPosition[]> = {}
  for (const p of positions) {
    if (!byType[p.asset_type]) byType[p.asset_type] = []
    byType[p.asset_type].push(p)
  }

  return (
    <>
      <PanelHeader />
      <div className="overflow-y-auto scrollbar-hide px-3 py-2.5 space-y-4">

        {/* ── Direction gauge ──────────────────────────────────────── */}
        <div>
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Net Direction</p>

          {/* Gauge bar */}
          <div className="relative h-5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
            {/* Center divider — first in DOM so fill renders on top */}
            <div
              className="absolute inset-y-0"
              style={{ left: '50%', width: '1px', background: 'rgba(255,255,255,0.2)' }}
            />

            {/* Fill from center outward */}
            {isLong ? (
              <div
                className="absolute inset-y-0 rounded-r-full"
                style={{
                  left:       '50%',
                  width:      `${fillPct}%`,
                  background: fillColor,
                  transition: 'width 1000ms ease-out',
                }}
              />
            ) : (
              <div
                className="absolute inset-y-0 rounded-l-full"
                style={{
                  right:      '50%',
                  width:      `${fillPct}%`,
                  background: fillColor,
                  transition: 'width 1000ms ease-out',
                }}
              />
            )}
          </div>

          {/* Labels */}
          <div className="mt-2 flex items-center justify-between">
            <span className="font-mono text-[10px] font-medium" style={{ color: '#ef4444', opacity: 0.6 }}>
              SHORT
            </span>

            {/* Net label pill */}
            <span
              className="rounded px-2.5 py-0.5 font-mono text-[11px] font-bold tabular-nums"
              style={{
                color:      fillColor,
                background: `${fillColor}12`,
                border:     `1px solid ${fillColor}25`,
                textShadow: `0 0 10px ${fillColor}50`,
              }}
            >
              {absNet.toFixed(0)}% {directionWord}
            </span>

            <span className="font-mono text-[10px] font-medium" style={{ color: '#22c55e', opacity: 0.6 }}>
              LONG
            </span>
          </div>
        </div>

        {/* ── Positions by class ────────────────────────────────────── */}
        <div>
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Positions by Class</p>
          <div className="space-y-2.5">
            {Object.entries(byType).map(([type, posns], gi) => {
              const color = TYPE_COLORS[type] ?? '#6b7280'
              return (
                <div
                  key={type}
                  className="animate-fade-up"
                  style={{ animationDelay: `${gi * 50}ms`, animationFillMode: 'both' }}
                >
                  {/* Class label */}
                  <div className="mb-1 flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: color, boxShadow: `0 0 5px ${color}80` }}
                    />
                    <span
                      className="font-mono text-[9px] font-bold uppercase tracking-[0.1em]"
                      style={{ color }}
                    >
                      {TYPE_LABEL[type] ?? type}
                    </span>
                  </div>

                  {/* Position cards */}
                  <div className="flex flex-wrap gap-1.5">
                    {posns.map((p) => (
                      <PositionCard
                        key={`${p.id}-${p.direction}`}
                        position={p}
                        quote={quotes[p.symbol]}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </>
  )
}
