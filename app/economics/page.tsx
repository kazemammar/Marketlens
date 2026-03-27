'use client'

import { useEffect, useState } from 'react'
import type { EconomicIndicator } from '@/app/api/economics/route'
import CentralBankRates from '@/components/economics/CentralBankRates'

// ─── Mini sparkline SVG ────────────────────────────────────────────────────

function Sparkline({ data }: { data: Array<{ date: string; value: number }> }) {
  if (data.length < 2) return null

  const values = data.map((d) => d.value)
  const min    = Math.min(...values)
  const max    = Math.max(...values)
  const range  = max - min || 1

  const W = 100
  const H = 28

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / range) * H
    return `${x},${y}`
  })

  const lastVal  = values[values.length - 1]
  const firstVal = values[0]
  const trending = lastVal >= firstVal

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} aria-hidden>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={trending ? 'var(--price-up)' : 'var(--price-down)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {/* Dots at each reading */}
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * W
        const y = H - ((v - min) / range) * H
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="1.5"
            fill={trending ? 'var(--price-up)' : 'var(--price-down)'}
            opacity="0.6"
          />
        )
      })}
    </svg>
  )
}

// ─── Large indicator card ──────────────────────────────────────────────────

function LargeCard({ ind }: { ind: EconomicIndicator }) {
  const isInverted = ind.id === 'YIELD_SPREAD' && (ind.value ?? 0) < 0
  const positive   = (ind.change ?? 0) > 0
  const negative   = (ind.change ?? 0) < 0
  const changeColor = positive
    ? 'var(--price-up)'
    : negative
      ? 'var(--price-down)'
      : 'var(--price-flat)'

  function formatVal() {
    if (ind.value === null) return '—'
    if (ind.unit === '$T')   return `$${ind.value.toFixed(1)}T`
    if (ind.unit === '%')    return `${ind.value.toFixed(2)}%`
    return ind.value.toFixed(1)
  }

  function formatDate(s: string) {
    if (!s) return ''
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div
      className="flex flex-col gap-2.5 rounded border bg-[var(--surface)] p-2.5 transition hover:border-[var(--accent)]/30"
      style={{ borderColor: isInverted ? 'rgba(239,68,68,0.5)' : 'var(--border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            {ind.name}
          </span>
          <div className="mt-1 font-mono text-[28px] font-bold leading-none tabular-nums text-[var(--text)]">
            {formatVal()}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isInverted && (
            <span className="rounded border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 font-mono text-[8px] font-bold text-red-400">
              INVERTED
            </span>
          )}
          {ind.change !== null && ind.change !== 0 && (
            <span
              className="font-mono text-[11px] font-semibold tabular-nums"
              style={{ color: changeColor }}
            >
              {positive ? '+' : ''}{ind.change.toFixed(2)}{ind.unit === '%' ? 'pp' : ''}
            </span>
          )}
          <span className="font-mono text-[9px] text-[var(--text-muted)]">
            {formatDate(ind.date)}
          </span>
        </div>
      </div>

      {/* Sparkline */}
      {ind.history.length > 1 && (
        <div className="rounded bg-[var(--surface-2)] p-2">
          <Sparkline data={ind.history} />
          <div className="mt-1 flex justify-between">
            <span className="font-mono text-[8px] text-[var(--text-muted)]">
              {ind.history[0]?.date ? new Date(ind.history[0].date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : ''}
            </span>
            <span className="font-mono text-[8px] text-[var(--text-muted)]">
              {ind.history[ind.history.length - 1]?.date ? new Date(ind.history[ind.history.length - 1].date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : ''}
            </span>
          </div>
        </div>
      )}

      {/* Interpretation */}
      {ind.interpretation && (
        <p className="font-mono text-[10px] leading-relaxed text-[var(--text-muted)]">
          {ind.interpretation}
        </p>
      )}
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
    <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <div className="mb-2.5 flex items-center gap-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-amber-400" aria-hidden>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">Fed Watch</span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
        <div className="mb-5">
          <FedWatch fedRate={fedRate} />
        </div>

        {/* Central Bank Policy Rates */}
        <div className="mb-5">
          <CentralBankRates />
        </div>

        {/* Indicators grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-40 rounded border border-[var(--border)] bg-[var(--surface)]">
                <div className="flex h-full animate-pulse flex-col gap-3 p-4">
                  <div className="skeleton h-2 w-24 rounded" />
                  <div className="skeleton h-8 w-20 rounded" />
                  <div className="skeleton flex-1 rounded" />
                  <div className="skeleton h-2 w-32 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {indicators.map((ind) => (
              <LargeCard key={ind.id} ind={ind} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
