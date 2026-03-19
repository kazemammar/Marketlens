'use client'

import { useState, useEffect, useCallback } from 'react'
import { NewsArticle } from '@/lib/utils/types'
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
  articles: NewsArticle[]
  total:    number
  page:     number
  hasMore:  boolean
}

// ─── Single article card ──────────────────────────────────────────────────

function ArticleCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5"
    >
      {/* Thumbnail */}
      {article.imageUrl ? (
        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-2)] sm:h-24 sm:w-36">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.imageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-2xl sm:h-24 sm:w-36">
          📰
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-mono text-[13px] font-semibold leading-snug text-[var(--text)] transition-colors group-hover:text-blue-400 sm:text-[14px]">
          {article.headline}
        </p>
        {article.summary && (
          <p className="mt-1.5 line-clamp-2 hidden font-mono text-[11px] leading-relaxed text-[var(--text-muted)] sm:block">
            {article.summary}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text)]">{article.source}</span>
          <span>·</span>
          <span>{formatRelativeTime(article.publishedAt)}</span>
        </div>
      </div>

      <span className="shrink-0 self-center text-[var(--text-muted)] opacity-0 transition-opacity group-hover:opacity-100" aria-hidden>
        ↗
      </span>
    </a>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────

function ArticleSkeleton() {
  return (
    <div className="flex gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="h-20 w-28 shrink-0 animate-pulse rounded-lg bg-[var(--surface-2)] sm:h-24 sm:w-36" />
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
  const [category,  setCategory]  = useState('all')
  const [articles,  setArticles]  = useState<NewsArticle[]>([])
  const [page,      setPage]      = useState(1)
  const [hasMore,   setHasMore]   = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total,     setTotal]     = useState(0)

  const fetchPage = useCallback(async (cat: string, pg: number, append: boolean) => {
    if (pg === 1) setLoading(true)
    else          setLoadingMore(true)

    try {
      const res  = await fetch(`/api/news?category=${cat}&page=${pg}`)
      const data = await res.json() as NewsResponse

      setArticles((prev) => append ? [...prev, ...data.articles] : data.articles)
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

  // Initial load + category change
  useEffect(() => {
    fetchPage(category, 1, false)
  }, [category, fetchPage])

  function handleCategoryChange(cat: string) {
    if (cat === category) return
    setArticles([])
    setPage(1)
    setHasMore(false)
    setCategory(cat)
  }

  function loadMore() {
    fetchPage(category, page + 1, true)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <main className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-mono text-[22px] font-bold tracking-tight text-white">Market News</h1>
          <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
            Latest headlines across stocks, crypto, forex and commodities
          </p>
        </div>

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
                    ? 'border-blue-500 text-blue-500'
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

        {/* Article count */}
        {!loading && total > 0 && (
          <p className="mb-4 font-mono text-[11px] text-[var(--text-muted)]">
            {total} article{total !== 1 ? 's' : ''} found
          </p>
        )}

        {/* Articles */}
        <div className="space-y-3">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <ArticleSkeleton key={i} />)
            : articles.map((a) => <ArticleCard key={a.id} article={a} />)
          }
        </div>

        {/* Empty state */}
        {!loading && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-4xl">📭</p>
            <p className="mt-4 font-mono text-[14px] font-medium text-[var(--text)]">No articles found</p>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
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
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-2.5 font-mono text-[12px] font-medium text-[var(--text)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Loading…
                </>
              ) : (
                'Load more articles'
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
