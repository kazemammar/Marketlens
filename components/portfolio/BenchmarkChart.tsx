'use client'

import { useState, useEffect, useCallback } from 'react'
import type { BenchmarkPayload } from '@/app/api/portfolio/benchmark/route'

// ─── Types ────────────────────────────────────────────────────────────────────

type Range = '1mo' | '3mo' | '6mo' | '1y'

const RANGES: { key: Range; label: string; full: string }[] = [
  { key: '1mo', label: '1M', full: '1 month'   },
  { key: '3mo', label: '3M', full: '3 months'  },
  { key: '6mo', label: '6M', full: '6 months'  },
  { key: '1y',  label: '1Y', full: '1 year'    },
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

// ─── Return bar ───────────────────────────────────────────────────────────────

function ReturnBar({ pct, color }: { pct: number; color: string }) {
  // Map return to bar width: 0% → 0%, ±50% → 100%, clamped
  const width = Math.min(100, Math.abs(pct) * 2)
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width:      `${width}%`,
          background: color,
          opacity:    0.7,
          marginLeft: pct < 0 ? 'auto' : undefined,
        }}
      />
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-0 px-0">
      <div className="flex flex-col gap-2 p-4">
        <div className="h-3 w-16 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-8 w-28 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-3 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="mt-1 h-1.5 w-full animate-pulse rounded-full bg-[var(--surface-2)]" />
      </div>
      <div className="flex items-center justify-center border-x border-[var(--border)] px-4">
        <div className="h-10 w-16 animate-pulse rounded bg-[var(--surface-2)]" />
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="h-3 w-16 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-8 w-28 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-3 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="mt-1 h-1.5 w-full animate-pulse rounded-full bg-[var(--surface-2)]" />
      </div>
    </div>
  )
}

// ─── SPY-only state (no cost data) ────────────────────────────────────────────

