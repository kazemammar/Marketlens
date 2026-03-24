'use client'

import type { PortfolioPosition } from '@/lib/hooks/usePortfolio'
import type { QuoteData }         from './PositionsTable'
import { TICKER_SECTOR } from '@/lib/utils/sectors'

// ─── Alert types ──────────────────────────────────────────────────────────

type Severity = 'HIGH' | 'MED' | 'LOW' | 'INFO'

interface RiskAlert {
  severity:  Severity
  category:  string
  message:   string
  valuePct?: number
  // 'bar' = show severity bar, 'direction' = show directional arrow, 'none' = nothing
  indicator: 'bar' | 'direction' | 'none'
  dirLong?:  boolean
}

const SEV_CONFIG: Record<Severity, { border: string; bg: string; pill: string; dot: string }> = {
  HIGH: {
    border: 'var(--danger)',
    bg:     'linear-gradient(135deg, rgba(239,68,68,0.07), transparent 65%)',
    pill:   'bg-red-500/10 text-red-400 border-red-500/20',
    dot:    'var(--danger)',
  },
  MED: {
    border: 'var(--warning)',
    bg:     'linear-gradient(135deg, rgba(245,158,11,0.06), transparent 65%)',
    pill:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dot:    'var(--warning)',
  },
  LOW: {
    border: '#60a5fa',
    bg:     'linear-gradient(135deg, rgba(96,165,250,0.05), transparent 65%)',
    pill:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dot:    '#60a5fa',
  },
  INFO: {
    border: 'var(--text-muted)',
    bg:     'linear-gradient(135deg, rgba(107,114,128,0.04), transparent 65%)',
    pill:   'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    dot:    'var(--text-muted)',
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
    default:
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
        if (pct > 30) {
          alerts.push({
            severity:  pct > 40 ? 'HIGH' : 'MED',
            category:  'Concentration',
            message:   `${sym} is ${pct.toFixed(0)}% of portfolio value — ${pct > 40 ? 'high' : 'elevated'} concentration risk`,
            valuePct:  pct,
            indicator: 'bar',
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
            severity:  'HIGH',
            category:  'Diversification',
            message:   `Portfolio is ${pct.toFixed(0)}% ${type}s — limited diversification`,
            valuePct:  pct,
            indicator: 'bar',
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
          severity:  'HIGH',
          category:  'Diversification',
          message:   `${pct.toFixed(0)}% of positions are ${type}s — limited diversification`,
          valuePct:  pct,
          indicator: 'bar',
        })
      }
    }
  }

  const longCount  = positions.filter((p) => p.direction === 'long').length
  const shortCount = positions.filter((p) => p.direction === 'short').length
  const longPct    = (longCount / total) * 100

  if (longPct > 85 && total >= 3) {
    alerts.push({
      severity:  'MED',
      category:  'Direction',
      message:   `Portfolio is ${longPct.toFixed(0)}% long — vulnerable to broad market decline`,
      indicator: 'direction',
      dirLong:   true,
    })
  } else if ((100 - longPct) > 85 && total >= 3) {
    alerts.push({
      severity:  'MED',
      category:  'Direction',
      message:   `Portfolio is ${(100 - longPct).toFixed(0)}% short — at risk if markets rally`,
      indicator: 'direction',
      dirLong:   false,
    })
  }

  const sectorCounts: Record<string, number> = {}
  for (const p of positions) {
    if (p.asset_type !== 'stock') continue
    const sector = TICKER_SECTOR[p.symbol] ?? 'Other'
    sectorCounts[sector] = (sectorCounts[sector] ?? 0) + 1
  }
  for (const [sector, count] of Object.entries(sectorCounts)) {
    if (count >= 3) {
      alerts.push({
        severity:  count >= 4 ? 'HIGH' : 'MED',
        category:  'Correlation',
        message:   `${count} positions in ${sector} — correlated exposure`,
        indicator: 'none',
      })
    }
  }

  const types = new Set(positions.map((p) => p.asset_type))
  if (types.size === 1 && total >= 3) {
    const type = [...types][0]
    alerts.push({
      severity:  'LOW',
      category:  'Diversity',
      message:   `All ${total} positions are ${type}s — consider diversifying across asset classes`,
      indicator: 'none',
    })
  }

  const missingCost = positions.filter((p) => p.quantity == null || p.avg_cost == null).length
  if (missingCost > 0 && missingCost / total > 0.5) {
    alerts.push({
      severity:  'INFO',
      category:  'Data',
      message:   `${missingCost} position${missingCost > 1 ? 's' : ''} missing cost basis — add for full P&L tracking`,
      indicator: 'none',
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
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
        Risk Alerts
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
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
  const showFade = alerts.length > 3

  return (
    <>
      <PanelHeader />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col overflow-y-auto scrollbar-hide px-2.5 py-1.5">
          {alerts.length === 0 ? (
            /* ── All-clear state ── */
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <svg viewBox="0 0 40 46" fill="none" width="36" height="42" aria-hidden>
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
              <div className="text-center">
                <p className="font-mono text-[12px] font-semibold" style={{ color: 'var(--price-up)' }}>
                  Portfolio balanced
                </p>
                <p className="font-mono text-[9px] text-[var(--text-muted)] opacity-50 mt-0.5">
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
                  className="animate-fade-up mb-2 overflow-hidden rounded"
                  style={{
                    borderTopWidth:    '1px',
                    borderRightWidth:  '1px',
                    borderBottomWidth: '1px',
                    borderLeftWidth:   '3px',
                    borderStyle:       'solid',
                    borderTopColor:    `${cfg.border}20`,
                    borderRightColor:  `${cfg.border}20`,
                    borderBottomColor: `${cfg.border}20`,
                    borderLeftColor:   cfg.border,
                    background:        cfg.bg,
                    animationDelay:    `${i * 60}ms`,
                    animationFillMode: 'both',
                  }}
                >
                  {/* Header row — compact */}
                  <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-0.5">
                    {/* Severity dot — pulsing for HIGH */}
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${alert.severity === 'HIGH' ? 'live-dot' : ''}`}
                      style={{
                        background: cfg.dot,
                        boxShadow:  `0 0 5px ${cfg.dot}${alert.severity === 'HIGH' ? '90' : '50'}`,
                      }}
                    />
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
                  <p className="px-2.5 pb-2 font-mono text-[10px] leading-relaxed text-[var(--text)]">
                    {alert.message}
                  </p>

                  {/* Indicator: severity bar OR direction arrow */}
                  {alert.indicator === 'bar' && alert.valuePct != null && (
                    <div className="mx-2 mb-1.5 h-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width:      `${Math.min(alert.valuePct, 100)}%`,
                          background: `linear-gradient(to right, ${cfg.border}60, ${cfg.border})`,
                          boxShadow:  `0 0 5px ${cfg.border}40`,
                        }}
                      />
                    </div>
                  )}
                  {alert.indicator === 'direction' && (
                    <div className="mx-2 mb-1.5 flex items-center gap-1">
                      <span
                        className="rounded px-1.5 py-0.5 font-mono text-[8px] font-bold"
                        style={{
                          color:      alert.dirLong ? 'var(--price-up)' : 'var(--price-down)',
                          background: alert.dirLong ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        }}
                      >
                        {alert.dirLong ? '▲ LONG-HEAVY' : '▼ SHORT-HEAVY'}
                      </span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Scroll fade gradient — shown when list overflows */}
        {showFade && (
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-8"
            style={{ background: 'linear-gradient(to bottom, transparent, var(--surface))' }}
          />
        )}
      </div>
    </>
  )
}
