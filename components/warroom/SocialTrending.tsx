'use client'

import Link from 'next/link'
import { useFetch } from '@/lib/hooks/useFetch'
import type { StocktwitsSymbol } from '@/lib/api/stocktwits'

function formatWatchlist(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

export default function SocialTrending() {
  const { data, loading } = useFetch<{ symbols: StocktwitsSymbol[] }>(
    '/api/social/trending',
    { refreshInterval: 5 * 60_000 },
  )

  const symbols = data?.symbols ?? []

  return (
    <div className="rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" style={{ color: 'var(--accent)' }} aria-hidden>
          <path d="M8 1v4M8 11v4M1 8h4M11 8h4M3.5 3.5l2.8 2.8M9.7 9.7l2.8 2.8M12.5 3.5l-2.8 2.8M6.3 9.7l-2.8 2.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Social Trending
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-[var(--border)] to-transparent" />
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
          Stocktwits · 5min refresh
        </span>
      </div>

      {/* List */}
      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-2">
              <div className="skeleton h-3 w-4 rounded" />
              <div className="skeleton h-3 w-12 rounded" />
              <div className="skeleton h-3 w-24 flex-1 rounded" />
              <div className="skeleton h-3 w-14 rounded" />
            </div>
          ))
        ) : symbols.length === 0 ? (
          <p className="py-6 text-center font-mono text-[10px] text-[var(--text-muted)]">
            Social data unavailable
          </p>
        ) : (
          symbols.map((s) => (
            <Link
              key={s.symbol}
              href={`/asset/stock/${s.symbol}`}
              className="group flex items-center gap-2.5 border-b border-[var(--border)] px-3 py-1.5 transition-colors hover:bg-[var(--surface-2)]"
            >
              <span className="w-4 shrink-0 text-right font-mono text-[9px] tabular-nums text-[var(--text-muted)] opacity-50">
                {s.rank}
              </span>
              <span className="w-14 shrink-0 font-mono text-[11px] font-bold text-[var(--price-up)] group-hover:underline">
                {s.symbol}
              </span>
              <span className="flex-1 truncate font-mono text-[10px] text-[var(--text-muted)]">
                {s.title}
              </span>
              {s.watchlistCount > 0 && (
                <span className="shrink-0 font-mono text-[9px] tabular-nums text-[var(--text-muted)] opacity-50">
                  {formatWatchlist(s.watchlistCount)} watching
                </span>
              )}
              {s.trendingScore > 0 && (
                <span className="shrink-0 rounded border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-1.5 py-px font-mono text-[8px] font-bold tabular-nums text-[var(--accent)]">
                  {s.trendingScore.toFixed(0)}
                </span>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
