'use client'

import type { PortfolioPosition } from '@/lib/hooks/usePortfolio'
import type { QuoteData }         from './PositionsTable'

// ─── Sector mapping (same as AllocationPanel) ─────────────────────────────

const SECTOR: Record<string, string> = {
  AAPL: 'Technology', MSFT: 'Technology', GOOGL: 'Technology', AMZN: 'Technology',
  NVDA: 'Technology', META: 'Technology', TSLA: 'Consumer',    NFLX: 'Technology',
  JPM:  'Finance',    BAC:  'Finance',    GS:   'Finance',     V:    'Finance',    MA: 'Finance',
  XOM:  'Energy',     CVX:  'Energy',     COP:  'Energy',
  JNJ:  'Healthcare', PFE:  'Healthcare', UNH:  'Healthcare',  ABBV: 'Healthcare',
  PG:   'Consumer',   KO:   'Consumer',   WMT:  'Consumer',    NKE:  'Consumer',   DIS: 'Consumer',
}

// ─── Alert types ──────────────────────────────────────────────────────────

type Severity = 'HIGH' | 'MED' | 'LOW' | 'INFO'

interface RiskAlert {
  severity: Severity
  category: string
  message:  string
}

const SEV_DOT: Record<Severity, string> = {
  HIGH: 'var(--price-down)',
  MED:  'var(--warning)',
  LOW:  '#60a5fa',
  INFO: 'var(--text-muted)',
}

const SEV_PILL: Record<Severity, string> = {
  HIGH: 'bg-red-500/10 text-red-400',
  MED:  'bg-amber-500/10 text-amber-400',
  LOW:  'bg-blue-500/10 text-blue-400',
  INFO: 'bg-zinc-500/10 text-zinc-400',
}

// ─── Alert logic ──────────────────────────────────────────────────────────

