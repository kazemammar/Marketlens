'use client'

import { useState, useEffect, useCallback } from 'react'
import type { NewsCluster } from '@/lib/utils/news-clustering'
import type { SourceMeta } from '@/lib/utils/source-registry'
import { formatRelativeTime } from '@/lib/utils/formatters'

// ─── Category config ──────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all',         label: 'All News',    emoji: '📰' },
  { id: 'stocks',      label: 'Stocks',      emoji: '📈' },
  { id: 'crypto',      label: 'Crypto',      emoji: '₿'  },
  { id: 'forex',       label: 'Forex',       emoji: '💱' },
  { id: 'commodities', label: 'Commodities', emoji: '🪙' },
  { id: 'macro',       label: 'Macro',       emoji: '🌐' },
]

// ─── API response shape ───────────────────────────────────────────────────

interface NewsResponse {
  clusters: NewsCluster[]
  total:    number
  page:     number
  hasMore:  boolean
}

// ─── Source tier dot ──────────────────────────────────────────────────────

function tierColor(meta: SourceMeta): string | null {
  if (meta.tier === 1) return '#10b981'
  if (meta.tier === 2) return '#3b82f6'
  return null
}

// ─── Single cluster card ──────────────────────────────────────────────────

function ClusterCard({ cluster }: { cluster: NewsCluster }) {
  const [expanded, setExpanded] = useState(false)
  const tc = tierColor(cluster.sourceMeta)

  return (
    <a
      href={cluster.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5 transition hover:border-[var(--accent)]/30"
    >
      {/* Thumbnail */}
      {cluster.imageUrl ? (
        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded bg-[var(--surface-2)] sm:h-24 sm:w-36">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cluster.imageUrl}
            alt={cluster.headline ?? 'News thumbnail'}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded bg-[var(--surface-2)] text-[20px] sm:h-24 sm:w-36">
          📰
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-mono text-[12px] font-semibold leading-snug text-[var(--text)] transition-colors group-hover:text-[var(--accent)]">
          {cluster.headline}
        </p>
        {cluster.summary && (
          <p className="mt-1.5 line-clamp-2 hidden font-mono text-[10px] leading-relaxed text-[var(--text-muted)] sm:block">
            {cluster.summary}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] text-[var(--text-muted)]">
          {/* Tier dot */}
          {tc && <span className="h-1.5 w-1.5 rounded-full" style={{ background: tc }} />}

          <span className="font-semibold text-[var(--text)]">{cluster.source}</span>

          {/* State media badge */}
          {cluster.sourceMeta.stateMedia && (
            <span
              className={`rounded border px-1 py-px font-mono text-[8px] font-bold uppercase ${
                cluster.sourceMeta.stateMedia.level === 'high'
                  ? 'border-red-500/30 bg-red-500/15 text-red-400'
                  : 'border-amber-500/25 bg-amber-500/10 text-amber-400'
              }`}
            >
              {cluster.sourceMeta.stateMedia.level === 'high' ? '⚠ STATE' : '! GOV'}
            </span>
          )}

          <span>·</span>
          <span>{formatRelativeTime(cluster.latestAt)}</span>

          {/* Multi-source badge */}
          {cluster.sourceCount > 1 && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded) }}
              className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--text-muted)] transition hover:text-[var(--text)]"
            >
              +{cluster.sourceCount - 1} sources
            </button>
          )}
        </div>

        {expanded && (
          <p className="mt-1 font-mono text-[9px] text-[var(--text-muted)] opacity-70 leading-snug">
            {cluster.allSources.join(' · ')}
          </p>
        )}
      </div>

      <span className="shrink-0 self-center text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
        ↗
      </span>
    </a>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

function ClusterSkeleton() {
  return (
    <div className="flex gap-3 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <div className="h-20 w-28 shrink-0 animate-pulse rounded bg-[var(--surface-2)] sm:h-24 sm:w-36" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-full animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--surface-2)]" />
        <div className="hidden space-y-1.5 sm:block">
          <div className="h-3 w-full animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--surface-2)]" />
        </div>
        <div className="h-3 w-32 animate-pulse rounded bg-[var(--surface-2)]" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function NewsPage() {
  const [category,    setCategory]    = useState('all')
  const [clusters,    setClusters]    = useState<NewsCluster[]>([])
  const [page,        setPage]        = useState(1)
  const [hasMore,     setHasMore]     = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total,       setTotal]       = useState(0)

  const fetchPage = useCallback(async (cat: string, pg: number, append: boolean) => {
    if (pg === 1) setLoading(true)
    else          setLoadingMore(true)

    try {
      const res  = await fetch(`/api/news?category=${cat}&page=${pg}&clustered=true`)
      const data = await res.json() as NewsResponse

      setClusters((prev) => append ? [...prev, ...(data.clusters ?? [])] : (data.clusters ?? []))
      setHasMore(data.hasMore)
      setTotal(data.total)
      setPage(pg)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    fetchPage(category, 1, false)
  }, [category, fetchPage])

  function handleCategoryChange(cat: string) {
    if (cat === category) return
    setClusters([])
    setPage(1)
    setHasMore(false)
    setCategory(cat)
  }

  function loadMore() {
    fetchPage(category, page + 1, true)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <main className="mx-auto max-w-screen-xl px-3 sm:px-4 py-4">
        {/* Page header */}
        <div className="mb-6 space-y-4">
          <div>
            <h1 className="font-mono text-[22px] font-bold tracking-tight text-[var(--text)]">Market News</h1>
            <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">Clustered headlines across all asset classes</p>
          </div>
        </div>

        {/* Latest Stories card */}
        <div className="overflow-hidden rounded border border-[var(--border)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
              <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M4 5h8M4 8h5M4 11h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
              Latest Stories
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
          </div>
          <div className="p-3">
            {/* Category tabs */}
            <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-[var(--border)]">
              {CATEGORIES.map((cat) => {
                const isActive = cat.id === category
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`
                      flex shrink-0 items-center gap-1.5 border-b-2 px-4 pb-3 pt-1
                      font-mono text-[12px] font-medium transition-colors
                      ${isActive
                        ? 'border-[var(--accent)] text-[var(--accent)]'
                        : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                      }
                    `}
                  >
                    <span aria-hidden>{cat.emoji}</span>
                    {cat.label}
                  </button>
                )
              })}
            </div>

            {/* Count */}
            {!loading && total > 0 && (
              <p className="mb-4 font-mono text-[10px] text-[var(--text-muted)]">
                {total} cluster{total !== 1 ? 's' : ''} found
              </p>
            )}

            {/* Clusters */}
            <div className="space-y-2">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <ClusterSkeleton key={i} />)
                : clusters.map((c) => <ClusterCard key={c.id} cluster={c} />)
              }
            </div>

            {/* Empty state */}
            {!loading && clusters.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-4xl">📭</p>
                <p className="mt-4 font-mono text-[14px] font-medium text-[var(--text)]">No stories found</p>
                <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
                  Try a different category or check back later.
                </p>
              </div>
            )}

            {/* Load more */}
            {hasMore && !loading && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--surface)] px-6 py-2.5 font-mono text-[12px] font-medium text-[var(--text)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Loading…
                    </>
                  ) : (
                    'Load more stories'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
