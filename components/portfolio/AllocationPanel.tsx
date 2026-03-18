'use client'

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
  stock: 'Stock', crypto: 'Crypto', forex: 'Forex', commodity: 'Commodity', etf: 'ETF',
}

const SECTOR: Record<string, string> = {
  AAPL: 'Technology', MSFT: 'Technology', GOOGL: 'Technology', AMZN: 'Technology',
  NVDA: 'Technology', META: 'Technology', TSLA: 'Consumer',    NFLX: 'Technology',
  JPM:  'Finance',    BAC:  'Finance',    GS:   'Finance',     V:    'Finance',    MA: 'Finance',
  XOM:  'Energy',     CVX:  'Energy',     COP:  'Energy',
  JNJ:  'Healthcare', PFE:  'Healthcare', UNH:  'Healthcare',  ABBV: 'Healthcare',
  PG:   'Consumer',   KO:   'Consumer',   WMT:  'Consumer',    NKE:  'Consumer',   DIS: 'Consumer',
}

const SECTOR_COLORS: Record<string, string> = {
  Technology: '#38bdf8',
  Finance:    '#a78bfa',
  Energy:     '#f97316',
  Healthcare: '#2dd4bf',
  Consumer:   '#f472b6',
  Other:      '#6b7280',
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function fmtPortfolioValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

// ─── Panel header ─────────────────────────────────────────────────────────

function PanelHeader() {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0 text-[var(--text-muted)]" aria-hidden>
        <rect x="1" y="9" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.6"/>
        <rect x="6" y="6" width="3" height="9" rx="0.5" fill="currentColor" opacity="0.8"/>
        <rect x="11" y="2" width="3" height="13" rx="0.5" fill="currentColor"/>
      </svg>
      <span className="font-mono font-bold uppercase tracking-[0.14em] text-[var(--text)]" style={{ fontSize: '9px' }}>
        Allocation
      </span>
    </div>
  )
}

// ─── SVG Donut ring ───────────────────────────────────────────────────────

function DonutRing({
  segments,
  centerLabel,
  centerSub,
  centerGlow,
}: {
  segments:     Array<{ color: string; pct: number; label: string }>
  centerLabel:  string
  centerSub:    string
  centerGlow?:  string
}) {
  const R             = 36
  const CX            = 50
  const CY            = 50
  const circumference = 2 * Math.PI * R
  const gap           = 2

  let offset = 0
  const arcs = segments.map(({ color, pct, label }) => {
    const segLen  = (pct / 100) * circumference - gap
    const dashArr = `${Math.max(segLen, 0)} ${circumference}`
    const dashOff = -(offset)
    offset       += (pct / 100) * circumference
    return { color, dashArr, dashOff, pct, label }
  })

  const glowColor = centerGlow ?? 'rgba(16,185,129,0.5)'

  return (
    <div className="relative flex shrink-0 items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="overflow-visible" aria-hidden>
        <defs>
          <filter id="ring-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="text-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth="7"
        />

        {/* Colored segments */}
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={arc.color}
            strokeWidth="7"
            strokeDasharray={arc.dashArr}
            strokeDashoffset={arc.dashOff}
            strokeLinecap="butt"
            filter="url(#ring-glow)"
            style={{
              transformOrigin: `${CX}px ${CY}px`,
              transform:       'rotate(-90deg)',
              transition:      'stroke-dasharray 0.8s ease, stroke-dashoffset 0.8s ease',
              opacity:         0.92,
            }}
          />
        ))}

        {/* Center value — with glow */}
        <text
          x={CX} y={CY - 5}
          textAnchor="middle"
          dominantBaseline="middle"
          filter="url(#text-glow)"
          style={{
            fill:       glowColor,
            fontFamily: 'monospace',
            fontSize:   '12px',
            fontWeight: 700,
          }}
        >
          {centerLabel}
        </text>
        <text
          x={CX} y={CY + 9}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fill: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '7.5px' }}
        >
          {centerSub}
        </text>
      </svg>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────

