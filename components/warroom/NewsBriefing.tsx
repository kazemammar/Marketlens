'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { categorizeArticle, type NewsCategory } from '@/lib/utils/news-helpers'
import type { NewsCluster } from '@/lib/utils/news-clustering'
import type { SourceMeta } from '@/lib/utils/source-registry'

// ─── Severity styling ─────────────────────────────────────────────────────

const SEV_ORDER = { HIGH: 0, MED: 1, LOW: 2 } as const

const SEV_LEFT: Record<string, string> = {
  HIGH: 'border-l-[3px] border-l-red-500/70',
  MED:  'border-l-[3px] border-l-amber-500/50',
  LOW:  'border-l-[3px] border-l-transparent',
}

const SEV_BADGE: Record<string, string> = {
  HIGH: 'bg-red-500 text-white border-transparent',
  MED:  'bg-amber-500 text-black border-transparent',
  LOW:  'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]',
}

const COL_ACCENT: Record<string, string> = {
  GEOPOLITICAL: 'var(--danger)',
  MARKETS:      'var(--accent)',
  ENERGY:       '#f97316',
}

// ─── Source tier dot ──────────────────────────────────────────────────────

function tierColor(meta: SourceMeta): string | null {
  if (meta.tier === 1) return 'var(--accent)'
  if (meta.tier === 2) return '#3b82f6'
  return null
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function ago(ts: number) {
  const d = Date.now() - ts
  const m = Math.floor(d / 60_000)
  if (m < 1)  return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ─── Column config ────────────────────────────────────────────────────────

const COLUMNS: { id: NewsCategory; label: string; icon: string; desc: string }[] = [
  { id: 'GEOPOLITICAL', label: 'Geopolitical',         icon: '🌍', desc: 'Conflicts · Sanctions · Diplomacy' },
  { id: 'MARKETS',      label: 'Markets & Economy',    icon: '📈', desc: 'Rates · Macro · Earnings' },
  { id: 'ENERGY',       label: 'Energy & Commodities', icon: '⚡', desc: 'Oil · Gas · Gold · Wheat' },
]

// ─── Cluster row ──────────────────────────────────────────────────────────

function ClusterRow({ cluster }: { cluster: NewsCluster }) {
  const [expanded, setExpanded] = useState(false)
  const sev    = cluster.severity
  const isHigh = sev === 'HIGH'
  const tc     = tierColor(cluster.sourceMeta)

  return (
    <a
      href={cluster.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex flex-col gap-0.5 border-b border-[var(--border)] py-2 pr-3 pl-2.5 transition-colors hover:bg-[var(--surface-2)] ${SEV_LEFT[sev]}`}
    >
      <p className={`line-clamp-2 font-mono text-[10px] font-medium leading-snug transition-colors group-hover:text-[var(--text)] ${isHigh ? 'text-[var(--text)]' : 'text-[var(--text-2)]'}`}>
        {cluster.headline}
      </p>
      {isHigh && cluster.summary && (
        <p className="line-clamp-1 font-mono text-[9px] leading-snug text-[var(--text-muted)] opacity-60">
          {cluster.summary.slice(0, 120)}
        </p>
      )}
      <div className="mt-0.5 flex flex-wrap items-center gap-1 font-mono text-[8px] text-[var(--text-muted)]">
        <span className={`rounded border px-1 py-px font-bold uppercase ${SEV_BADGE[sev]}`}>{sev}</span>

        {/* Tier dot */}
        {tc && <span className="h-1 w-1 shrink-0 rounded-full" style={{ background: tc }} />}

        <span className="font-semibold opacity-80">{cluster.source}</span>

        {/* State media badge */}
        {cluster.sourceMeta.stateMedia && (
          <span
            className={`rounded border px-1 py-px font-bold uppercase text-[9px] ${
              cluster.sourceMeta.stateMedia.level === 'high'
                ? 'border-red-500/30 bg-red-500/15 text-red-400'
                : 'border-amber-500/25 bg-amber-500/10 text-amber-400'
            }`}
          >
            {cluster.sourceMeta.stateMedia.level === 'high' ? '⚠ STATE' : '! GOV'}
          </span>
        )}

        <span className="opacity-30">·</span>
        <span className="opacity-60">{ago(cluster.latestAt)}</span>

        {/* Multi-source badge */}
        {cluster.sourceCount > 1 && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded) }}
            className="rounded bg-[var(--surface-2)] px-1 py-px text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            +{cluster.sourceCount - 1} sources
          </button>
        )}
      </div>

      {expanded && (
        <p className="mt-0.5 font-mono text-[8px] text-[var(--text-muted)] opacity-60 leading-snug">
          {cluster.allSources.join(' · ')}
        </p>
      )}
    </a>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

function ColumnSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border-b border-[var(--border)] border-l-[3px] border-l-transparent py-2 pr-3 pl-2.5">
          <div className="skeleton mb-1.5 h-2.5 w-full rounded" />
          <div className="skeleton mb-2 h-2.5 w-3/4 rounded" />
          <div className="skeleton h-2 w-1/3 rounded" />
        </div>
      ))}
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────

export default function NewsBriefing() {
  const [clusters,    setClusters]    = useState<NewsCluster[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page,        setPage]        = useState(1)
  const [hasMore,     setHasMore]     = useState(false)

  const autoFilled = useRef(false)

  const fetchPage = useCallback(async (p: number) => {
    if (p === 1) { setLoading(true); autoFilled.current = false }
    else           setLoadingMore(true)

    try {
      const res  = await fetch(`/api/news?page=${p}&limit=80&clustered=true`)
      const data = await res.json() as { clusters: NewsCluster[]; hasMore: boolean }
      if (data?.clusters) {
        setClusters((prev) => p === 1 ? data.clusters : [...prev, ...data.clusters])
        setHasMore(data.hasMore)
        setPage(p)
      }
    } catch { /* silent */ }

    setLoading(false)
    setLoadingMore(false)
  }, [])

  useEffect(() => { fetchPage(1) }, [fetchPage])

  // Refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(() => fetchPage(1), 5 * 60_000)
    return () => clearInterval(id)
  }, [fetchPage])

  // ── Distribute clusters into category buckets & sort ─────────────────
  const byCategory: Record<NewsCategory, NewsCluster[]> = {
    GEOPOLITICAL: [], MARKETS: [], ENERGY: [], CRYPTO: [], TECH: [],
  }
  for (const c of clusters) {
    byCategory[categorizeArticle(c.headline)].push(c)
  }
  for (const cat of Object.keys(byCategory) as NewsCategory[]) {
    byCategory[cat].sort((a, b) => {
      // Sort by severity first, then by latestAt
      const diff = SEV_ORDER[a.severity] - SEV_ORDER[b.severity]
      if (diff !== 0) return diff
      return b.latestAt - a.latestAt
    })
  }

  // Auto-fill if any visible column is thin
  const visibleCats = COLUMNS.map((c) => c.id)
  const thinColumn  = !loading && hasMore && !autoFilled.current &&
    visibleCats.some((cat) => byCategory[cat].length < 4)

  useEffect(() => {
    if (thinColumn) {
      autoFilled.current = true
      fetchPage(2)
    }
  }, [thinColumn, fetchPage])

  const handleColumnScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    if (nearBottom && hasMore && !loadingMore && !loading) {
      fetchPage(page + 1)
    }
  }, [hasMore, loadingMore, loading, page, fetchPage])

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">

      {/* Section header */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
            <rect x="1" y="2" width="14" height="2" rx="1" fill="currentColor" opacity=".6"/>
            <rect x="1" y="7" width="10" height="2" rx="1" fill="currentColor" opacity=".6"/>
            <rect x="1" y="12" width="12" height="2" rx="1" fill="currentColor" opacity=".6"/>
          </svg>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
            News Briefing
          </span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 font-mono text-[8px] text-[var(--text-muted)] opacity-50">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-0.5 rounded-full bg-red-500/70" />HIGH</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-0.5 rounded-full bg-amber-500/50" />MED</span>
          </div>
          <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
            {loading ? 'Loading…' : `${clusters.length} stories`}
          </span>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {COLUMNS.map((col, colIdx) => {
          const colClusters = byCategory[col.id]
          const accent      = COL_ACCENT[col.id] ?? 'var(--accent)'
          return (
            <div
              key={col.id}
              className={colIdx < COLUMNS.length - 1 ? 'border-b lg:border-b-0 lg:border-r border-[var(--border)]' : ''}
            >
              {/* Column header */}
              <div
                className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2"
                style={{ borderTop: `2px solid ${accent}20` }}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px]"
                  style={{ background: `${accent}15` }}
                  aria-hidden
                >
                  {col.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text)]">
                    {col.label}
                  </span>
                  <span className="ml-1.5 font-mono text-[8px] text-[var(--text-muted)] opacity-40 hidden sm:inline">
                    {col.desc}
                  </span>
                </div>
                {!loading && (
                  <span
                    className="shrink-0 rounded px-1.5 py-px font-mono text-[8px] font-bold tabular-nums"
                    style={{ background: `${accent}15`, color: accent }}
                  >
                    {colClusters.length}
                  </span>
                )}
              </div>

              {/* Scrollable cluster list */}
              <div className="relative">
                {loading ? (
                  <ColumnSkeleton />
                ) : colClusters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 py-10">
                    <span className="text-[18px] opacity-20">{col.icon}</span>
                    <p className="font-mono text-[10px] text-[var(--text-muted)] opacity-50">No stories yet</p>
                    {hasMore && (
                      <p className="font-mono text-[8px] text-[var(--text-muted)] opacity-30">Scroll another column to load more</p>
                    )}
                  </div>
                ) : (
                  <div
                    className="scrollbar-hide overflow-y-auto"
                    style={{ maxHeight: '480px' }}
                    onScroll={handleColumnScroll}
                  >
                    {colClusters.map((c, i) => (
                      <ClusterRow key={`${col.id}-${c.id}-${i}`} cluster={c} />
                    ))}

                    <div className="flex items-center justify-center py-3">
                      {loadingMore ? (
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 animate-spin rounded-full border border-[var(--text-muted)] border-t-transparent" />
                          <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">Loading…</span>
                        </div>
                      ) : hasMore ? (
                        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-30">↓ Scroll for more</span>
                      ) : (
                        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-20">All stories loaded</span>
                      )}
                    </div>
                  </div>
                )}

                {!loading && colClusters.length > 5 && (
                  <div
                    className="pointer-events-none absolute bottom-0 left-0 right-0 h-12"
                    style={{ background: 'linear-gradient(to top, var(--surface), transparent)' }}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