function SpyOnlyCard({ spyReturn, rangeFull }: { spyReturn: number; rangeFull: string }) {
  const spyColor = spyReturn >= 0 ? 'var(--price-up)' : 'var(--price-down)'
  const spyRgb   = spyReturn >= 0 ? 'var(--price-up-rgb)' : 'var(--price-down-rgb)'
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-6">
      <div
        className="flex w-full max-w-sm flex-col gap-1 rounded-lg border border-[var(--border)] p-4"
        style={{ background: `rgba(${spyRgb}, 0.04)`, borderLeftWidth: '3px', borderLeftColor: spyColor }}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            S&amp;P 500 (SPY)
          </span>
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[8px]"
            style={{ background: `rgba(${spyRgb}, 0.12)`, color: spyColor }}
          >
            {rangeFull}
          </span>
        </div>
        <span
          className="font-mono text-[28px] font-bold tabular-nums leading-none"
          style={{ color: spyColor, textShadow: `0 0 20px rgba(${spyRgb}, 0.35)` }}
        >
          {fmtPct(spyReturn)}
        </span>
        <ReturnBar pct={spyReturn} color={spyColor} />
      </div>
      <p className="font-mono text-[9px] text-[var(--text-muted)] opacity-60 text-center max-w-[260px]">
        Add cost basis to your positions to compare your portfolio against the market
      </p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BenchmarkChart() {
  const [data,    setData]    = useState<BenchmarkPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [range,   setRange]   = useState<Range>('3mo')
  const [fading,  setFading]  = useState(false)
  const [snapCount, setSnapCount] = useState<number | null>(null)

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

  // Fetch snapshot count once to decide whether to show the "coming soon" note
  useEffect(() => {
    fetch('/api/portfolio/history?range=ALL')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.snapshots) setSnapCount(d.snapshots.length) })
      .catch(() => {})
  }, [])

  useEffect(() => { fetchData(range) }, [fetchData, range])

  const handleRange = (r: Range) => {
    setRange(r)
    fetchData(r, !!data)
  }

  // ── Derived values ──
  const hasPortfolioCost = (data?.portfolio.positionsWithCost ?? 0) > 0
  const portReturn       = hasPortfolioCost ? (data?.portfolio.totalReturn ?? null) : null
  const portReturnAmt    = hasPortfolioCost ? (data?.portfolio.totalReturnAmt ?? 0) : 0
  const spyReturn        = data?.spyReturn ?? 0
  const diff             = portReturn !== null ? portReturn - spyReturn : null
  const diffAhead        = diff !== null && diff >= 0
  const rangeFull        = RANGES.find((r) => r.key === range)?.full ?? ''

  const portColor = portReturn === null ? '#6b7280'
    : portReturn >= 0 ? 'var(--price-up)' : 'var(--price-down)'
  const portRgb   = portReturn === null ? '107,114,128'
    : portReturn >= 0 ? 'var(--price-up-rgb)' : 'var(--price-down-rgb)'

  const spyColor  = spyReturn >= 0 ? '#3b82f6' : 'var(--price-down)'
  const spyRgb    = spyReturn >= 0 ? '59,130,246' : 'var(--price-down-rgb)'

  const diffColor = diffAhead ? 'var(--price-up)' : 'var(--price-down)'
  const diffRgb   = diffAhead ? 'var(--price-up-rgb)' : 'var(--price-down-rgb)'

  const showSnapshotNote = snapCount !== null && snapCount < 5

  // ── Header (shared) ──
  const Header = (
    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: '#3b82f6' }} aria-hidden>
        <polyline points="1,12 4,7 7,9 10,4 15,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="1,14 4,10 7,12 10,7 15,5" stroke="var(--price-up)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
      </svg>
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text)]">
        Benchmark
      </span>
      <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-60">vs S&amp;P 500</span>
      <div className="ml-auto flex items-center gap-1">
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
        <Skeleton />
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
      ) : !hasPortfolioCost ? (
        <SpyOnlyCard spyReturn={spyReturn} rangeFull={rangeFull} />
      ) : (
        <div style={{ opacity: fading ? 0.4 : 1, transition: 'opacity 200ms' }}>

          {/* ── Three-column comparison ── */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr]">

            {/* LEFT — Portfolio */}
            <div
              className="flex flex-col gap-0.5 p-4"
              style={{ background: `rgba(${portRgb}, 0.04)` }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  Your Portfolio
                </span>
                <span
                  className="rounded px-1.5 py-0.5 font-mono text-[7px] font-semibold uppercase"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
                >
                  All-time
                </span>
              </div>
              <span
                className="font-mono text-[28px] font-bold tabular-nums leading-none"
                style={{ color: portColor, textShadow: `0 0 20px rgba(${portRgb}, 0.35)` }}
              >
                {fmtPct(portReturn!)}
              </span>
              <span className="mt-0.5 font-mono text-[12px] tabular-nums" style={{ color: portColor, opacity: 0.7 }}>
                {fmtAmt(portReturnAmt)}
              </span>
              <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-60">
                {data?.portfolio.positionsWithCost} of {data?.portfolio.totalPositions} positions with cost data
              </span>
              <ReturnBar pct={portReturn!} color={portColor} />
            </div>

            {/* CENTER — Diff */}
            <div className="flex flex-col items-center justify-center gap-1 border-y border-[var(--border)] p-4 text-center sm:border-x sm:border-y-0 sm:px-5">
              <div
                className="rounded-lg px-3 py-2"
                style={{ background: `rgba(${diffRgb}, 0.10)` }}
              >
                <span
                  className="font-mono text-[15px] font-bold tabular-nums leading-none"
                  style={{ color: diffColor, textShadow: `0 0 12px rgba(${diffRgb}, 0.4)` }}
                >
                  {diffAhead ? '▲' : '▼'} {Math.abs(diff!).toFixed(1)}%
                </span>
              </div>
              <span
                className="font-mono text-[8px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: diffColor, opacity: 0.8 }}
              >
                {diffAhead ? 'ahead' : 'behind'}
              </span>
              <span className="font-mono text-[7px] text-[var(--text-muted)] opacity-40">vs SPY {rangeFull}</span>
            </div>

            {/* RIGHT — SPY */}
            <div
              className="flex flex-col gap-0.5 p-4"
              style={{ background: spyReturn >= 0 ? 'rgba(59,130,246,0.04)' : `rgba(${spyRgb},0.04)` }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  S&amp;P 500 (SPY)
                </span>
                <span
                  className="rounded px-1.5 py-0.5 font-mono text-[7px] font-semibold uppercase"
                  style={{ background: `rgba(${spyRgb}, 0.12)`, color: spyColor }}
                >
                  {rangeFull}
                </span>
              </div>
              <span
                className="font-mono text-[28px] font-bold tabular-nums leading-none"
                style={{ color: spyColor, textShadow: `0 0 20px rgba(${spyRgb}, 0.35)` }}
              >
                {fmtPct(spyReturn)}
              </span>
              <span className="mt-0.5 font-mono text-[12px] tabular-nums text-transparent select-none">
                &nbsp;
              </span>
              <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-60">
                iShares S&amp;P 500 ETF · Yahoo Finance
              </span>
              <ReturnBar pct={spyReturn} color={spyColor} />
            </div>
          </div>

          {/* ── Snapshot note ── */}
          {showSnapshotNote && (
            <div className="mx-3 mb-3 mt-1 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
              <p className="font-mono text-[8px] text-[var(--text-muted)] opacity-70">
                <span className="opacity-60">📈 </span>
                Once daily snapshots accumulate, your portfolio performance will be tracked over time in the chart below.
                Snapshots are taken automatically after market close.
              </p>
            </div>
          )}

          {/* ── Footer ── */}
          <p className="border-t border-[var(--border)] px-3 py-1.5 font-mono text-[8px] text-[var(--text-muted)] opacity-40">
            Portfolio return calculated from cost basis · S&amp;P 500 data via Yahoo Finance
          </p>
        </div>
      )}
    </div>
  )
}
