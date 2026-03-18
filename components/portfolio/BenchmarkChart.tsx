'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts'
import type { BenchmarkPayload } from '@/app/api/portfolio/benchmark/route'

// ─── Types ───────────────────────────────────────────────────────────────────

type Range = '1mo' | '3mo' | '6mo' | '1y'

const RANGES: { key: Range; label: string }[] = [
  { key: '1mo', label: '1M' },
  { key: '3mo', label: '3M' },
  { key: '6mo', label: '6M' },
  { key: '1y',  label: '1Y' },
]

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtPct(n: number, showSign = true): string {
  const sign = showSign && n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

function fmtAmt(n: number): string {
  const abs  = Math.abs(n)
  const sign = n >= 0 ? '+' : '−'
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(2)}`
}

function fmtDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(2000, m - 1, d),
  )
}

// ─── Custom tooltip ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label, portfolioReturn }: any) {
  if (!active || !payload?.length) return null
  const spyVal: number = payload[0]?.value ?? 0
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-xl">
      <p className="mb-1 font-mono text-[9px] text-[var(--text-muted)]">{label}</p>
      <p className="font-mono text-[11px] font-bold" style={{ color: '#3b82f6' }}>
        S&amp;P 500: {fmtPct(spyVal)}
      </p>
      {portfolioReturn !== null && (
        <p
          className="font-mono text-[11px] font-bold"
          style={{ color: portfolioReturn >= 0 ? '#22c55e' : '#ef4444' }}
        >
          Your return: {fmtPct(portfolioReturn)}
        </p>
      )}
    </div>
  )
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  label, returnPct, returnAmt, color, sub,
}: {
  label:     string
  returnPct: number
  returnAmt?: number
  color:     string
  sub?:      string
}) {
  return (
    <div
      className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-md border px-3 py-2"
      style={{ borderColor: `${color}30`, background: `${color}08` }}
    >
      <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {label}
      </span>
      <span
        className="font-mono text-[18px] font-bold tabular-nums leading-none"
        style={{ color, textShadow: `0 0 12px ${color}40` }}
      >
        {fmtPct(returnPct)}
      </span>
      {returnAmt !== undefined && (
        <span className="font-mono text-[10px] tabular-nums" style={{ color, opacity: 0.7 }}>
          {fmtAmt(returnAmt)}
        </span>
      )}
      {sub && (
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">{sub}</span>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-3 pb-3 pt-2">
      <div className="h-[200px] w-full animate-pulse rounded-md bg-[var(--surface-2)]" />
      <div className="flex gap-3">
        <div className="h-[72px] flex-1 animate-pulse rounded-md bg-[var(--surface-2)]" />
        <div className="h-[72px] w-24 animate-pulse rounded-md bg-[var(--surface-2)]" />
        <div className="h-[72px] flex-1 animate-pulse rounded-md bg-[var(--surface-2)]" />
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BenchmarkChart() {
  const [data,    setData]    = useState<BenchmarkPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [range,   setRange]   = useState<Range>('3mo')
  const [fading,  setFading]  = useState(false)

  const fetchData = useCallback(async (r: Range, silent = false) => {
    if (!silent) { setLoading(true); setError(false) }
    else         { setFading(true) }
    try {
      const res = await fetch(`/api/portfolio/benchmark?range=${r}`)
      if (!res.ok) throw new Error('fetch failed')
      setData(await res.json() as BenchmarkPayload)
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
  const hasPortfolioCost = (data?.portfolio.positionsWithCost ?? 0) > 0
  const portReturn       = hasPortfolioCost ? (data?.portfolio.totalReturn ?? null) : null
  const portReturnAmt    = hasPortfolioCost ? (data?.portfolio.totalReturnAmt ?? 0) : 0
  const spyReturn        = data?.spyReturn ?? 0
  const diff             = portReturn !== null ? portReturn - spyReturn : null
  const portColor        = portReturn !== null
    ? (portReturn >= 0 ? '#22c55e' : '#ef4444')
    : '#6b7280'

  // Format x-axis ticks — show ~6 labels max
  const spyData  = data?.spy ?? []
  const tickStep = Math.max(1, Math.floor(spyData.length / 6))
  const ticks    = spyData.filter((_, i) => i % tickStep === 0).map((d) => d.date)

  return (
    <div className="flex flex-col">

      {/* Panel header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: '#3b82f6' }} aria-hidden>
          <polyline points="1,12 4,7 7,9 10,4 15,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="1,14 4,10 7,12 10,7 15,5" stroke="#22c55e" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
        </svg>
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text)]">
          Benchmark
        </span>
        <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-60">vs S&amp;P 500</span>

        {/* Range toggles */}
        <div className="ml-auto flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => handleRange(r.key)}
              className="rounded px-2 py-0.5 font-mono text-[9px] font-semibold transition-colors"
              style={range === r.key ? {
                background:  'var(--accent)',
                color:       '#000',
              } : {
                background:  'var(--surface-2)',
                color:       'var(--text-muted)',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {loading && !data ? (
        <ChartSkeleton />
      ) : error && !data ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10">
          <p className="font-mono text-[11px] text-[var(--text-muted)]">Unable to load benchmark data</p>
          <button
            onClick={() => fetchData(range)}
            className="font-mono text-[10px] text-[var(--accent)] hover:underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <div style={{ opacity: fading ? 0.4 : 1, transition: 'opacity 200ms' }}>

          {/* Chart */}
          <div className="px-1 pt-2" style={{ height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spyData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="spyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.20} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
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
                  tickFormatter={fmtDate}
                  tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  hide={false}
                />

                {/* Zero baseline */}
                <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />

                {/* Portfolio return reference line */}
                {portReturn !== null && (
                  <ReferenceLine
                    y={portReturn}
                    stroke={portColor}
                    strokeDasharray="5 3"
                    strokeWidth={1.5}
                    label={{
                      value:    `You: ${fmtPct(portReturn)}`,
                      position: 'right',
                      fill:     portColor,
                      fontSize: 8,
                      fontFamily: 'monospace',
                    }}
                  />
                )}

                <Tooltip
                  content={<CustomTooltip portfolioReturn={portReturn} />}
                  cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                />

                <Area
                  type="monotone"
                  dataKey="cumReturn"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#spyGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats row */}
          <div className="flex items-stretch gap-2 px-3 pb-3 pt-2">

            {/* Portfolio card */}
            {hasPortfolioCost && portReturn !== null ? (
              <StatCard
                label="Your Portfolio"
                returnPct={portReturn}
                returnAmt={portReturnAmt}
                color={portColor}
                sub={`${data?.portfolio.positionsWithCost} of ${data?.portfolio.totalPositions} positions`}
              />
            ) : (
              <div className="flex min-w-0 flex-1 items-center justify-center rounded-md border border-[var(--border)] px-3 py-2">
                <p className="font-mono text-[9px] text-[var(--text-muted)] opacity-60 text-center">
                  Add cost basis to<br/>see your return
                </p>
              </div>
            )}

            {/* Diff badge */}
            {diff !== null && (
              <div className="flex shrink-0 flex-col items-center justify-center gap-0.5">
                <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">vs</span>
                <span
                  className="font-mono text-[10px] font-bold tabular-nums"
                  style={{ color: diff >= 0 ? '#22c55e' : '#ef4444' }}
                >
                  {diff >= 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}%
                </span>
                <span
                  className="font-mono text-[7px] text-center"
                  style={{ color: diff >= 0 ? '#22c55e' : '#ef4444', opacity: 0.7 }}
                >
                  {diff >= 0 ? 'outperf.' : 'underperf.'}
                </span>
              </div>
            )}

            {/* SPY card */}
            <StatCard
              label="S&P 500 (SPY)"
              returnPct={spyReturn}
              color="#3b82f6"
              sub={`${range === '1mo' ? '1 month' : range === '3mo' ? '3 months' : range === '6mo' ? '6 months' : '1 year'}`}
            />
          </div>

          {/* Footer */}
          <p className="border-t border-[var(--border)] px-3 py-1.5 font-mono text-[8px] text-[var(--text-muted)] opacity-40">
            Portfolio return calculated from cost basis · SPY data via Yahoo Finance
          </p>
        </div>
      )}
    </div>
  )
}
