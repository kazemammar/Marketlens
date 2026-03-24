'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts'
import type { BenchmarkPayload } from '@/app/api/portfolio/benchmark/route'

// ─── Types ────────────────────────────────────────────────────────────────────

type Range     = '1mo' | '3mo' | '6mo' | '1y'
type Benchmark = 'spy' | 'btc'

const RANGES: { key: Range; label: string; full: string }[] = [
  { key: '1mo', label: '1M', full: '1 month'  },
  { key: '3mo', label: '3M', full: '3 months' },
  { key: '6mo', label: '6M', full: '6 months' },
  { key: '1y',  label: '1Y', full: '1 year'   },
]

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

function fmtAmt(n: number): string {
  const abs  = Math.abs(n)
  const sign = n >= 0 ? '+' : '−'
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(2)}`
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const date = new Date(label + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  return (
    <div className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-black/50">
      <p className="mb-1 font-mono text-[9px] text-[var(--text-muted)]">{date}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => {
        const val   = p.value as number
        const color = p.dataKey === 'portfolioReturn'
          ? (val >= 0 ? '#10b981' : '#ef4444')
          : p.color
        return (
          <p key={p.name} className="font-mono text-[11px] font-bold tabular-nums" style={{ color }}>
            {p.name}: {val >= 0 ? '+' : ''}{val.toFixed(2)}%
          </p>
        )
      })}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-3 pb-3 pt-2">
      <div className="h-[220px] w-full animate-pulse rounded bg-[var(--surface-2)]" />
      <div className="flex gap-3">
        <div className="h-[64px] flex-1 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-[64px] w-20 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-[64px] flex-1 animate-pulse rounded bg-[var(--surface-2)]" />
      </div>
    </div>
  )
}

// ─── Return bar ───────────────────────────────────────────────────────────────

function ReturnBar({ pct, color }: { pct: number; color: string }) {
  const width = Math.min(100, Math.abs(pct) * 2)
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${width}%`, background: color, opacity: 0.7 }}
      />
    </div>
  )
}

// ─── SPY-only state (no cost data) ────────────────────────────────────────────