export default function AllocationPanel({
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

  // ── By asset class ───────────────────────────────────────────────────
  const typeWeight: Record<string, number> = {}
  let totalWeight  = 0
  const hasRealVal = positions.some((p) => p.quantity != null && quotes[p.symbol] != null)

  for (const p of positions) {
    const q   = quotes[p.symbol]
    const val = (q && p.quantity != null) ? p.quantity * q.price : 1
    typeWeight[p.asset_type] = (typeWeight[p.asset_type] ?? 0) + val
    totalWeight += val
  }
  const typeEntries = Object.entries(typeWeight)
    .map(([type, w]) => ({ type, pct: totalWeight > 0 ? (w / totalWeight) * 100 : 0 }))
    .sort((a, b) => b.pct - a.pct)

  // ── By direction ─────────────────────────────────────────────────────
  const longCount  = positions.filter((p) => p.direction === 'long').length
  const shortCount = positions.filter((p) => p.direction === 'short').length
  const longPct    = positions.length > 0 ? (longCount / positions.length) * 100 : 0

  // ── By sector ────────────────────────────────────────────────────────
  const sectorCounts: Record<string, number> = {}
  for (const p of positions) {
    if (p.asset_type !== 'stock') continue
    const sector = SECTOR[p.symbol] ?? 'Other'
    sectorCounts[sector] = (sectorCounts[sector] ?? 0) + 1
  }
  const sectorEntries = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])
  const totalStocks   = sectorEntries.reduce((acc, [, c]) => acc + c, 0)
  const hasStocks     = sectorEntries.length > 0

  // Donut
  const donutSegments = typeEntries.map(({ type, pct }) => ({
    color: TYPE_COLORS[type] ?? '#6b7280',
    pct,
    label: TYPE_LABEL[type] ?? type,
  }))

  const centerLabel = hasRealVal ? fmtPortfolioValue(totalWeight) : `${positions.length}`
  const centerSub   = hasRealVal ? 'portfolio' : 'positions'
  const dominantColor = donutSegments[0]?.color ?? '#10b981'

  const longDominant = longPct >= 50

  return (
    <>
      <PanelHeader />
      <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-2 space-y-2.5">

        {/* ── Donut + Legend ──────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <DonutRing
            segments={donutSegments}
            centerLabel={centerLabel}
            centerSub={centerSub}
            centerGlow={dominantColor}
          />

          {/* Legend pills */}
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            {typeEntries.map(({ type, pct }, i) => {
              const color = TYPE_COLORS[type] ?? '#6b7280'
              return (
                <div
                  key={type}
                  className="animate-fade-up flex items-center gap-1.5 rounded-md px-2 py-1"
                  style={{
                    background:        `${color}10`,
                    border:            `1px solid ${color}25`,
                    animationDelay:    `${i * 40}ms`,
                    animationFillMode: 'both',
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: color, boxShadow: `0 0 5px ${color}70` }}
                  />
                  <span className="font-mono text-[9px] truncate" style={{ color }}>
                    {TYPE_LABEL[type] ?? type}
                  </span>
                  <span
                    className="ml-auto font-mono text-[9px] font-bold tabular-nums shrink-0"
                    style={{ color }}
                  >
                    {pct.toFixed(0)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Long / Short bar ─────────────────────────────────────── */}
        <div>
          <p className="mb-1 font-mono text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Long / Short</p>
          <div
            className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]"
            style={{ boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.25)' }}
          >
            {/* Long fill */}
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
              style={{
                width:      `${longPct}%`,
                background: 'linear-gradient(to right, #16a34a, #22c55e)',
                boxShadow:  'inset 0 0 8px rgba(34,197,94,0.3)',
                opacity:    0.9,
              }}
            />
            {/* Short fill */}
            <div
              className="absolute right-0 top-0 h-full rounded-full transition-all duration-700"
              style={{
                width:      `${100 - longPct}%`,
                background: 'linear-gradient(to left, #dc2626, #ef4444)',
                boxShadow:  'inset 0 0 8px rgba(239,68,68,0.3)',
                opacity:    0.9,
              }}
            />
            {/* Shimmer pulse on dominant side */}
            <div
              className="absolute top-0 h-full animate-pulse rounded-full pointer-events-none"
              style={{
                [longDominant ? 'left' : 'right']: 0,
                width:      `${Math.max(longPct, 100 - longPct)}%`,
                background: `linear-gradient(${longDominant ? 'to right' : 'to left'}, transparent 40%, rgba(255,255,255,0.08) 100%)`,
              }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-[9px] font-semibold" style={{ color: '#22c55e' }}>
              {longPct.toFixed(0)}% Long
            </span>
            <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-40">
              ({longCount}L / {shortCount}S)
            </span>
            <span className="font-mono text-[9px] font-semibold" style={{ color: '#ef4444' }}>
              {(100 - longPct).toFixed(0)}% Short
            </span>
          </div>
        </div>

        {/* ── Sector exposure ─────────────────────────────────────── */}
        {hasStocks && (
          <div>
            <p className="mb-1 font-mono text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Sector</p>
            <div className="space-y-1">
              {sectorEntries.map(([sector, count], i) => {
                const pct   = totalStocks > 0 ? (count / totalStocks) * 100 : 0
                const color = SECTOR_COLORS[sector] ?? '#6b7280'
                return (
                  <div
                    key={sector}
                    className="animate-fade-up flex items-center gap-2"
                    style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
                  >
                    <span className="w-14 shrink-0 font-mono text-[9px] text-[var(--text-muted)] truncate">{sector}</span>
                    <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width:      `${pct}%`,
                          background: `linear-gradient(to right, ${color}60, ${color})`,
                          boxShadow:  `0 0 4px ${color}50`,
                        }}
                      />
                    </div>
                    <span
                      className="w-6 shrink-0 font-mono text-[8px] tabular-nums text-right"
                      style={{ color, opacity: 0.8 }}
                    >
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {positions.length === 1 && (
          <p className="font-mono text-[9px] text-[var(--text-muted)] opacity-40 italic">
            Add more positions for meaningful allocation data
          </p>
        )}

      </div>
    </>
  )
}
