'use client'

import Link from 'next/link'
import { useFetch } from '@/lib/hooks/useFetch'

interface WatchlistItem {
  symbol: string
  asset_type: string
}

interface QuoteRaw {
  price: number
  changePercent: number
}

const THRESHOLD = 3 // percent

export default function WatchlistAlerts() {
  const { data: watchlist } = useFetch<WatchlistItem[]>('/api/watchlist', { refreshInterval: 2 * 60_000 })

  const symbols = watchlist?.map((w) => w.symbol).join(',') ?? ''
  const { data: quotes } = useFetch<Record<string, QuoteRaw>>(
    symbols ? `/api/quotes?symbols=${encodeURIComponent(symbols)}` : null,
    { refreshInterval: 2 * 60_000 },
  )

  if (!watchlist || !quotes) return null

  const alerts = watchlist
    .filter((w) => {
      const q = quotes[w.symbol]
      return q && Math.abs(q.changePercent) >= THRESHOLD
    })
    .map((w) => ({
      symbol: w.symbol,
      type: w.asset_type,
      changePercent: quotes[w.symbol].changePercent,
      price: quotes[w.symbol].price,
    }))
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))

  if (alerts.length === 0) return null

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-3 py-1.5 sm:px-4 scrollbar-hide"
      style={{
        background: 'linear-gradient(90deg, rgba(var(--price-down-rgb),0.04) 0%, transparent 50%, rgba(var(--price-up-rgb),0.04) 100%)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <span className="shrink-0 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        Watchlist Alert
      </span>
      <div className="h-3 w-px bg-[var(--border)] shrink-0" />
      {alerts.map((a) => {
        const up = a.changePercent >= 0
        const color = up ? 'var(--price-up)' : 'var(--price-down)'
        return (
          <Link
            key={a.symbol}
            href={`/asset/${a.type}/${encodeURIComponent(a.symbol)}`}
            className="flex shrink-0 items-center gap-1.5 rounded border border-[var(--border)] px-2 py-0.5 transition hover:border-[var(--accent)]/50"
          >
            <span className="font-mono text-[10px] font-bold text-[var(--text)]">{a.symbol}</span>
            <span className="font-mono text-[10px] font-bold tabular-nums" style={{ color }}>
              {up ? '▲' : '▼'} {up ? '+' : ''}{a.changePercent.toFixed(2)}%
            </span>
          </Link>
        )
      })}
    </div>
  )
}
