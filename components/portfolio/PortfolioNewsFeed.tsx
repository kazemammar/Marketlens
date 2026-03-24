'use client'

import { useEffect, useRef, useState } from 'react'
import type { PortfolioNewsCluster } from '@/app/api/portfolio/news/route'
import { timeAgo }                   from '@/lib/utils/timeago'

// ─── Severity bar color ───────────────────────────────────────────────────

const SEV_BORDER: Record<string, string> = {
  HIGH: 'var(--price-down)',
  MED:  'var(--warning)',
  LOW:  'transparent',
}

// ─── Tier dot color ───────────────────────────────────────────────────────

function tierColor(tier: number): string | null {
  if (tier === 1) return 'var(--accent)'
  if (tier === 2) return '#3b82f6'
  return null
}

// ─── Cluster row ──────────────────────────────────────────────────────────

function ClusterRow({ cluster }: { cluster: PortfolioNewsCluster }) {
  const [expanded, setExpanded] = useState(false)
  const tc = tierColor(cluster.sourceMeta.tier)

  return (
    <a
      href={cluster.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-h-[44px] items-start gap-0 border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-2)]"
    >
      {/* Severity bar */}
      <div
        className="mt-3 shrink-0 w-[3px] self-stretch rounded-sm"
        style={{ background: SEV_BORDER[cluster.severity] }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 px-3 py-2.5">
        <p className="line-clamp-2 font-mono text-[12px] leading-relaxed text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
          {cluster.headline}
        </p>

        {/* Meta row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {/* Tier dot */}
          {tc && <span className="h-1 w-1 shrink-0 rounded-full" style={{ background: tc }} />}

          <span className="font-mono text-[10px] text-[var(--text-muted)]">{cluster.source}</span>

          {/* State media badge */}
          {cluster.sourceMeta.stateMedia && (
            <span
              className={`rounded border px-1 py-px font-mono text-[9px] font-bold uppercase ${
                cluster.sourceMeta.stateMedia.level === 'high'
                  ? 'border-red-500/30 bg-red-500/15 text-red-400'
                  : 'border-amber-500/25 bg-amber-500/10 text-amber-400'
              }`}
            >
              {cluster.sourceMeta.stateMedia.level === 'high' ? '⚠ STATE' : '! GOV'}
            </span>
          )}

          <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
          <span className="font-mono text-[10px] text-[var(--text-muted)]" suppressHydrationWarning>
            {timeAgo(cluster.latestAt)}
          </span>

          {/* Multi-source badge */}
          {cluster.sourceCount > 1 && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded) }}
              className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              +{cluster.sourceCount - 1} sources
            </button>
          )}

          {/* Matched position pills */}
          {cluster.matchedPositions.length > 0 && (
            <>
              <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
              <div className="flex flex-wrap gap-1">
                {cluster.matchedPositions.map((p) => (
                  <span
                    key={p.symbol}
                    className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[8px] font-bold ${
                      p.direction === 'long'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {p.direction === 'long' ? '▲' : '▼'} {p.symbol}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Expanded sources */}
        {expanded && (
          <p className="mt-1 font-mono text-[9px] text-[var(--text-muted)] opacity-60 leading-snug">
            {cluster.allSources.join(' · ')}
          </p>
        )}
      </div>
    </a>
  )
}

// ─── Skeleton rows ────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-0 border-b border-[var(--border)] px-3 py-3">
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
            <div className="skeleton h-2.5 w-32 rounded" />
          </div>
        </div>
      ))}
    </>
  )
}

// ─── Component ────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

export default function PortfolioNewsFeed({
  positionCount,
  refreshTrigger,
}: {
  positionCount:   number
  refreshTrigger?: number
}) {
  const [clusters, setClusters] = useState<PortfolioNewsCluster[]>([])
  const [loading,  setLoading]  = useState(true)
  const [shown,    setShown]    = useState(PAGE_SIZE)
  const prevTrigger = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (positionCount === 0) { setLoading(false); return }

    function fetchNews() {
      fetch('/api/portfolio/news')
        .then((r) => r.ok ? r.json() as Promise<{ clusters: PortfolioNewsCluster[] }> : null)
        .then((d) => { if (d) setClusters(d.clusters ?? []) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }

    fetchNews()
    const id = setInterval(fetchNews, 5 * 60 * 1_000)
    return () => clearInterval(id)
  }, [positionCount])

  // Cache-bust + refetch when parent increments refreshTrigger
  useEffect(() => {
    if (refreshTrigger === undefined) return
    if (prevTrigger.current === undefined) { prevTrigger.current = refreshTrigger; return }
    if (refreshTrigger === prevTrigger.current) return
    prevTrigger.current = refreshTrigger
    fetch('/api/portfolio/news', { method: 'DELETE' })
      .catch(() => {})
      .finally(() => {
        fetch('/api/portfolio/news')
          .then((r) => r.ok ? r.json() as Promise<{ clusters: PortfolioNewsCluster[] }> : null)
          .then((d) => { if (d) setClusters(d.clusters ?? []) })
          .catch(() => {})
      })
  }, [refreshTrigger])

  if (positionCount === 0) return null

  return (
    <div>
      {loading && <SkeletonRows />}

      {!loading && clusters.length === 0 && (
        <div className="px-4 py-10 text-center">
          <p className="font-mono text-[12px] text-[var(--text-muted)]">
            No news found for your current positions.
          </p>
          <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)] opacity-60">
            Add more positions or check back later.
          </p>
        </div>
      )}

      {!loading && clusters.length > 0 && (
        <>
          {clusters.slice(0, shown).map((cluster, i) => (
            <ClusterRow key={`${cluster.url}-${i}`} cluster={cluster} />
          ))}

          {shown < clusters.length && (
            <button
              onClick={() => setShown((n) => n + PAGE_SIZE)}
              className="w-full border-t border-[var(--border)] py-3 font-mono text-[11px] text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              Load more ({clusters.length - shown} remaining)
            </button>
          )}
        </>
      )}
    </div>
  )
}
