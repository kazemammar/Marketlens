'use client'

import type { InsiderTransaction } from '@/lib/utils/types'
import { useFetch } from '@/lib/hooks/useFetch'

function formatShares(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatDate(s: string): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

export default function InsiderActivity({ symbol }: { symbol: string }) {
  const { data, loading } = useFetch<InsiderTransaction[]>(`/api/stock/insider/${symbol}`, { refreshInterval: 10 * 60_000 })
  const txns = data ?? []

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 mb-2.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <circle cx="8" cy="4" r="2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M4 14c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white">
          Insider Activity
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      </div>

      {loading ? (
        <div className="space-y-px bg-[var(--border)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 bg-[var(--surface)] px-4 py-2.5">
              <div className="skeleton h-2.5 w-32 rounded" />
              <div className="skeleton h-2.5 w-12 rounded" />
              <div className="skeleton h-2.5 w-16 rounded" />
            </div>
          ))}
        </div>
      ) : txns.length === 0 ? (
        <p className="px-4 py-6 font-mono text-[10px] text-[var(--text-muted)]">No recent insider activity</p>
      ) : (
        <div>
          {txns.slice(0, 10).map((t, i) => {
            const isPurchase = t.type === 'Purchase'
            const borderColor = isPurchase ? '#00ff88' : '#ff4444'
            const typeColor = isPurchase ? 'var(--price-up)' : 'var(--price-down)'
            return (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-2 hover:bg-[var(--surface-2)]"
                style={{ borderLeft: `2px solid ${borderColor}22` }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[10px] font-medium text-white">{t.name}</p>
                </div>
                <span className="w-16 shrink-0 font-mono text-[9px] font-bold uppercase" style={{ color: typeColor }}>
                  {t.type}
                </span>
                <span className="w-16 shrink-0 text-right font-mono text-[10px] tabular-nums text-[var(--text-muted)]">
                  {formatShares(t.shares)}
                </span>
                <span className="hidden sm:inline-block w-14 shrink-0 text-right font-mono text-[10px] tabular-nums text-white">
                  {t.price > 0 ? `$${t.price.toFixed(2)}` : '—'}
                </span>
                <span className="hidden sm:inline-block w-16 shrink-0 text-right font-mono text-[9px] text-[var(--text-muted)]">
                  {formatDate(t.transactionDate)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
