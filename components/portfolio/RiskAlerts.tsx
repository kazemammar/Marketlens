'use client'

import type { PortfolioPosition } from '@/lib/hooks/usePortfolio'
import type { QuoteData }         from './PositionsTable'

// ─── Sector mapping ───────────────────────────────────────────────────────

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
  severity:  Severity
  category:  string
  message:   string
  valuePct?: number   // optional % to render a visual bar
}

const SEV_CONFIG: Record<Severity, { border: string; bg: string; pill: string; dot: string; pulse: boolean }> = {
  HIGH: {
    border: '#ef4444',
    bg:     'linear-gradient(135deg, rgba(239,68,68,0.06), transparent 60%)',
    pill:   'bg-red-500/10 text-red-400 border-red-500/20',
    dot:    '#ef4444',
    pulse:  true,
  },
  MED: {
    border: '#f59e0b',
    bg:     'linear-gradient(135deg, rgba(245,158,11,0.06), transparent 60%)',
    pill:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dot:    '#f59e0b',
    pulse:  false,
  },
  LOW: {
    border: '#60a5fa',
    bg:     'linear-gradient(135deg, rgba(96,165,250,0.06), transparent 60%)',
    pill:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dot:    '#60a5fa',
    pulse:  false,
  },
  INFO: {
    border: '#6b7280',
    bg:     'linear-gradient(135deg, rgba(107,114,128,0.04), transparent 60%)',
    pill:   'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    dot:    '#6b7280',
    pulse:  false,
  },
}

// ─── Category icons ───────────────────────────────────────────────────────

