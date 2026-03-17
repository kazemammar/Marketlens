'use client'

import type { PortfolioPosition } from '@/lib/hooks/usePortfolio'
import type { QuoteData }         from './PositionsTable'

// ─── Constants ────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  stock:     '#10b981', // emerald
  crypto:    '#f97316', // orange
  forex:     '#38bdf8', // sky
  commodity: '#f59e0b', // amber
  etf:       '#a78bfa', // purple
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
  // Prefer market value weighting; fall back to count weighting
  const typeWeight: Record<string, number> = {}
  let totalWeight = 0

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

  // ── By sector (stocks only) ──────────────────────────────────────────
  const sectorCounts: Record<string, number> = {}
  for (const p of positions) {
    if (p.asset_type !== 'stock') continue
    const sector = SECTOR[p.symbol] ?? 'Other'
    sectorCounts[sector] = (sectorCounts[sector] ?? 0) + 1
  }
  const sectorEntries = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])
  const hasStocks     = sectorEntries.length > 0

  return (
    <>
      <PanelHeader />
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-3">

        {/* By asset class — stacked bar */}
        <div>
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-[var(--text-muted)]">By Asset Class</p>
          <div className="flex h-3 w-full overflow-hidden rounded-sm">
            {typeEntries.map(({ type, pct }) => (
              <div
                key={type}
                title={`${TYPE_LABEL[type] ?? type}: ${pct.toFixed(1)}%`}
                style={{ width: `${pct}%`, background: TYPE_COLORS[type] ?? '#6b7280' }}
              />
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
            {typeEntries.map(({ type, pct }) => (
              <div key={type} className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: TYPE_COLORS[type] ?? '#6b7280' }} />
                <span className="font-mono text-[9px] text-[var(--text-muted)]">
                  {TYPE_LABEL[type] ?? type} {pct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* By direction — long/short bar */}
        <div>
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Long / Short</p>
          <div className="flex h-3 w-full overflow-hidden rounded-sm">
            <div style={{ width: `${longPct}%`, background: 'var(--price-up)' }} title={`Long ${longPct.toFixed(0)}%`} />
            <div style={{ width: `${100 - longPct}%`, background: 'var(--price-down)' }} title={`Short ${(100 - longPct).toFixed(0)}%`} />
          </div>
          <p className="mt-1 font-mono text-[9px] text-[var(--text-muted)]">
            <span style={{ color: 'var(--price-up)' }}>{longPct.toFixed(0)}% Long</span>
            {' · '}
            <span style={{ color: 'var(--price-down)' }}>{(100 - longPct).toFixed(0)}% Short</span>
            {' '}
            <span className="opacity-50">({longCount}L / {shortCount}S)</span>
          </p>
        </div>

        {/* By sector */}
        {hasStocks && (
          <div>
            <p className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-[var(--text-muted)]">Sector Exposure</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {sectorEntries.map(([sector, count]) => (
                <span key={sector} className="font-mono text-[9px] text-[var(--text-muted)]">
                  <span className="text-[var(--text)]">{sector}</span> {count}
                </span>
              ))}
            </div>
          </div>
        )}

        {positions.length === 1 && (
          <p className="font-mono text-[9px] text-[var(--text-muted)] opacity-60 italic">
            Add more positions for meaningful allocation data
          </p>
        )}

      </div>
    </>
  )
}
