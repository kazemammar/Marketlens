'use client'

import { useEffect, useState } from 'react'
import type { EconomicIndicator } from '@/app/api/economics/route'
import CentralBankRates from '@/components/economics/CentralBankRates'

// ─── Mini sparkline SVG (matches AssetCard style) ─────────────────────────

function Sparkline({ values, isPositive, gradientId }: { values: number[]; isPositive: boolean; gradientId: string }) {
  if (values.length < 2) return null

  const W = 72, H = 28, PAD = 2
  const min   = Math.min(...values)
  const max   = Math.max(...values)
  const range = max - min || 1

  const coords = values.map((v, i) => ({
    x: PAD + (i / (values.length - 1)) * (W - 2 * PAD),
    y: PAD + (1 - (v - min) / range) * (H - 2 * PAD),
  }))

  let d = `M ${coords[0].x},${coords[0].y}`
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1]
    const cur  = coords[i]
    const cpx  = (prev.x + cur.x) / 2
    d += ` C ${cpx},${prev.y} ${cpx},${cur.y} ${cur.x},${cur.y}`
  }

  const fillD  = `${d} L ${coords[coords.length - 1].x},${H} L ${coords[0].x},${H} Z`
  const clrVar = isPositive ? 'var(--price-up)' : 'var(--price-down)'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="shrink-0" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: clrVar, stopOpacity: 0.22 }} />
          <stop offset="100%" style={{ stopColor: clrVar, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradientId})`} />
      <path d={d} fill="none" style={{ stroke: clrVar }} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Indicator card (compact, matches AssetCard layout) ───────────────────

function IndicatorCard({ ind }: { ind: EconomicIndicator }) {
  const isInverted  = ind.id === 'YIELD_SPREAD' && (ind.value ?? 0) < 0
  const positive    = (ind.change ?? 0) > 0
  const negative    = (ind.change ?? 0) < 0
  const isPositive  = positive
  const changeColor = positive
    ? 'var(--price-up)'
    : negative
      ? 'var(--price-down)'
      : 'var(--price-flat)'

  const gradientId = `econ-${ind.id.replace(/[^a-z0-9]/gi, '')}`
  const histValues = ind.history.map((h) => h.value)

  function formatVal() {
    if (ind.value === null) return '—'
    if (ind.unit === '$T')   return `$${ind.value.toFixed(1)}T`
    if (ind.unit === '%')    return `${ind.value.toFixed(2)}%`
    return ind.value.toFixed(1)
  }

  return (
    <div
      className="flex flex-col gap-2.5 rounded border bg-[var(--surface)] p-2.5 transition hover:border-[var(--accent)]/30"
      style={{ borderColor: isInverted ? 'rgba(239,68,68,0.5)' : 'var(--border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block truncate font-mono text-[12px] font-bold text-[var(--text)]">
            {ind.id.replace(/_/g, ' ')}
          </span>
          <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--text-muted)]">{ind.name}</p>
        </div>
        <Sparkline values={histValues} isPositive={isPositive} gradientId={gradientId} />
      </div>

      <div className="flex items-end justify-between">
        <p className="font-mono text-[16px] font-bold tabular-nums text-[var(--text)]">
          {formatVal()}
        </p>
        <div className="flex items-center gap-1">
          {isInverted && (
            <span className="rounded border border-red-500/40 bg-red-500/10 px-1 py-0.5 font-mono text-[7px] font-bold text-red-400">
              INV
            </span>
          )}
          {ind.change !== null && ind.change !== 0 ? (
            <div className="flex items-center gap-1 font-mono text-[11px] font-semibold tabular-nums" style={{ color: changeColor }}>
              <span className="font-mono text-[9px] leading-none">{positive ? '▲' : '▼'}</span>
              <span>{positive ? '+' : ''}{ind.change.toFixed(2)}{ind.unit === '%' ? 'pp' : ''}</span>
            </div>
          ) : (
            <span className="font-mono text-[11px] font-semibold tabular-nums" style={{ color: 'var(--price-flat)' }}>—</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Fed Watch section ─────────────────────────────────────────────────────

const FOMC_DATES_2026 = [
  '2026-01-28', '2026-03-18', '2026-04-29', '2026-06-10',
  '2026-07-29', '2026-09-16', '2026-11-04', '2026-12-16',
]

function FedWatch({ fedRate }: { fedRate: EconomicIndicator | undefined }) {
  const now      = new Date()
  const next     = FOMC_DATES_2026.find((d) => new Date(d) > now) ?? FOMC_DATES_2026[FOMC_DATES_2026.length - 1]
  const daysAway = Math.ceil((new Date(next).getTime() - now.getTime()) / 86400000)

  return (
    <div className="overflow-hidden rounded border border-[var(--border)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-amber-400" aria-hidden>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">Fed Watch</span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
        <div>
          <p className="font-mono text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-[0.1em] mb-1">Current Rate</p>
          <p className="font-mono text-[22px] font-bold text-[var(--text)] tabular-nums">
            {fedRate?.value !== null && fedRate?.value !== undefined ? `${fedRate.value.toFixed(2)}%` : '—'}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-[0.1em] mb-1">Next FOMC</p>
          <p className="font-mono text-[13px] font-bold text-[var(--text)]">
            {new Date(next).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <p className="font-mono text-[10px] text-amber-400 mt-0.5">in {daysAway} days</p>
        </div>
        <div>
          <p className="font-mono text-[9px] text-[var(--text-muted)] font-semibold uppercase tracking-[0.1em] mb-1">Upcoming FOMC</p>
          <div className="flex flex-col gap-0.5">
            {FOMC_DATES_2026.filter((d) => new Date(d) >= now).slice(0, 4).map((d) => (
              <p key={d} className="font-mono text-[9px] text-[var(--text-muted)]">
                {new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function EconomicsPage() {
  const [indicators, setIndicators] = useState<EconomicIndicator[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    fetch('/api/economics')
      .then((r) => r.json() as Promise<EconomicIndicator[]>)
      .then((d) => { setIndicators(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const fedRate      = indicators.find((i) => i.id === 'FEDFUNDS')
  const yieldSpread  = indicators.find((i) => i.id === 'YIELD_SPREAD')
  const inverted     = (yieldSpread?.value ?? 0) < 0

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4">
        {/* Page header */}
        <div className="mb-6 space-y-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-[22px] font-bold tracking-tight text-[var(--text)]">Economic Dashboard</h1>
              {inverted && (
                <span className="rounded border border-red-500/40 bg-red-500/10 px-2 py-1 font-mono text-[9px] font-bold text-red-400">
                  ⚠ YIELD CURVE INVERTED — RECESSION SIGNAL
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">Key indicators, central bank rates, and macro data</p>
          </div>
        </div>

        {/* Fed Watch */}
        <div className="mb-4">
          <FedWatch fedRate={fedRate} />
        </div>

        {/* Central Bank Policy Rates */}
        <div className="mb-4">
          <CentralBankRates />
        </div>

        {/* Indicators grid */}
        <div className="overflow-hidden rounded border border-[var(--border)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
            <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-emerald-400" aria-hidden>
              <path d="M2 12l4-4 3 3 5-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">Economic Indicators</span>
            <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
          </div>
          <div className="p-3">
            {loading ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2.5 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1.5">
                        <div className="h-3.5 w-16 animate-pulse rounded bg-[var(--surface-2)]" />
                        <div className="h-3 w-24 animate-pulse rounded bg-[var(--surface-2)]" />
                      </div>
                      <div className="h-7 w-18 animate-pulse rounded bg-[var(--surface-2)]" />
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="h-5 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
                      <div className="h-3 w-12 animate-pulse rounded bg-[var(--surface-2)]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {indicators.map((ind) => (
                  <IndicatorCard key={ind.id} ind={ind} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