function SpyOnlyCard({ spyReturn, rangeFull }: { spyReturn: number; rangeFull: string }) {
  const color = spyReturn >= 0 ? '#3b82f6' : 'var(--price-down)'
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      <div
        className="flex w-full max-w-sm flex-col gap-1 rounded border border-[var(--border)] p-4"
        style={{ borderLeftWidth: '3px', borderLeftColor: color }}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            S&amp;P 500 (SPY)
          </span>
          <span className="rounded px-1.5 py-0.5 font-mono text-[8px]" style={{ background: 'var(--surface-2)', color }}>
            {rangeFull}
          </span>
        </div>
        <span className="font-mono text-[28px] font-bold tabular-nums leading-none" style={{ color }}>
          {fmtPct(spyReturn)}
        </span>
        <ReturnBar pct={spyReturn} color={color} />
      </div>
      <p className="max-w-[260px] text-center font-mono text-[9px] text-[var(--text-muted)] opacity-60">
        Add cost basis to your positions to compare your portfolio against the market
      </p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BenchmarkChartProps {
  allTimeReturn?:     number
  allTimeReturnAmt?:  number
  totalCost?:         number
  totalValue?:        number
  positionsWithCost?: number
  totalPositions?:    number
}

export default function BenchmarkChart({
  allTimeReturn,
  allTimeReturnAmt,
  totalCost,
  totalValue,
  positionsWithCost,
  totalPositions,
}: BenchmarkChartProps) {
  const [data,      setData]      = useState<BenchmarkPayload | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(false)
  const [range,     setRange]     = useState<Range>('3mo')
  const [benchmark, setBenchmark] = useState<Benchmark>('spy')
  const [fading,    setFading]    = useState(false)
  const fetchData = useCallback(async (r: Range, silent = false, refresh = false, bm: Benchmark = 'spy') => {
    if (!silent) { setLoading(true); setError(false) }
    else         { setFading(true) }
    try {
      const params = new URLSearchParams({ range: r, benchmark: bm })
      if (refresh) params.set('refresh', 'true')
      const res = await fetch(`/api/portfolio/benchmark?${params}`)
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

  useEffect(() => { fetchData(range, false, false, benchmark) }, [fetchData, range, benchmark])

  const handleRange = (r: Range) => {
    setRange(r)
    fetchData(r, !!data, false, benchmark)
  }

  const handleBenchmark = (bm: Benchmark) => {
    setBenchmark(bm)
    fetchData(range, !!data, false, bm)
  }

  // ── Derived ──
  const series              = data?.series ?? []
  const hasData             = series.length > 0
  const hasPortfolioCost    = (data?.portfolio.positionsWithCost ?? 0) > 0
  const portRangeReturn     = data?.portfolioRangeReturn ?? 0
  // All-time values: prefer props from page (same quote source as summary bar), fall back to API
  const displayAllTimeReturn  = allTimeReturn    ?? data?.portfolio.totalReturn    ?? 0
  const displayAllTimeAmt     = allTimeReturnAmt ?? data?.portfolio.totalReturnAmt ?? 0
  const displayWithCost       = positionsWithCost ?? data?.portfolio.positionsWithCost ?? 0
  const displayTotal          = totalPositions    ?? data?.portfolio.totalPositions    ?? 0
  const spyReturn             = data?.spyReturn ?? 0
  // Center diff compares range returns (both from the same API response)
  const diff                  = portRangeReturn - spyReturn
  const diffAhead           = diff >= 0
  const rangeFull           = RANGES.find((r) => r.key === range)?.full ?? ''

  const portColor   = portRangeReturn >= 0 ? '#10b981' : 'var(--price-down)'
  const spyColor    = '#3b82f6'
  const diffColor   = diffAhead ? '#10b981' : 'var(--price-down)'
  const diffRgb     = diffAhead ? '16,185,129' : 'var(--price-down-rgb)'

  // Zero-line gradient offset
  const allValues   = series.map((d) => d.portfolioReturn)
  const maxVal      = Math.max(...allValues, 0)
  const minVal      = Math.min(...allValues, 0)
  const zeroRange   = maxVal - minVal
  const zeroOffset  = zeroRange > 0 ? maxVal / zeroRange : 0.5

  // X-axis ticks — ~6 labels
  const tickStep = Math.max(1, Math.floor(series.length / 6))
  const ticks    = series.filter((_, i) => i % tickStep === 0).map((d) => d.date)

  // ── Header ──
  const Header = (
    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: '#3b82f6' }} aria-hidden>
        <polyline points="1,12 4,7 7,9 10,4 15,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="1,14 4,10 7,12 10,7 15,5" stroke="#10b981" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
      </svg>
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
        Benchmark
      </span>
      <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-60">vs {benchmark === 'btc' ? 'Bitcoin' : 'S&P 500'}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      <div className="mr-2 flex items-center gap-0.5 rounded bg-[var(--surface-2)] p-0.5">
        {(['spy', 'btc'] as Benchmark[]).map((bm) => (
          <button
            key={bm}
            onClick={() => handleBenchmark(bm)}
            className="rounded px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase transition-colors"
            style={benchmark === bm
              ? { background: bm === 'btc' ? '#f59e0b' : '#3b82f6', color: '#000' }
              : { color: 'var(--text-muted)' }
            }
          >
            {bm === 'btc' ? 'BTC' : 'SPY'}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => handleRange(r.key)}
            className="rounded px-2 py-0.5 font-mono text-[9px] font-semibold transition-colors"
            style={range === r.key
              ? { background: 'var(--accent)', color: '#000' }
              : { background: 'var(--surface-2)', color: 'var(--text-muted)' }
            }
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col">
      {Header}

      {loading && !data ? (
        <ChartSkeleton />
      ) : error && !data ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10">
          <p className="font-mono text-[11px] text-[var(--text-muted)]">Unable to load benchmark data</p>
          <button onClick={() => fetchData(range)} className="font-mono text-[10px] text-[var(--accent)] hover:underline">
            Retry
          </button>
        </div>
      ) : !hasPortfolioCost ? (
        <SpyOnlyCard spyReturn={spyReturn} rangeFull={rangeFull} />
      ) : (
        <div style={{ opacity: fading ? 0.4 : 1, transition: 'opacity 200ms' }}>

          {/* ── Chart ── */}
          {hasData ? (
            <>
              <div className="px-1 pt-2">
                <div className="w-full" style={{ minHeight: '220px', minWidth: '100px' }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={series} margin={{ top: 10, right: 10, bottom: 0, left: 5 }}>
                      <defs>
                        {/* Portfolio fill — green above zero, red below */}
                        <linearGradient id="gradPortfolio" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"                          stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset={`${zeroOffset * 100}%`}      stopColor="#10b981" stopOpacity={0.05} />
                          <stop offset={`${zeroOffset * 100}%`}      stopColor="#ef4444" stopOpacity={0.05} />
                          <stop offset="100%"                        stopColor="#ef4444" stopOpacity={0.25} />
                        </linearGradient>
                        {/* Portfolio stroke — green above zero, red below */}
                        <linearGradient id="strokePortfolio" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"                          stopColor="#10b981" />
                          <stop offset={`${zeroOffset * 100}%`}      stopColor="#10b981" />
                          <stop offset={`${zeroOffset * 100}%`}      stopColor="#ef4444" />
                          <stop offset="100%"                        stopColor="#ef4444" />
                        </linearGradient>
                        {/* SPY fill — blue */}
                        <linearGradient id="gradSpy" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0}    />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.3} vertical={false} />

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
                        tickFormatter={(v) => `${(v as number).toFixed(0)}%`}
                        tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'monospace' }}
                        axisLine={false}
                        tickLine={false}
                        width={42}
                        domain={[
                          (dataMin: number) => Math.min(dataMin - 3, -3),
                          (dataMax: number) => Math.max(dataMax + 3,  3),
                        ]}
                      />

                      <ReferenceLine y={0} stroke="var(--text-muted)" strokeWidth={1} strokeOpacity={0.3} strokeDasharray="4 4" />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} />

                      {/* Portfolio line — green above zero, red below */}
                      <Area
                        type="monotone"
                        dataKey="portfolioReturn"
                        stroke="url(#strokePortfolio)"
                        strokeWidth={2}
                        fill="url(#gradPortfolio)"
                        dot={false}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        activeDot={(props: any) => {
                          const val = props.payload?.portfolioReturn ?? props.value ?? 0
                          const color = val >= 0 ? '#10b981' : '#ef4444'
                          return <circle cx={props.cx} cy={props.cy} r={3} fill={color} stroke="none" />
                        }}
                        name="Portfolio"
                        isAnimationActive={false}
                      />

                      {/* SPY line — blue */}
                      <Area
                        type="monotone"
                        dataKey="spyReturn"
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                        fill="url(#gradSpy)"
                        dot={false}
                        activeDot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                        name="S&P 500"
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 py-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-0.5 w-4">
                    <div className="h-full w-2 rounded-l-full bg-[#10b981]" />
                    <div className="h-full w-2 rounded-r-full bg-[#ef4444]" />
                  </div>
                  <span className="font-mono text-[9px] text-[var(--text-muted)]">Your Portfolio</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-0.5 w-4 rounded-full bg-[#3b82f6]" />
                  <span className="font-mono text-[9px] text-[var(--text-muted)]">{benchmark === 'btc' ? 'Bitcoin' : 'S&P 500'}</span>
                </div>
              </div>
            </>
          ) : (
            /* Fallback if history is empty */
            <div className="flex h-[60px] items-center justify-center">
              <p className="font-mono text-[9px] text-[var(--text-muted)] opacity-50">
                Historical data unavailable — check back later
              </p>
            </div>
          )}

          {/* ── Summary cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] border-t border-[var(--border)]">

            {/* LEFT — Portfolio */}
            <div className="flex flex-col gap-0.5 p-4">
              <div className="mb-1 flex items-center gap-1.5">
                <span className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Your Portfolio
                </span>
                <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                  {rangeFull}
                </span>
              </div>
              <span
                className="font-mono text-[28px] font-bold tabular-nums leading-none"
                style={{ color: portColor, textShadow: `0 0 20px ${portRangeReturn >= 0 ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}` }}
              >
                {fmtPct(portRangeReturn)}
              </span>
              <span className="mt-0.5 font-mono text-[10px] tabular-nums text-[var(--text-muted)] opacity-60">
                All-time: {fmtPct(displayAllTimeReturn)} ({fmtAmt(displayAllTimeAmt)})
              </span>
              <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-50">
                {displayWithCost} of {displayTotal} positions with cost data
              </span>
              <ReturnBar pct={portRangeReturn} color={portColor} />
            </div>

            {/* CENTER — Diff */}
            <div className="flex flex-col items-center justify-center gap-1 border-y border-[var(--border)] p-4 text-center sm:border-x sm:border-y-0 sm:px-5">
              <div className="rounded px-3 py-2" style={{ background: `rgba(${diffRgb}, 0.10)` }}>
                <span
                  className="font-mono text-[15px] font-bold tabular-nums leading-none"
                  style={{ color: diffColor, textShadow: `0 0 12px rgba(${diffRgb}, 0.4)` }}
                >
                  {diffAhead ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}%
                </span>
              </div>
              <span className="font-mono text-[8px] font-semibold uppercase tracking-[0.12em]" style={{ color: diffColor, opacity: 0.8 }}>
                {diffAhead ? 'ahead' : 'behind'}
              </span>
              <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-40">vs {benchmark === 'btc' ? 'BTC' : 'SPY'} {rangeFull}</span>
            </div>

            {/* RIGHT — SPY */}
            <div className="flex flex-col gap-0.5 p-4" style={{ background: 'rgba(59,130,246,0.04)' }}>
              <div className="mb-1 flex items-center gap-1.5">
                <span className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  {benchmark === 'btc' ? 'Bitcoin (BTC)' : 'S&P 500 (SPY)'}
                </span>
                <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase" style={{ background: 'rgba(59,130,246,0.12)', color: spyColor }}>
                  {rangeFull}
                </span>
              </div>
              <span
                className="font-mono text-[28px] font-bold tabular-nums leading-none"
                style={{ color: spyColor, textShadow: '0 0 20px rgba(59,130,246,0.35)' }}
              >
                {fmtPct(spyReturn)}
              </span>
              <span className="mt-0.5 font-mono text-[12px] tabular-nums text-transparent select-none">&nbsp;</span>
              <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-50">
                {benchmark === 'btc' ? 'BTC-USD · Yahoo Finance' : 'iShares S&P 500 ETF · Yahoo Finance'}
              </span>
              <ReturnBar pct={spyReturn} color={spyColor} />
            </div>
          </div>

          {/* ── Footer ── */}
          <p className="border-t border-[var(--border)] px-3 py-1.5 font-mono text-[8px] text-[var(--text-muted)] opacity-40">
            Chart shows cumulative % return from start of period · All data via Yahoo Finance
          </p>
        </div>
      )}
    </div>
  )
}
