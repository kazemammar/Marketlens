'use client'

import { useEffect, useState } from 'react'
import { formatPrice } from '@/lib/utils/formatters'

interface TechSignal {
  name:   string
  value:  string
  signal: 'bullish' | 'bearish' | 'neutral'
}

interface PriceContext {
  price:        number
  week52High:   number | null
  week52Low:    number | null
  targetHigh:   number | null
  targetLow:    number | null
  targetMedian: number | null
}

interface TechData {
  signals:       TechSignal[]
  priceContext:  PriceContext | null
  overallSignal: 'bullish' | 'bearish' | 'neutral'
  bullCount:     number
  bearCount:     number
  neutralCount:  number
}

const SIGNAL_COLOR = {
  bullish: 'var(--price-up)',
  bearish: 'var(--price-down)',
  neutral: '#f59e0b',
} as const

const OVERALL_LABEL = {
  bullish: 'BULLISH',
  bearish: 'BEARISH',
  neutral: 'NEUTRAL',
} as const

export default function TechnicalSummary({ symbol }: { symbol: string }) {
  const [data,    setData]    = useState<TechData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/stock/technicals/${symbol}`)
      .then(r => r.json())
      .then((d: TechData) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [symbol])

  const sig      = data?.overallSignal ?? 'neutral'
  const sigColor = SIGNAL_COLOR[sig]
  const total    = (data?.bullCount ?? 0) + (data?.bearCount ?? 0) + (data?.neutralCount ?? 0)
  const bullPct  = total > 0 ? ((data?.bullCount ?? 0) / total) * 100 : 0
  const bearPct  = total > 0 ? ((data?.bearCount ?? 0) / total) * 100 : 0

  const pc   = data?.priceContext
  const hasRange = pc?.week52High && pc?.week52Low
  const rangePct = hasRange && pc
    ? Math.min(Math.max(((pc.price - pc.week52Low!) / (pc.week52High! - pc.week52Low!)) * 100, 0), 100)
    : null
  const targetPct = hasRange && pc?.targetMedian
    ? Math.min(Math.max(((pc.targetMedian - pc.week52Low!) / (pc.week52High! - pc.week52Low!)) * 100, 0), 100)
    : null

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 mb-2.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <polyline points="1,12 4,8 7,10 10,5 13,3 15,3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white">
          Technical Analysis
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      </div>

      {loading ? (
        <div className="bg-[var(--surface)] px-4 py-4">
          <div className="mb-3 flex items-center gap-4">
            <div className="skeleton h-9 w-28 rounded" />
            <div className="space-y-1.5">
              <div className="skeleton h-2.5 w-36 rounded" />
              <div className="skeleton h-2 w-24 rounded" />
            </div>
          </div>
          <div className="skeleton mb-4 h-2 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between bg-[var(--surface)] px-3 py-2">
                <div className="skeleton h-2 w-20 rounded" />
                <div className="skeleton h-2.5 w-12 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : !data || data.signals.length === 0 ? (
        <p className="bg-[var(--surface)] px-4 py-6 font-mono text-[10px] text-[var(--text-muted)]">
          Fundamental data unavailable for this symbol
        </p>
      ) : (
        <div className="bg-[var(--surface)]">
          {/* Overall signal + count bar */}
          <div className="px-4 pt-3 pb-2">
            <div className="mb-2 flex items-center gap-4">
              <span
                className="font-mono text-[28px] font-bold leading-none tabular-nums"
                style={{ color: sigColor, textShadow: `0 0 20px ${sigColor}40` }}
              >
                {OVERALL_LABEL[sig]}
              </span>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 font-mono text-[9px]">
                  <span style={{ color: 'var(--price-up)' }}>{data.bullCount} Bullish</span>
                  <span className="text-[var(--text-muted)] opacity-40">·</span>
                  <span style={{ color: 'var(--price-down)' }}>{data.bearCount} Bearish</span>
                  <span className="text-[var(--text-muted)] opacity-40">·</span>
                  <span className="text-[var(--text-muted)]">{data.neutralCount} Neutral</span>
                </div>
                <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-40">
                  based on {total} signals
                </span>
              </div>
            </div>

            {/* Bull/bear bar */}
            <div className="flex h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${bullPct}%`, background: 'var(--price-up)' }}
              />
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${100 - bullPct - bearPct}%`, background: '#f59e0b' }}
              />
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${bearPct}%`, background: 'var(--price-down)' }}
              />
            </div>
          </div>

          {/* Signal cards grid */}
          <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-4">
            {data.signals.map((sig, i) => (
              <div key={i} className="flex items-center justify-between gap-2 bg-[var(--surface)] px-3 py-2 hover:bg-[var(--surface-2)]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: SIGNAL_COLOR[sig.signal] }}
                  />
                  <span className="truncate font-mono text-[9px] text-[var(--text-muted)]">{sig.name}</span>
                </div>
                <span
                  className="shrink-0 font-mono text-[10px] font-semibold tabular-nums"
                  style={{ color: SIGNAL_COLOR[sig.signal] }}
                >
                  {sig.value}
                </span>
              </div>
            ))}
          </div>

          {/* 52W range bar with price + target markers */}
          {hasRange && pc && (
            <div className="border-t border-[var(--border)] px-4 py-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  52-Week Range
                </span>
                {pc.targetMedian && (
                  <span className="font-mono text-[8px] text-[var(--text-muted)]">
                    Target: <span className="text-white">{formatPrice(pc.targetMedian)}</span>
                  </span>
                )}
              </div>

              <div className="relative h-2 overflow-visible rounded-full bg-[var(--surface-3)]">
                {/* Fill up to current price */}
                {rangePct !== null && (
                  <div
                    className="absolute top-0 left-0 h-full rounded-full opacity-20"
                    style={{ width: `${rangePct}%`, background: SIGNAL_COLOR[sig] }}
                  />
                )}
                {/* Current price marker */}
                {rangePct !== null && (
                  <div
                    className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ left: `${rangePct}%`, background: SIGNAL_COLOR[sig] }}
                    title={`Current: ${formatPrice(pc.price)}`}
                  />
                )}
                {/* Analyst target marker */}
                {targetPct !== null && (
                  <div
                    className="absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70"
                    style={{ left: `${targetPct}%`, background: '#f59e0b' }}
                    title={`Target: ${formatPrice(pc.targetMedian!)}`}
                  />
                )}
              </div>

              <div className="mt-1 flex justify-between font-mono text-[8px] text-[var(--text-muted)]">
                <span>{formatPrice(pc.week52Low!)}</span>
                <span>52W LOW → HIGH</span>
                <span>{formatPrice(pc.week52High!)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
