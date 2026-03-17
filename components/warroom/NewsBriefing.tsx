'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { categorizeArticle, type NewsCategory } from '@/lib/utils/news-helpers'

// ─── Types ────────────────────────────────────────────────────────────────

interface Article {
  headline:    string
  url:         string
  source:      string
  publishedAt: number | string
  summary:     string
}

// ─── Severity classification ──────────────────────────────────────────────

const HIGH_KW = ['war','attack','strike','sanction','blockade','invasion','missile','drone','crisis','crash','collapse','emergency','default','coup','explosion','seized','airstrike','ceasefire','nuclear']
const MED_KW  = ['tariff','trade','regulation','election','gdp','inflation','rate hike','rate cut','deficit','devaluation','recession','unemployment','fomc','opec','earnings','output cut','supply cut']

function severity(text: string): 'HIGH' | 'MED' | 'LOW' {
  const l = text.toLowerCase()
  if (HIGH_KW.some((k) => l.includes(k))) return 'HIGH'
  if (MED_KW.some((k)  => l.includes(k))) return 'MED'
  return 'LOW'
}

// ─── Visual config ────────────────────────────────────────────────────────

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
  GEOPOLITICAL: '#ef4444',
  MARKETS:      '#10b981',
  ENERGY:       '#f97316',
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function ago(ts: number | string) {
  const d = Date.now() - (typeof ts === 'number' ? ts : new Date(ts).getTime())
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

// ─── Article row ──────────────────────────────────────────────────────────

function ArticleRow({ article }: { article: Article }) {
  const sev     = severity(`${article.headline} ${article.summary}`)
  const isHigh  = sev === 'HIGH'
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex flex-col gap-0.5 border-b border-[var(--border)] py-2 pr-3 pl-2.5 transition-colors hover:bg-[var(--surface-2)] ${SEV_LEFT[sev]}`}
    >
      <p className={`line-clamp-2 text-[11px] font-medium leading-snug transition-colors group-hover:text-[var(--text)] ${isHigh ? 'text-[var(--text)]' : 'text-[var(--text-2)]'}`}>
        {article.headline}
      </p>
      {isHigh && article.summary && (
        <p className="line-clamp-1 text-[9px] leading-snug text-[var(--text-muted)] opacity-60">
          {article.summary.slice(0, 120)}
        </p>
      )}
      <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[8px] text-[var(--text-muted)]">
        <span className={`rounded border px-1 py-px font-bold uppercase ${SEV_BADGE[sev]}`}>{sev}</span>
        <span className="font-semibold opacity-80">{article.source}</span>
        <span className="opacity-30">·</span>
        <span className="opacity-60">{ago(article.publishedAt)}</span>
      </div>
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
  const [articles,    setArticles]    = useState<Article[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page,        setPage]        = useState(1)
  const [hasMore,     setHasMore]     = useState(false)

  // Track whether we've auto-filled once to avoid loops
  const autoFilled = useRef(false)

  const fetchPage = useCallback(async (p: number) => {
    if (p === 1) { setLoading(true); autoFilled.current = false }
    else           setLoadingMore(true)

    try {
      const res  = await fetch(`/api/news?page=${p}&limit=100`)
      const data = await res.json() as { articles: Article[]; hasMore: boolean }
      if (data?.articles) {
        setArticles((prev) => p === 1 ? data.articles : [...prev, ...data.articles])
        setHasMore(data.hasMore)
        setPage(p)
      }
    } catch { /* silent */ }

    setLoading(false)
    setLoadingMore(false)
  }, [])

  useEffect(() => { fetchPage(1) }, [fetchPage])

  // ── Distribute into category buckets & sort ──────────────────────────
  const byCategory: Record<NewsCategory, Article[]> = {
    GEOPOLITICAL: [], MARKETS: [], ENERGY: [], CRYPTO: [], TECH: [],
  }
  for (const a of articles) {
    byCategory[categorizeArticle(a.headline)].push(a)
  }
  for (const cat of Object.keys(byCategory) as NewsCategory[]) {
    byCategory[cat].sort((a, b) => {
      const diff = SEV_ORDER[severity(`${a.headline} ${a.summary}`)] -
                   SEV_ORDER[severity(`${b.headline} ${b.summary}`)]
      if (diff !== 0) return diff
      const ta = typeof a.publishedAt === 'number' ? a.publishedAt : new Date(a.publishedAt).getTime()
      const tb = typeof b.publishedAt === 'number' ? b.publishedAt : new Date(b.publishedAt).getTime()
      return tb - ta
    })
  }

  // Auto-fill: if any visible column has < 4 articles after first load, fetch page 2
  const visibleCats = COLUMNS.map((c) => c.id)
  const thinColumn  = !loading && hasMore && !autoFilled.current &&
    visibleCats.some((cat) => byCategory[cat].length < 4)

  useEffect(() => {
    if (thinColumn) {
      autoFilled.current = true
      fetchPage(2)
    }
  }, [thinColumn, fetchPage])

  // ── Per-column scroll handler triggers next page load ─────────────────
  const handleColumnScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    if (nearBottom && hasMore && !loadingMore && !loading) {
      fetchPage(page + 1)
    }
  }, [hasMore, loadingMore, loading, page, fetchPage])

  return (
    <div className="border-b border-[var(--border)]">

      {/* Section header */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
            <rect x="1" y="2" width="14" height="2" rx="1" fill="currentColor" opacity=".6"/>
            <rect x="1" y="7" width="10" height="2" rx="1" fill="currentColor" opacity=".6"/>
            <rect x="1" y="12" width="12" height="2" rx="1" fill="currentColor" opacity=".6"/>
          </svg>
          <span className="font-mono font-semibold uppercase text-[var(--text)]" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>
            News Briefing
          </span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        <div className="flex items-center gap-3">
          {/* Severity legend */}
          <div className="hidden sm:flex items-center gap-2 font-mono text-[8px] text-[var(--text-muted)] opacity-50">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-0.5 rounded-full bg-red-500/70" />HIGH</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-0.5 rounded-full bg-amber-500/50" />MED</span>
          </div>
          <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
            {loading ? 'Loading…' : `${articles.length} stories`}
          </span>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 bg-[var(--surface)]">
        {COLUMNS.map((col, colIdx) => {
          const colArticles = byCategory[col.id]
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
                    {colArticles.length}
                  </span>
                )}
              </div>

              {/* Scrollable article list */}
              <div className="relative">
                {loading ? (
                  <ColumnSkeleton />
                ) : colArticles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 py-10">
                    <span className="text-2xl opacity-20">{col.icon}</span>
                    <p className="font-mono text-[10px] text-[var(--text-muted)] opacity-50">No articles yet</p>
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
                    {colArticles.map((a, i) => (
                      <ArticleRow key={`${col.id}-${i}`} article={a} />
                    ))}

                    {/* Column-level load indicator */}
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

                {/* Gradient fade */}
                {!loading && colArticles.length > 5 && (
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
