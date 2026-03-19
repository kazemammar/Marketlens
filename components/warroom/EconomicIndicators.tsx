'use client'

import type { EconomicIndicator } from '@/app/api/economics/route'
import { useFetch } from '@/lib/hooks/useFetch'

function ArrowUp() {
  return (
    <svg viewBox="0 0 10 10" fill="none" className="inline h-2 w-2 shrink-0" aria-hidden>
      <path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ArrowDown() {
  return (
    <svg viewBox="0 0 10 10" fill="none" className="inline h-2 w-2 shrink-0" aria-hidden>
      <path d="M5 2v6M2 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function formatValue(ind: EconomicIndicator): string {
  if (ind.value === null) return '—'
  const v = ind.value
  if (ind.unit === '$T') return `$${v.toFixed(1)}T`
  if (ind.unit === '%')  return `${v.toFixed(2)}%`
  if (ind.unit === 'idx') return v.toFixed(1)
  return String(v)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function IndicatorCard({ ind }: { ind: EconomicIndicator }) {
  const isInverted    = ind.id === 'YIELD_SPREAD' && (ind.value ?? 0) < 0
  const hasChange     = ind.change !== null
  const positive      = (ind.change ?? 0) > 0
  const negative      = (ind.change ?? 0) < 0
  const changeColor   = positive
    ? 'var(--price-up)'
    : negative
      ? 'var(--price-down)'
      : 'var(--price-flat)'

  // For unemployment and inflation: up is bad
  const inverseIds = ['UNRATE', 'CPIAUCSL']
  const displayPositive = inverseIds.includes(ind.id) ? negative : positive

  return (
    <div
      className="flex flex-col gap-1 rounded border bg-[var(--surface)] p-2.5 transition hover:border-[var(--accent)]/30"
      style={{ borderColor: isInverted ? 'rgba(239,68,68,0.4)' : 'var(--border)' }}
    >
      {/* Name row */}
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {ind.name}
        </span>
        {isInverted && (
          <span className="shrink-0 rounded border border-red-500/40 bg-red-500/10 px-1 py-px font-mono text-[8px] font-bold text-red-400">
            INVERTED
          </span>
        )}
      </div>

      {/* Value */}
      <span
        className="font-mono text-[18px] font-bold leading-none tabular-nums text-[var(--text)]"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {formatValue(ind)}
      </span>

      {/* Change row */}
      <div className="flex items-center justify-between gap-1">
        {hasChange && ind.change !== null ? (
          ind.change === 0 ? (
            <span className="font-mono text-[9px] text-[var(--price-flat)]">UNCH</span>
          ) : (
            <span
              className="flex items-center gap-0.5 font-mono text-[9px] font-semibold tabular-nums"
              style={{ color: changeColor }}
            >
              {positive ? <ArrowUp /> : <ArrowDown />}
              {positive ? '+' : ''}{ind.change.toFixed(2)}
              {ind.unit === '%' ? 'pp' : ''}
            </span>
          )
        ) : (
          <span className="font-mono text-[9px] text-[var(--price-flat)]">—</span>
        )}
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
          {formatDate(ind.date)}
        </span>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <div className="skeleton h-2 w-20 rounded" />
      <div className="skeleton h-5 w-16 rounded" />
      <div className="skeleton h-2 w-12 rounded" />
    </div>
  )
}

export default function EconomicIndicators() {
  const { data, loading } = useFetch<EconomicIndicator[]>('/api/economics', { refreshInterval: 30 * 60_000 })
  const indicators = data ?? []

  const inverted = indicators.find((i) => i.id === 'YIELD_SPREAD' && (i.value ?? 0) < 0)

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Panel header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <rect x="1" y="9" width="3" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.4"/>
          <rect x="6" y="5" width="3" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.4"/>
          <rect x="11" y="1" width="3" height="14" rx="0.5" stroke="currentColor" strokeWidth="1.4"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Economic Indicators
        </span>
        <span className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-px font-mono text-[8px] text-[var(--text-muted)]">
          🇺🇸 US Data
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        {inverted && (
          <span className="rounded border border-red-500/40 bg-red-500/10 px-1.5 py-px font-mono text-[8px] font-bold text-red-400">
            ⚠ YIELD CURVE INVERTED
          </span>
        )}
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-40">FRED · 6H CACHE</span>
      </div>

      {/* Grid */}
      <div className="p-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
          : indicators.length === 0
            ? (
                <p className="col-span-full py-6 text-center font-mono text-[10px] text-[var(--text-muted)]">
                  Economic data unavailable
                </p>
              )
            : indicators.map((ind) => <IndicatorCard key={ind.id} ind={ind} />)
        }
      </div>
    </div>
  )
}
