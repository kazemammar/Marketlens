'use client'

import { useEffect, useState } from 'react'
import type { TechnicalIndicators } from '@/lib/utils/types'
import { formatPrice } from '@/lib/utils/formatters'

interface TechData {
  indicators: TechnicalIndicators | null
  supportResistance: number[]
}

export default function TechnicalSummary({ symbol, currentPrice }: { symbol: string; currentPrice?: number }) {
  const [data, setData] = useState<TechData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/stock/technicals/${symbol}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [symbol])

  const sig = data?.indicators?.signal
  const sigColor = sig === 'buy' ? 'var(--price-up)' : sig === 'sell' ? 'var(--price-down)' : '#f59e0b'
  const sigLabel = sig ? sig.toUpperCase() : '—'

  const totalIndicators = (data?.indicators?.buy ?? 0) + (data?.indicators?.sell ?? 0) + (data?.indicators?.neutral ?? 0)
  const buyPct     = totalIndicators > 0 ? ((data?.indicators?.buy ?? 0) / totalIndicators) * 100 : 0
  const neutralPct = totalIndicators > 0 ? ((data?.indicators?.neutral ?? 0) / totalIndicators) * 100 : 0
  const sellPct    = totalIndicators > 0 ? ((data?.indicators?.sell ?? 0) / totalIndicators) * 100 : 0

  // Sort S/R levels: below current = support, above = resistance
  const price = currentPrice ?? 0
  const levels = [...(data?.supportResistance ?? [])].sort((a, b) => a - b)
  const supports    = levels.filter(l => l < price).slice(-3)   // closest 3 below
  const resistances = levels.filter(l => l > price).slice(0, 3) // closest 3 above

  return (
    <div className="border-b border-[var(--border)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <polyline points="1,12 4,8 7,10 10,5 13,3 15,3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-white">
          Technical Analysis
        </span>
      </div>

      {loading ? (
        <div className="flex gap-px bg-[var(--border)]">
          <div className="flex-1 bg-[var(--surface)] px-4 py-4">
            <div className="skeleton mb-2 h-10 w-20 rounded" />
            <div className="skeleton h-3 w-full rounded-full" />
          </div>
          <div className="flex-1 bg-[var(--surface)] px-4 py-4">
            <div className="skeleton h-2.5 w-24 rounded" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-px bg-[var(--border)] sm:flex-row">
          {/* Signal + bar */}
          <div className="flex-1 bg-[var(--surface)] px-4 py-3">
            <div className="mb-3 flex items-center gap-3">
              {data?.indicators ? (
                <>
                  <span
                    className="font-mono text-[32px] font-bold leading-none"
                    style={{ color: sigColor, textShadow: `0 0 20px ${sigColor}40` }}
                  >
                    {sigLabel}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[9px] text-[var(--text-muted)]">{data.indicators.buy} buy · {data.indicators.neutral} neutral · {data.indicators.sell} sell</span>
                    <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">of {totalIndicators} indicators</span>
                  </div>
                </>
              ) : (
                <span className="font-mono text-[13px] text-[var(--text-muted)]">Technical data unavailable</span>
              )}
            </div>

            {data?.indicators && (
              <div className="flex h-2 overflow-hidden rounded-full">
                <div className="transition-all duration-700" style={{ width: `${buyPct}%`, background: 'var(--price-up)' }} />
                <div className="transition-all duration-700" style={{ width: `${neutralPct}%`, background: '#f59e0b' }} />
                <div className="transition-all duration-700" style={{ width: `${sellPct}%`, background: 'var(--price-down)' }} />
              </div>
            )}
          </div>

          {/* S/R Levels */}
          {levels.length > 0 && price > 0 && (
            <div className="flex-1 bg-[var(--surface)] px-4 py-3">
              <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Support &amp; Resistance
              </p>
              <div className="space-y-1">
                {resistances.reverse().map((l, i) => (
                  <div key={`r${i}`} className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[8px] uppercase" style={{ color: 'var(--price-down)' }}>R{i + 1}</span>
                    <span className="font-mono text-[10px] tabular-nums text-white">{formatPrice(l)}</span>
                  </div>
                ))}
                {/* Current price marker */}
                <div className="flex items-center gap-1 border-y border-[var(--border)] py-1">
                  <span className="font-mono text-[8px] text-[var(--accent)]">▶</span>
                  <span className="font-mono text-[10px] font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
                    {formatPrice(price)}
                  </span>
                  <span className="font-mono text-[8px] text-[var(--text-muted)]">current</span>
                </div>
                {[...supports].reverse().map((l, i) => (
                  <div key={`s${i}`} className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[8px] uppercase" style={{ color: 'var(--price-up)' }}>S{i + 1}</span>
                    <span className="font-mono text-[10px] tabular-nums text-white">{formatPrice(l)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
