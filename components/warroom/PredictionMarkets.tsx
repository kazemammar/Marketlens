'use client'

import { useEffect, useState } from 'react'
import type { PolymarketMarket } from '@/lib/api/polymarket'

const REFRESH_MS = 5 * 60 * 1000 // 5 minutes

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
  return `$${v}`
}

function formatEndDate(s: string): string {
  if (!s) return ''
  try {
    return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
  } catch {
    return s.slice(0, 10)
  }
}

function yesPct(p: number): number {
  return Math.round(p * 100)
}

function yesColor(p: number): string {
  const pct = yesPct(p)
  if (pct >= 70) return '#00ff88'
  if (pct >= 40) return '#f59e0b'
  return '#ff4444'
}

function MarketRow({ market }: { market: PolymarketMarket }) {
  const pct   = yesPct(market.yesPrice)
  const color = yesColor(market.yesPrice)

  return (
    <div className="border-b border-[var(--border)] px-3 py-2.5 transition hover:bg-[var(--surface-2)]">
      <div className="flex items-start gap-3">
        {/* Question */}
        <div className="min-w-0 flex-1">
          <p
            className="font-mono text-[11px] leading-snug text-[#e0e0e0] line-clamp-2"
            title={market.question}
          >
            {market.question}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="font-mono text-[9px] text-[var(--text-muted)]">
              Vol: {formatVolume(market.volume)}
            </span>
            {market.endDate && (
              <span className="font-mono text-[9px] text-[var(--text-muted)]">
                · Ends {formatEndDate(market.endDate)}
              </span>
            )}
          </div>
        </div>

        {/* YES % */}
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span
            className="font-mono text-[20px] font-bold tabular-nums leading-none"
            style={{ color, fontFamily: 'var(--font-mono)', textShadow: `0 0 8px ${color}40` }}
          >
            {pct}%
          </span>
          <span className="font-mono text-[8px] text-[var(--text-muted)]">YES</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color, opacity: 0.85 }}
        />
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="border-b border-[var(--border)] px-3 py-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1.5">
          <div className="skeleton h-2.5 w-full rounded" />
          <div className="skeleton h-2 w-2/3 rounded" />
          <div className="skeleton h-2 w-1/3 rounded" />
        </div>
        <div className="skeleton h-7 w-10 rounded" />
      </div>
      <div className="skeleton mt-2 h-1 w-full rounded-full" />
    </div>
  )
}

export default function PredictionMarkets() {
  const [markets, setMarkets] = useState<PolymarketMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  async function load() {
    try {
      const res  = await fetch('/api/predictions')
      const data = await res.json() as PolymarketMarket[]
      setMarkets(data)
      setError(false)
    } catch {
      setError(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white">
            Prediction Markets
          </span>
          <span className="rounded border border-[var(--border)] px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Polymarket
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="live-dot inline-block h-1 w-1 rounded-full" style={{ background: 'var(--accent)' }} />
          <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">5MIN</span>
        </div>
      </div>

      {/* Market rows */}
      <div>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : error || markets.length === 0 ? (
          <p className="py-8 text-center font-mono text-[10px] text-[var(--text-muted)]">
            {error ? 'Prediction market data unavailable' : 'No relevant markets found'}
          </p>
        ) : (
          markets.map((m) => <MarketRow key={m.id} market={m} />)
        )}
      </div>
    </div>
  )
}
