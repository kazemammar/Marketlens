'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { useWatchlist, type WatchlistItem } from '@/lib/hooks/useWatchlistData'
import AuthModal from '@/components/auth/AuthModal'
import AssetCard from '@/components/dashboard/AssetCard'
import type { AssetCardData } from '@/lib/utils/types'

// ─── Per-item card with live quote + remove button ─────────────────────────

function WatchlistCard({
  item,
  onRemove,
}: {
  item:     WatchlistItem
  onRemove: (symbol: string) => void
}) {
  const [asset,   setAsset]   = useState<AssetCardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/market?tab=${item.asset_type}`)
      .then((r) => r.json() as Promise<AssetCardData[]>)
      .then((all) => {
        const match = all.find((a) => a.symbol === item.symbol)
        setAsset(match ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [item.symbol, item.asset_type])

  return (
    <div className="relative">
      {loading ? (
        <div className="flex flex-col gap-3 rounded border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1.5">
              <div className="h-3.5 w-16 animate-pulse rounded bg-[var(--surface-2)]" />
              <div className="h-3 w-24 animate-pulse rounded bg-[var(--surface-2)]" />
            </div>
            <div className="h-8 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
          </div>
          <div className="flex items-end justify-between">
            <div className="h-5 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
            <div className="h-3 w-12 animate-pulse rounded bg-[var(--surface-2)]" />
          </div>
        </div>
      ) : asset ? (
        <AssetCard asset={asset} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-center">
          <p className="font-mono text-[12px] font-semibold text-[var(--text)]">{item.symbol}</p>
          <p className="mt-0.5 font-mono text-[10px] text-[var(--text-muted)]">{item.asset_type}</p>
          <p className="mt-2 font-mono text-[10px] text-[var(--text-muted)] opacity-60">No quote data</p>
        </div>
      )}
      {/* Remove button */}
      <button
        onClick={() => onRemove(item.symbol)}
        aria-label={`Remove ${item.symbol} from watchlist`}
        className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface-2)] font-mono text-[9px] text-[var(--text-muted)] opacity-0 transition-all hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100 focus:opacity-100"
        style={{ opacity: undefined }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '')}
        onFocus={(e)      => (e.currentTarget.style.opacity = '1')}
        onBlur={(e)       => (e.currentTarget.style.opacity = '')}
      >
        ✕
      </button>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────

function EmptyWatchlist() {
  return (
    <div className="flex flex-col items-center justify-center rounded border border-dashed border-[var(--border)] py-20 text-center">
      <p className="text-3xl">⭐</p>
      <p className="mt-4 font-mono text-[14px] font-medium text-[var(--text)]">
        Your watchlist is empty
      </p>
      <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)] max-w-xs">
        Browse stocks, crypto, and more, then click{' '}
        <span className="text-[var(--accent)]">☆ Watch</span>{' '}
        to add assets here.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {[
          { label: 'Stocks',      href: '/stocks'      },
          { label: 'Crypto',      href: '/crypto'      },
          { label: 'Forex',       href: '/forex'       },
          { label: 'Commodities', href: '/commodities' },
          { label: 'ETFs',        href: '/etf'         },
        ].map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-mono text-[10px] text-[var(--text-muted)] transition hover:border-[var(--accent)]/30 hover:text-[var(--text)]"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const { user, loading: authLoading } = useAuth()
  const { items, loading: wlLoading, removeFromWatchlist } = useWatchlist()
  const [modalOpen, setModalOpen] = useState(false)

  // Show sign-in prompt if not logged in after auth resolves
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <div className="mx-auto max-w-screen-xl px-3 py-4 sm:px-4">
          <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
              <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
                <path d="M8 1.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 12l-4.2 2.5.8-4.7L1.2 6.5l4.7-.7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
              </svg>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
                Watchlist
              </span>
              <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
              <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
            </div>
            <div className="p-3">
              <div className="flex flex-col items-center justify-center rounded border border-dashed border-[var(--border)] py-20 text-center">
                <p className="text-3xl">🔒</p>
                <p className="mt-4 font-mono text-[14px] font-medium text-[var(--text)]">
                  Sign in to see your watchlist
                </p>
                <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
                  Create a free account to save assets and track them here.
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="mt-6 rounded px-5 py-2.5 font-mono text-[12px] font-semibold text-[var(--text)] transition hover:opacity-90"
                  style={{ background: 'var(--accent)' }}
                >
                  Sign In / Create Account
                </button>
              </div>
            </div>
          </div>
        </div>
        <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      </div>
    )
  }

  const isLoading = authLoading || wlLoading

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-screen-xl px-3 py-4 sm:px-4">
        <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
              <path d="M8 1.5l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 12l-4.2 2.5.8-4.7L1.2 6.5l4.7-.7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
              Watchlist
            </span>
            <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
            {user && (
              <span className="font-mono text-[9px] text-[var(--text-muted)]">
                {items.length} asset{items.length !== 1 ? 's' : ''}
              </span>
            )}
            {items.length > 0 && (
              <Link
                href="/stocks"
                className="font-mono text-[10px] text-[var(--accent)] hover:underline"
              >
                Browse more →
              </Link>
            )}
          </div>
          <div className="p-3">
            {/* Loading skeleton */}
            {isLoading && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-3 rounded border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1.5">
                        <div className="h-3.5 w-16 animate-pulse rounded bg-[var(--surface-2)]" />
                        <div className="h-3 w-24 animate-pulse rounded bg-[var(--surface-2)]" />
                      </div>
                      <div className="h-8 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
                    </div>
                    <div className="h-5 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
                  </div>
                ))}
              </div>
            )}

            {/* Content */}
            {!isLoading && items.length === 0 && <EmptyWatchlist />}

            {!isLoading && items.length > 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {items.map((item) => (
                  <WatchlistCard
                    key={`${item.asset_type}-${item.symbol}`}
                    item={item}
                    onRemove={removeFromWatchlist}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
