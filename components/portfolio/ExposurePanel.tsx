'use client'

import Link from 'next/link'
import type { PortfolioPosition } from '@/lib/hooks/usePortfolio'
import type { QuoteData }         from './PositionsTable'

// ─── Constants ────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  stock:     '#10b981',
  crypto:    '#f97316',
  forex:     '#38bdf8',
  commodity: '#f59e0b',
  etf:       '#a78bfa',
}

const TYPE_LABEL: Record<string, string> = {
  stock: 'Stock', crypto: 'Crypto', forex: 'Forex', commodity: 'Cmdty', etf: 'ETF',
}

// ─── Panel header ─────────────────────────────────────────────────────────

function PanelHeader() {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0 text-[var(--text-muted)]" aria-hidden>
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5"/>
        <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 1.5"/>
        <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
      </svg>
      <span className="font-mono font-bold uppercase tracking-[0.14em] text-[var(--text)]" style={{ fontSize: '9px' }}>
        Exposure
      </span>
    </div>
  )
}

// ─── Position mini-card ───────────────────────────────────────────────────

function PositionCard({
  position,
  quote,
  typeColor,
}: {
  position:  PortfolioPosition
  quote:     QuoteData | undefined
  typeColor: string
}) {
  const changePercent  = quote?.changePercent ?? 0
  const isUp           = changePercent >= 0
  const changeColor    = isUp ? '#22c55e' : '#ef4444'
  const hasQuote       = quote != null

  return (
    <Link
      href={`/asset/${position.asset_type}/${encodeURIComponent(position.symbol)}`}
      className="group flex min-w-[64px] flex-col gap-0.5 rounded-md p-1.5 transition-all duration-150"
      style={{
        background: `${typeColor}08`,
        border:     `1px solid ${typeColor}20`,
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLAnchorElement).style.borderColor = `${typeColor}50`
        ;(e.currentTarget as HTMLAnchorElement).style.background  = `${typeColor}12`
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLAnchorElement).style.borderColor = `${typeColor}20`
        ;(e.currentTarget as HTMLAnchorElement).style.background  = `${typeColor}08`
      }}
    >
      {/* Symbol + direction */}
      <div className="flex items-center gap-0.5">
        <span
          className="font-mono text-[8px] font-bold leading-none"
          style={{ color: position.direction === 'long' ? '#22c55e' : '#ef4444' }}
        >
          {position.direction === 'long' ? '▲' : '▼'}
        </span>
        <span
          className="font-mono text-[9px] font-bold leading-none truncate"
          style={{ color: 'var(--accent)' }}
        >
          {position.symbol}
        </span>
      </div>

      {/* Day change */}
      {hasQuote && (
        <span
          className="font-mono text-[8px] tabular-nums leading-none"
          style={{ color: changeColor, textShadow: `0 0 6px ${changeColor}50` }}
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
  let netScore = 0
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
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3">

        {/* ── Direction gauge ──────────────────────────────────────── */}
        <div>
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Net Direction</p>

          {/* Gauge bar */}
          <div
            className="relative h-4 w-full overflow-hidden rounded-full bg-[var(--surface-2)]"
            style={{ boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.25)' }}
          >
            {/* Center marker */}
            <div
              className="absolute left-1/2 top-0 z-10 h-full w-0.5 -translate-x-0.5"
              style={{ background: 'rgba(255,255,255,0.25)', boxShadow: '0 0 4px rgba(255,255,255,0.15)' }}
            />

            {/* Fill from center */}
            {isLong ? (
              <div
                className="absolute top-0 h-full transition-all duration-700"
                style={{
                  left:       '50%',
                  width:      `${fillPct}%`,
                  background: `linear-gradient(to right, ${fillColor}70, ${fillColor})`,
                  boxShadow:  `inset 0 0 8px ${fillColor}30`,
                }}
              />
            ) : (
              <div
                className="absolute top-0 h-full transition-all duration-700"
                style={{
                  right:      '50%',
                  width:      `${fillPct}%`,
                  background: `linear-gradient(to left, ${fillColor}70, ${fillColor})`,
                  boxShadow:  `inset 0 0 8px ${fillColor}30`,
                }}
              />
            )}
          </div>

          {/* Labels */}
          <div className="mt-1.5 flex items-center justify-between">
            <span className="font-mono text-[9px] font-medium" style={{ color: '#ef4444', opacity: 0.7 }}>SHORT</span>

            {/* Net label pill */}
            <span
              className="rounded-full px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums"
              style={{
                color:      fillColor,
                background: `${fillColor}15`,
                textShadow: `0 0 8px ${fillColor}60`,
              }}
            >
              {absNet.toFixed(0)}% {directionWord}
            </span>

            <span className="font-mono text-[9px] font-medium" style={{ color: '#22c55e', opacity: 0.7 }}>LONG</span>
          </div>
        </div>

        {/* ── Positions by class ────────────────────────────────────── */}
        <div>
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Positions by Class</p>
          <div className="space-y-2">
            {Object.entries(byType).map(([type, posns]) => {
              const color = TYPE_COLORS[type] ?? '#6b7280'
              return (
                <div key={type}>
                  {/* Class label */}
                  <div className="mb-1 flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: color, boxShadow: `0 0 4px ${color}70` }}
                    />
                    <span
                      className="font-mono text-[8px] font-bold uppercase tracking-wide"
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
                        typeColor={color}
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
