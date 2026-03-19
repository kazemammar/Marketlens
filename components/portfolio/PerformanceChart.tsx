'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts'
import type { HistoryPayload } from '@/app/api/portfolio/history/route'

// ─── Types ────────────────────────────────────────────────────────────────────

type Range = '1M' | '3M' | '6M' | '1Y' | 'ALL'

const RANGES: { key: Range; label: string }[] = [
  { key: '1M',  label: '1M'  },
  { key: '3M',  label: '3M'  },
  { key: '6M',  label: '6M'  },
  { key: '1Y',  label: '1Y'  },
  { key: 'ALL', label: 'All' },
]

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtPct(n: number, showSign = true): string {
  const sign = showSign && n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

function fmtVal(n: number): string {
  const abs  = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(2)}`
}

function fmtDate(dateStr: string, short = false): string {
  const [, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', {
    month: short ? 'short' : 'long',
    day:   'numeric',
    ...(short ? {} : { year: 'numeric' }),
  }).format(new Date(2000, m - 1, d))
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const snap = payload[0]?.payload
  const formatted = new Date(label + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  return (
    <div className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-black/50">
      <p className="mb-1 font-mono text-[9px] text-[var(--text-muted)]">{formatted}</p>
      <p className="font-mono text-[11px] font-bold" style={{ color: snap.returnPct >= 0 ? '#10b981' : '#ef4444' }}>
        {fmtPct(snap.returnPct)}
      </p>
      <p className="font-mono text-[10px] text-[var(--text-muted)]">
        {fmtVal(snap.totalValue)} · cost {fmtVal(snap.totalCost)}
      </p>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-3 pb-3 pt-2">
      <div className="h-[180px] w-full animate-pulse rounded bg-[var(--surface-2)]" />
      <div className="flex gap-3">
        <div className="h-[48px] flex-1 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-[48px] flex-1 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-[48px] flex-1 animate-pulse rounded bg-[var(--surface-2)]" />
      </div>
    </div>
  )
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState() {
  const [snapping,    setSnapping]    = useState(false)
  const [snapSuccess, setSnapSuccess] = useState(false)
  const [snapError,   setSnapError]   = useState<string | null>(null)

  const handleSnapshot = async () => {
    setSnapping(true)
    setSnapError(null)
    try {
      const res = await fetch('/api/portfolio/snapshot', { method: 'POST' })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Failed')
      }
      setSnapSuccess(true)
    } catch (err) {
      setSnapError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSnapping(false)
    }
  }

  if (snapSuccess) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#10b981]/15">
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden>
            <polyline points="2,8 6,12 14,4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p className="font-mono text-[11px] font-semibold text-[var(--text)]">First snapshot saved!</p>
        <p className="font-mono text-[9px] text-[var(--text-muted)] opacity-70 max-w-[220px] text-center">
          Daily snapshots are taken automatically after market close. Come back tomorrow to see your first chart.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-[var(--text-muted)] opacity-30" aria-hidden>
        <polyline points="3,17 7,11 11,14 15,7 21,5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="3" y1="21" x2="21" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <div>
        <p className="font-mono text-[11px] font-semibold text-[var(--text)]">No performance history yet</p>
        <p className="mt-0.5 font-mono text-[9px] text-[var(--text-muted)] opacity-70 max-w-[220px]">
          Start tracking your portfolio. Take your first snapshot to begin.
        </p>
      </div>
      {snapError && (
        <p className="font-mono text-[9px] text-[#ef4444]">{snapError}</p>
      )}
      <button
        onClick={handleSnapshot}
        disabled={snapping}
        className="rounded px-3 py-1.5 font-mono text-[10px] font-semibold transition-opacity disabled:opacity-50"
        style={{ background: 'var(--accent)', color: '#000' }}
      >
        {snapping ? 'Taking snapshot…' : 'Take First Snapshot'}
      </button>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PerformanceChart() {
  const [data,    setData]    = useState<HistoryPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [range,   setRange]   = useState<Range>('3M')
  const [fading,  setFading]  = useState(false)

  const fetchData = useCallback(async (r: Range, silent = false) => {
    if (!silent) { setLoading(true); setError(false) }
    else         { setFading(true) }
    try {
      const res = await fetch(`/api/portfolio/history?range=${r}`)
      if (!res.ok) throw new Error('fetch failed')
      setData(await res.json() as HistoryPayload)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setFading(false)
    }
  }, [])

  useEffect(() => { fetchData(range) }, [fetchData, range])

  const handleRange = (r: Range) => {
    setRange(r)
    fetchData(r, !!data)
  }

  // ── Derived ──
  const snapshots = data?.snapshots ?? []
  const latest    = snapshots[snapshots.length - 1]
  const first     = snapshots[0]
  const isPositive = (latest?.returnPct ?? 0) >= 0
  const lineColor  = isPositive ? '#10b981' : '#ef4444'

  const tickStep = Math.max(1, Math.floor(snapshots.length / 6))
  const ticks    = snapshots.filter((_, i) => i % tickStep === 0).map((s) => s.date)

  const isEmpty    = !loading && !error && snapshots.length === 0
  const isSingle   = !loading && !error && snapshots.length === 1

  // Hide entirely until there are enough snapshots to draw a meaningful chart
  if (!loading && !error && snapshots.length > 0 && snapshots.length < 3) return null

  // ── Shared header ──
  const Header = (
    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: '#10b981' }} aria-hidden>
        <polyline points="1,13 4,8 7,10 10,5 15,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
        Performance
      </span>
      <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-60">Portfolio history</span>
      <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      <div className="flex items-center gap-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => handleRange(r.key)}
            className="rounded px-2 py-0.5 font-mono text-[9px] font-semibold transition-colors"
            style={range === r.key ? {
              background: 'var(--accent)',
              color:      '#000',
            } : {
              background: 'var(--surface-2)',
              color:      'var(--text-muted)',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  )

  // ── Single snapshot: show summary card instead of chart ──
  if (isSingle) {
    const snap = snapshots[0]
    const snapColor = snap.returnPct >= 0 ? 'var(--price-up)' : 'var(--price-down)'
    const snapGlow  = snap.returnPct >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'
    return (
      <div className="flex flex-col">
        {Header}
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <div
            className="font-mono text-[32px] font-bold tabular-nums"
            style={{ color: snapColor, textShadow: `0 0 20px ${snapGlow}` }}
          >
            {snap.returnPct >= 0 ? '+' : ''}{snap.returnPct.toFixed(2)}%
          </div>
          <p className="font-mono text-[11px] text-[var(--text-muted)]">
            Portfolio value: ${snap.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
          <p className="font-mono text-[9px] text-[var(--text-muted)] opacity-50">
            First snapshot taken {snap.date} · Chart appears after 2+ days of data
          </p>
          <p className="font-mono text-[8px] text-[var(--text-muted)] opacity-40">
            Daily snapshots are taken automatically after market close
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {Header}

      {/* Body */}
      {loading && !data ? (
        <ChartSkeleton />
      ) : error && !data ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10">
          <p className="font-mono text-[11px] text-[var(--text-muted)]">Unable to load history</p>
          <button
            onClick={() => fetchData(range)}
            className="font-mono text-[10px] text-[var(--accent)] hover:underline"
          >
            Retry
          </button>
        </div>
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <div style={{ opacity: fading ? 0.4 : 1, transition: 'opacity 200ms' }}>

          {/* Chart */}
          <div className="px-1 pt-2">
            <div className="w-full" style={{ minHeight: '180px', minWidth: '100px' }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={snapshots} margin={{ top: 8, right: 12, bottom: 0, left: 5 }}>
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={lineColor} stopOpacity={0.20} />
                    <stop offset="95%" stopColor={lineColor} stopOpacity={0}    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.3}
                  vertical={false}
                />

                <XAxis
                  dataKey="date"
                  ticks={ticks}
                  tickFormatter={(d: string) =>
                    new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }
                  tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[
                    (dataMin: number) => Math.min(dataMin - 5, -5),
                    (dataMax: number) => Math.max(dataMax + 5, 5),
                  ]}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                />

                <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />

                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                />

                <Area
                  type="monotone"
                  dataKey="returnPct"
                  stroke={lineColor}
                  strokeWidth={2}
                  fill="url(#perfGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
            </div>
          </div>

          {/* Summary row */}
          {first && latest && (
            <div className="flex items-center gap-3 px-3 pb-3 pt-2">
              {/* Start */}
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Start</span>
                <span className="font-mono text-[12px] font-bold tabular-nums text-[var(--text)]">
                  {fmtVal(first.totalValue)}
                </span>
                <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
                  {fmtDate(first.date, true)}
                </span>
              </div>

              {/* Arrow */}
              <div className="flex flex-1 items-center justify-center">
                <div className="h-px flex-1" style={{ background: `linear-gradient(to right, var(--border), ${lineColor}40)` }} />
                <span className="mx-1 font-mono text-[10px]" style={{ color: lineColor }}>
                  {isPositive ? '→' : '→'}
                </span>
                <div className="h-px flex-1" style={{ background: `linear-gradient(to right, ${lineColor}40, var(--border))` }} />
              </div>

              {/* Return */}
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className="font-mono text-[16px] font-bold tabular-nums leading-none"
                  style={{ color: lineColor, textShadow: `0 0 12px ${lineColor}40` }}
                >
                  {fmtPct(latest.returnPct)}
                </span>
                <span className="font-mono text-[8px] uppercase tracking-wide" style={{ color: lineColor, opacity: 0.7 }}>
                  Total Return
                </span>
              </div>

              {/* Arrow */}
              <div className="flex flex-1 items-center justify-center">
                <div className="h-px flex-1" style={{ background: `linear-gradient(to right, var(--border), ${lineColor}40)` }} />
                <span className="mx-1 font-mono text-[10px]" style={{ color: lineColor }}>→</span>
                <div className="h-px flex-1" style={{ background: `linear-gradient(to right, ${lineColor}40, var(--border))` }} />
              </div>

              {/* Current */}
              <div className="flex flex-col items-end gap-0.5">
                <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Now</span>
                <span className="font-mono text-[12px] font-bold tabular-nums text-[var(--text)]">
                  {fmtVal(latest.totalValue)}
                </span>
                <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
                  {fmtDate(latest.date, true)}
                </span>
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="border-t border-[var(--border)] px-3 py-1.5 font-mono text-[8px] text-[var(--text-muted)] opacity-40">
            Daily snapshots taken after market close · return calculated from cost basis
          </p>
        </div>
      )}
    </div>
  )
}
