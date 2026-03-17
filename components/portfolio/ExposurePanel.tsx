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

  // ── Net direction gauge ──────────────────────────────────────────────
  // Use market value weighting if available, else count
  let netScore = 0 // -100 (all short) to +100 (all long)
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

  const absNet   = Math.abs(netScore)
  const isLong   = netScore >= 0
  const fillPct  = absNet / 2  // each side is 50% of bar width
  const netLabel = `Net: ${absNet.toFixed(0)}% ${isLong ? 'Long' : 'Short'}`

  // ── Group positions by asset type ─────────────────────────────────────
  const byType: Record<string, PortfolioPosition[]> = {}
  for (const p of positions) {
    if (!byType[p.asset_type]) byType[p.asset_type] = []
    byType[p.asset_type].push(p)
  }

  return (
    <>
      <PanelHeader />
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3">

        {/* Direction gauge */}
        <div>
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Net Direction</p>
          <div className="relative flex h-3 w-full overflow-hidden rounded-sm bg-[var(--surface-2)]">
            {/* Center mark */}
            <div className="absolute left-1/2 top-0 h-full w-px z-10" style={{ background: 'var(--border)' }} />
            {/* Fill bar — from center outward */}
            {isLong ? (
              <div
                className="absolute top-0 h-full"
                style={{
                  left:       '50%',
                  width:      `${fillPct}%`,
                  background: 'var(--price-up)',
                  opacity:    0.85,
                }}
              />
            ) : (
              <div
                className="absolute top-0 h-full"
                style={{
                  right:      '50%',
                  width:      `${fillPct}%`,
                  background: 'var(--price-down)',
                  opacity:    0.85,
                }}
              />
            )}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-[9px]" style={{ color: 'var(--price-down)' }}>SHORT</span>
            <span
              className="font-mono text-[10px] font-semibold tabular-nums"
              style={{ color: isLong ? 'var(--price-up)' : 'var(--price-down)' }}
            >
              {netLabel}
            </span>
            <span className="font-mono text-[9px]" style={{ color: 'var(--price-up)' }}>LONG</span>
          </div>
        </div>

        {/* Positions by asset class */}
        <div>
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Positions by Class</p>
          <div className="space-y-1.5">
            {Object.entries(byType).map(([type, posns]) => (
              <div key={type} className="flex items-start gap-2">
                {/* Type label */}
                <span
                  className="mt-0.5 shrink-0 rounded px-1 py-px font-mono text-[8px] font-bold uppercase"
                  style={{
                    color:      TYPE_COLORS[type] ?? '#6b7280',
                    background: `${TYPE_COLORS[type] ?? '#6b7280'}18`,
                  }}
                >
                  {TYPE_LABEL[type] ?? type}
                </span>
                {/* Position pills */}
                <div className="flex flex-wrap gap-1">
                  {posns.map((p) => (
                    <Link
                      key={`${p.id}-${p.direction}`}
                      href={`/asset/${p.asset_type}/${encodeURIComponent(p.symbol)}`}
                      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold transition hover:opacity-80 ${
                        p.direction === 'long'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {p.direction === 'long' ? '▲' : '▼'} {p.symbol}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}
