'use client'

import type { PolymarketMarket } from '@/lib/api/polymarket'
import { useFetch } from '@/lib/hooks/useFetch'

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
  if (pct >= 70) return 'var(--price-up)'
  if (pct >= 40) return 'var(--warning)'
  return 'var(--price-down)'
}

function MarketRow({ market }: { market: PolymarketMarket }) {
  const pct   = yesPct(market.yesPrice)
  const color = yesColor(market.yesPrice)

  return (
    <a
      href={`https://polymarket.com/event/${market.slug ?? market.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 bg-[var(--surface)] px-3 py-2.5 transition hover:bg-[var(--surface-2)] cursor-pointer"
    >
      {/* YES % ring — 48px */}
      <div
        className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${color} ${pct}%, var(--surface-3) ${pct}%)` }}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface)] group-hover:bg-[var(--surface-2)] transition-colors">
          <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color }}>
            {pct}%
          </span>
        </div>
      </div>

      {/* Question + meta */}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-mono text-[10px] font-medium leading-snug text-[var(--text-2)] group-hover:text-[var(--text)] transition-colors" title={market.question}>
          {market.question}
        </p>
        {/* Probability bar */}
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-mono text-[8px] text-[var(--text-muted)]">
            {formatVolume(market.volume)} vol
          </span>
          {market.endDate && (
            <span className="font-mono text-[8px] text-[var(--text-muted)]">
              · ends {formatEndDate(market.endDate)}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 bg-[var(--surface)] px-3 py-2.5">
      <div className="skeleton h-12 w-12 shrink-0 rounded-full" />
      <div className="flex-1 space-y-1.5 pt-1">
        <div className="skeleton h-3 w-full rounded" />
        <div className="skeleton h-2.5 w-3/4 rounded" />
        <div className="skeleton h-1 w-full rounded-full" />
        <div className="skeleton h-2 w-1/3 rounded" />
      </div>
    </div>
  )
}

export default function PredictionMarkets() {
  const { data, loading, error } = useFetch<PolymarketMarket[]>('/api/predictions', { refreshInterval: 5 * 60_000 })
  const markets = data ?? []

  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
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

      {/* Market grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-px bg-[var(--border)] sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : error || markets.length === 0 ? (
        <p className="py-8 text-center font-mono text-[10px] text-[var(--text-muted)]">
          {error ? 'Prediction market data unavailable' : 'No relevant markets found'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-[var(--border)] sm:grid-cols-2">
          {markets.map((m) => <MarketRow key={m.id} market={m} />)}
        </div>
      )}
    </div>
  )
}