function CategoryIcon({ category }: { category: string }) {
  const cls = 'h-3 w-3 shrink-0'
  switch (category) {
    case 'Concentration':
      return (
        <svg viewBox="0 0 12 12" fill="none" className={cls} aria-hidden>
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="6" cy="6" r="0.8" fill="currentColor"/>
        </svg>
      )
    case 'Diversification':
      return (
        <svg viewBox="0 0 12 12" fill="none" className={cls} aria-hidden>
          <rect x="1" y="1" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="7" y="1" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="1" y="7" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="7" y="7" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      )
    case 'Direction':
      return (
        <svg viewBox="0 0 12 12" fill="none" className={cls} aria-hidden>
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M6 2v2M6 8v2M2 6h2M8 6h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <circle cx="6" cy="6" r="1" fill="currentColor"/>
        </svg>
      )
    case 'Correlation':
      return (
        <svg viewBox="0 0 12 12" fill="none" className={cls} aria-hidden>
          <circle cx="3" cy="6" r="2" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="9" cy="6" r="2" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="5" y1="6" x2="7" y2="6" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
      )
    case 'Diversity':
      return (
        <svg viewBox="0 0 12 12" fill="none" className={cls} aria-hidden>
          <path d="M1 10L4 6l3 2 4-6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    default: // Data / Info
      return (
        <svg viewBox="0 0 12 12" fill="none" className={cls} aria-hidden>
          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="6" y1="5" x2="6" y2="9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <circle cx="6" cy="3.5" r="0.7" fill="currentColor"/>
        </svg>
      )
  }
}

// ─── Alert logic ──────────────────────────────────────────────────────────

function computeAlerts(
  positions: PortfolioPosition[],
  quotes:    Record<string, QuoteData>,
): RiskAlert[] {
  const alerts: RiskAlert[] = []
  const total = positions.length
  if (total === 0) return alerts

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
            message:  `${sym} is ${pct.toFixed(0)}% of portfolio value — high concentration risk`,
            valuePct: pct,
          })
        }
      }
    }

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
            message:  `Portfolio is ${pct.toFixed(0)}% ${type}s — limited diversification`,
            valuePct: pct,
          })
        }
      }
    }
  } else {
    const countByType: Record<string, number> = {}
    for (const p of positions) countByType[p.asset_type] = (countByType[p.asset_type] ?? 0) + 1
    for (const [type, count] of Object.entries(countByType)) {
      const pct = (count / total) * 100
      if (pct > 70 && total >= 3) {
        alerts.push({
          severity: 'HIGH',
          category: 'Diversification',
          message:  `${pct.toFixed(0)}% of positions are ${type}s — limited diversification`,
          valuePct: pct,
        })
      }
    }
  }

  const longCount = positions.filter((p) => p.direction === 'long').length
  const shortCount = positions.filter((p) => p.direction === 'short').length
  const longPct   = (longCount / total) * 100

  if (longPct > 85 && total >= 3) {
    alerts.push({
      severity: 'MED',
      category: 'Direction',
      message:  `Portfolio is ${longPct.toFixed(0)}% long — vulnerable to broad market decline`,
      valuePct: longPct,
    })
  } else if ((100 - longPct) > 85 && total >= 3) {
    alerts.push({
      severity: 'MED',
      category: 'Direction',
      message:  `Portfolio is ${(100 - longPct).toFixed(0)}% short — at risk if markets rally`,
      valuePct: 100 - longPct,
    })
  }

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
        message:  `${count} positions in ${sector} — correlated exposure`,
      })
    }
  }

  const types = new Set(positions.map((p) => p.asset_type))
  if (types.size === 1 && total >= 3) {
    const type = [...types][0]
    alerts.push({
      severity: 'LOW',
      category: 'Diversity',
      message:  `All ${total} positions are ${type}s — consider diversifying across asset classes`,
    })
  }

  const missingCost = positions.filter((p) => p.quantity == null || p.avg_cost == null).length
  if (missingCost > 0 && missingCost / total > 0.5) {
    alerts.push({
      severity: 'INFO',
      category: 'Data',
      message:  `${missingCost} position${missingCost > 1 ? 's' : ''} missing cost basis — add for full P&L tracking`,
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
      <div className="flex-1 overflow-y-auto px-2.5 py-2">
        {alerts.length === 0 ? (
          /* ── All-clear state ── */
          <div className="flex h-full flex-col items-center justify-center gap-3 py-6">
            <div className="relative">
              {/* Shield icon with glow */}
              <svg viewBox="0 0 40 46" fill="none" width="40" height="46" aria-hidden>
                <defs>
                  <filter id="shield-glow">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                  </filter>
                </defs>
                <path
                  d="M20 2L4 9v13c0 9.9 6.8 19.2 16 22 9.2-2.8 16-12.1 16-22V9L20 2z"
                  stroke="#22c55e"
                  strokeWidth="1.5"
                  fill="rgba(34,197,94,0.08)"
                  filter="url(#shield-glow)"
                />
                <path
                  d="M13 22l5 5 9-10"
                  stroke="#22c55e"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-mono text-[11px] font-semibold" style={{ color: 'var(--price-up)' }}>
                Portfolio balanced
              </p>
              <p className="font-mono text-[9px] text-[var(--text-muted)] opacity-60 mt-0.5">
                No risk alerts detected
              </p>
            </div>
          </div>
        ) : (
          alerts.map((alert, i) => {
            const cfg = SEV_CONFIG[alert.severity]
            return (
              <div
                key={i}
                className="animate-fade-up mb-2 overflow-hidden rounded-lg"
                style={{
                  borderLeft:         `3px solid ${cfg.border}`,
                  background:         cfg.bg,
                  border:             `1px solid ${cfg.border}25`,
                  borderLeftWidth:    '3px',
                  borderLeftColor:    cfg.border,
                  animationDelay:     `${i * 60}ms`,
                  animationFillMode:  'both',
                }}
              >
                {/* Header row */}
                <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1">
                  {/* Severity dot — pulsing for HIGH */}
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.pulse ? 'live-dot' : ''}`}
                    style={{ background: cfg.dot, boxShadow: `0 0 5px ${cfg.dot}70` }}
                  />

                  {/* Category icon + pill */}
                  <span style={{ color: cfg.dot }}>
                    <CategoryIcon category={alert.category} />
                  </span>
                  <span
                    className={`rounded border px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-wide ${cfg.pill}`}
                  >
                    {alert.category}
                  </span>
                </div>

                {/* Message */}
                <p className="px-2.5 pb-2 font-mono text-[11px] leading-relaxed text-[var(--text)]">
                  {alert.message}
                </p>

                {/* Visual severity bar (when we have a %) */}
                {alert.valuePct != null && (
                  <div className="mx-2.5 mb-2 h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width:      `${Math.min(alert.valuePct, 100)}%`,
                        background: `linear-gradient(to right, ${cfg.border}70, ${cfg.border})`,
                        boxShadow:  `0 0 6px ${cfg.border}40`,
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
