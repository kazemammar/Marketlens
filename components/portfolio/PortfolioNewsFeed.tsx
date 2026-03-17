'use client'

import { useEffect, useRef, useState } from 'react'
import type { PortfolioNewsArticle } from '@/app/api/portfolio/news/route'
import { timeAgo }                   from '@/lib/utils/timeago'

// ─── Severity bar color ───────────────────────────────────────────────────

const SEV_BORDER: Record<string, string> = {
  HIGH: 'var(--price-down)',
  MED:  'var(--warning)',
  LOW:  'transparent',
}

// ─── Article row ──────────────────────────────────────────────────────────

function ArticleRow({ article }: { article: PortfolioNewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-h-[44px] items-start gap-0 border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-2)]"
    >
      {/* Severity bar */}
      <div
        className="mt-3 shrink-0 w-[3px] self-stretch rounded-sm"
        style={{ background: SEV_BORDER[article.severity] }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 px-3 py-2.5">
        <p className="line-clamp-2 font-mono text-[12px] leading-relaxed text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
          {article.headline}
        </p>

        {/* Meta row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[10px] text-[var(--text-muted)]">{article.source}</span>
          <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
          <span
            className="font-mono text-[10px] text-[var(--text-muted)]"
            suppressHydrationWarning
          >
            {timeAgo(article.publishedAt)}
          </span>

          {/* Matched position pills */}
          {article.matchedPositions.length > 0 && (
            <>
              <span className="h-1 w-1 rounded-full bg-[var(--border)]" />
              <div className="flex flex-wrap gap-1">
                {article.matchedPositions.map((p) => (
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
  const [articles, setArticles] = useState<PortfolioNewsArticle[]>([])
  const [loading,  setLoading]  = useState(true)
  const [shown,    setShown]    = useState(PAGE_SIZE)
  const prevTrigger = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (positionCount === 0) { setLoading(false); return }

    function fetchNews() {
      fetch('/api/portfolio/news')
        .then((r) => r.ok ? r.json() as Promise<{ articles: PortfolioNewsArticle[] }> : null)
        .then((d) => { if (d) setArticles(d.articles) })
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
          .then((r) => r.ok ? r.json() as Promise<{ articles: PortfolioNewsArticle[] }> : null)
          .then((d) => { if (d) setArticles(d.articles) })
          .catch(() => {})
      })
  }, [refreshTrigger])

  if (positionCount === 0) return null

  return (
    <div>
      {/* Content */}
      {loading && <SkeletonRows />}

      {!loading && articles.length === 0 && (
        <div className="px-4 py-10 text-center">
          <p className="font-mono text-[12px] text-[var(--text-muted)]">
            No news found for your current positions.
          </p>
          <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)] opacity-60">
            Add more positions or check back later.
          </p>
        </div>
      )}

      {!loading && articles.length > 0 && (
        <>
          {articles.slice(0, shown).map((article, i) => (
            <ArticleRow key={`${article.url}-${i}`} article={article} />
          ))}

          {shown < articles.length && (
            <button
              onClick={() => setShown((n) => n + PAGE_SIZE)}
              className="w-full border-t border-[var(--border)] py-3 font-mono text-[11px] text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              Load more ({articles.length - shown} remaining)
            </button>
          )}
        </>
      )}
    </div>
  )
}