function computeAlerts(
  positions: PortfolioPosition[],
  quotes:    Record<string, QuoteData>,
): RiskAlert[] {
  const alerts: RiskAlert[] = []
  const total = positions.length
  if (total === 0) return alerts

  // ── Concentration risk: by market value (if available) or count ──────
  const hasValueData = positions.some((p) => p.quantity != null && quotes[p.symbol])

  if (hasValueData) {
    const valueBySymbol: Record<string, number> = {}
    let totalValue = 0
    for (const p of positions) {
      const q = quotes[p.symbol]
      if (q && p.quantity != null) {
        const v = p.quantity * q.price
        valueBySymbol[p.symbol] = (valueBySymbol[p.symbol] ?? 0) + v
        totalValue += v
      }
    }
    if (totalValue > 0) {
      for (const [sym, val] of Object.entries(valueBySymbol)) {
        const pct = (val / totalValue) * 100
        if (pct > 40) {
          alerts.push({
            severity: 'HIGH',
            category: 'Concentration',
            message: `${sym} is ${pct.toFixed(0)}% of portfolio value — high concentration risk`,
          })
        }
      }
    }

    // By asset class value concentration
    const valueByType: Record<string, number> = {}
    for (const p of positions) {
      const q = quotes[p.symbol]
      if (q && p.quantity != null) {
        const v = p.quantity * q.price
        valueByType[p.asset_type] = (valueByType[p.asset_type] ?? 0) + v
      }
    }
    const totalTyped = Object.values(valueByType).reduce((a, b) => a + b, 0)
    if (totalTyped > 0) {
      for (const [type, val] of Object.entries(valueByType)) {
        const pct = (val / totalTyped) * 100
        if (pct > 70) {
          alerts.push({
            severity: 'HIGH',
            category: 'Diversification',
            message: `Portfolio is ${pct.toFixed(0)}% ${type}s — limited diversification`,
          })
        }
      }
    }
  } else {
    // Count-based concentration
    const countByType: Record<string, number> = {}
    for (const p of positions) countByType[p.asset_type] = (countByType[p.asset_type] ?? 0) + 1
    for (const [type, count] of Object.entries(countByType)) {
      const pct = (count / total) * 100
      if (pct > 70 && total >= 3) {
        alerts.push({
          severity: 'HIGH',
          category: 'Diversification',
          message: `${pct.toFixed(0)}% of positions are ${type}s — limited diversification`,
        })
      }
    }
  }

  // ── Directional exposure ─────────────────────────────────────────────
  const longCount  = positions.filter((p) => p.direction === 'long').length
  const shortCount = positions.filter((p) => p.direction === 'short').length
  const longPct    = (longCount / total) * 100

  if (longPct > 85 && total >= 3) {
    alerts.push({
      severity: 'MED',
      category: 'Direction',
      message: `Portfolio is ${longPct.toFixed(0)}% long — vulnerable to broad market decline`,
    })
  } else if ((100 - longPct) > 85 && total >= 3) {
    alerts.push({
      severity: 'MED',
      category: 'Direction',
      message: `Portfolio is ${(100 - longPct).toFixed(0)}% short — at risk if markets rally`,
    })
  }

  // ── Correlation warning (sector) ─────────────────────────────────────
  const sectorCounts: Record<string, number> = {}
  for (const p of positions) {
    if (p.asset_type !== 'stock') continue
    const sector = SECTOR[p.symbol] ?? 'Other'
    sectorCounts[sector] = (sectorCounts[sector] ?? 0) + 1
  }
  for (const [sector, count] of Object.entries(sectorCounts)) {
    if (count >= 3) {
      alerts.push({
        severity: 'MED',
        category: 'Correlation',
        message: `${count} positions in ${sector} — correlated exposure`,
      })
    }
  }

  // ── Single asset type ────────────────────────────────────────────────
  const types = new Set(positions.map((p) => p.asset_type))
  if (types.size === 1 && total >= 3) {
    const type = [...types][0]
    alerts.push({
      severity: 'LOW',
      category: 'Diversity',
      message: `All ${total} positions are ${type}s — consider diversifying across asset classes`,
    })
  }

  // ── Missing cost data ────────────────────────────────────────────────
  const missingCost = positions.filter((p) => p.quantity == null || p.avg_cost == null).length
  if (missingCost > 0 && missingCost / total > 0.5) {
    alerts.push({
      severity: 'INFO',
      category: 'Data',
      message: `${missingCost} position${missingCost > 1 ? 's' : ''} missing cost basis — add for full P&L tracking`,
    })
  }

  return alerts
}

// ─── Panel header ─────────────────────────────────────────────────────────

function PanelHeader() {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--warning)' }} aria-hidden>
        <path d="M8 2L1 14h14L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <line x1="8" y1="7" x2="8" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="8" cy="12" r="0.75" fill="currentColor"/>
      </svg>
      <span className="font-mono font-bold uppercase tracking-[0.14em] text-[var(--text)]" style={{ fontSize: '9px' }}>
        Risk Alerts
      </span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────

export default function RiskAlerts({
  positions,
  quotes,
}: {
  positions: PortfolioPosition[]
  quotes:    Record<string, QuoteData>
}) {
  const alerts = computeAlerts(positions, quotes)

  return (
    <>
      <PanelHeader />
      <div className="flex-1 overflow-y-auto px-3 py-1">
        {alerts.length === 0 ? (
          <div className="flex h-full items-center justify-center py-6">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0" style={{ color: 'var(--price-up)' }} aria-hidden>
                <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                No risk alerts — portfolio looks balanced
              </span>
            </div>
          </div>
        ) : (
          alerts.map((alert, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 border-b border-[var(--border)] py-2 last:border-0"
            >
              {/* Severity dot */}
              <span
                className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: SEV_DOT[alert.severity] }}
              />
              {/* Category pill */}
              <span className={`mt-px shrink-0 rounded px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-wide ${SEV_PILL[alert.severity]}`}>
                {alert.category}
              </span>
              {/* Message */}
              <p className="font-mono text-[10px] leading-relaxed text-[var(--text)]">
                {alert.message}
              </p>
            </div>
          ))
        )}
      </div>
    </>
  )
}
