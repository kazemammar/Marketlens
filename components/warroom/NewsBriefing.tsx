'use client'

import { useEffect, useState } from 'react'
import { categorizeArticle, type NewsCategory } from '@/lib/utils/news-helpers'

// ─── Category icon thumbnails ─────────────────────────────────────────────

const CAT_ICON: Record<string, { emoji: string; gradient: string }> = {
  GEOPOLITICAL: { emoji: '⚔️',  gradient: 'from-red-950 to-red-900'       },
  MARKETS:      { emoji: '📈',  gradient: 'from-emerald-950 to-emerald-900' },
  ENERGY:       { emoji: '🛢️', gradient: 'from-orange-950 to-orange-900'  },
  CRYPTO:       { emoji: '₿',   gradient: 'from-purple-950 to-purple-900'  },
  TECH:         { emoji: '💡',  gradient: 'from-blue-950 to-blue-900'      },
}

function ArticleIcon({ category }: { category: string }) {
  const cfg = CAT_ICON[category] ?? CAT_ICON.MARKETS
  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-[12px] ${cfg.gradient}`}
      style={{ border: '1px solid var(--border)' }}
      aria-hidden
    >
      {cfg.emoji}
    </div>
  )
}

interface Article {
  headline:    string
  url:         string
  source:      string
  publishedAt: number | string
  summary:     string
}

const HIGH_KW = ['war','attack','strike','sanction','blockade','invasion','missile','drone','crisis','crash','collapse','emergency','default','coup','explosion','seized']
const MED_KW  = ['tariff','trade','regulation','election','gdp','inflation','rate hike','rate cut','deficit','devaluation','recession','unemployment','fomc','opec']

function severity(text: string): 'HIGH' | 'MED' | 'LOW' {
  const l = text.toLowerCase()
  if (HIGH_KW.some((k) => l.includes(k))) return 'HIGH'
  if (MED_KW.some((k)  => l.includes(k))) return 'MED'
  return 'LOW'
}

const SEV_BADGE: Record<string, string> = {
  HIGH: 'bg-red-500 text-white border-transparent',
  MED:  'bg-amber-500 text-black border-transparent',
  LOW:  'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]',
}

function ago(ts: number | string) {
  const d = Date.now() - (typeof ts === 'number' ? ts : new Date(ts).getTime())
  const m = Math.floor(d / 60_000)
  if (m < 1)  return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const COLUMNS: { id: NewsCategory; label: string; icon: string }[] = [
  { id: 'GEOPOLITICAL', label: 'Geopolitical',        icon: '⚔️' },
  { id: 'MARKETS',      label: 'Markets & Economy',   icon: '📈' },
  { id: 'ENERGY',       label: 'Energy & Commodities', icon: '🛢️' },
]

function ArticleRow({ article, category }: { article: Article; category: string }) {
  const sev = severity(`${article.headline} ${article.summary}`)
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-2.5 border-b border-[var(--border)] px-3 py-2 transition-colors hover:bg-[var(--surface-2)]"
    >
      <ArticleIcon category={category} />
      <div className="min-w-0 flex-1">
      <p className="line-clamp-2 text-[11px] font-medium leading-snug text-[var(--text-2)] transition-colors group-hover:text-[var(--text)]">
        {article.headline}
      </p>
      <div className="mt-1 flex items-center gap-1.5 font-mono text-[9px] text-[var(--text-muted)]">
        <span className={`rounded border px-1 py-px text-[8px] font-bold uppercase ${SEV_BADGE[sev]}`}>{sev}</span>
        <span className="font-semibold">{article.source}</span>
        <span className="opacity-40">·</span>
        <span>{ago(article.publishedAt)}</span>
      </div>
      </div>
    </a>
  )
}

function ColumnSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-2.5 border-b border-[var(--border)] px-3 py-2">
          <div className="skeleton h-7 w-7 shrink-0 rounded-md" />
          <div className="flex-1 space-y-1.5 pt-0.5">
            <div className="skeleton h-2.5 w-full rounded" />
            <div className="skeleton h-2.5 w-3/4 rounded" />
            <div className="skeleton h-2 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function NewsBriefing() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    fetch('/api/news?page=1&limit=80')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.articles) setArticles(d.articles) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Distribute into category buckets — up to 15 per column
  const byCategory: Record<NewsCategory, Article[]> = {
    GEOPOLITICAL: [], MARKETS: [], ENERGY: [], CRYPTO: [], TECH: [],
  }
  // First pass: fill buckets
  for (const a of articles) {
    const cat = categorizeArticle(a.headline)
    if (byCategory[cat].length < 15) byCategory[cat].push(a)
  }
  // Sort each bucket: HIGH severity first, then by recency
  const sevOrder = { HIGH: 0, MED: 1, LOW: 2 }
  for (const cat of Object.keys(byCategory) as NewsCategory[]) {
    byCategory[cat].sort((a, b) => {
      const sa = sevOrder[severity(`${a.headline} ${a.summary}`)]
      const sb = sevOrder[severity(`${b.headline} ${b.summary}`)]
      if (sa !== sb) return sa - sb
      const ta = typeof a.publishedAt === 'number' ? a.publishedAt : new Date(a.publishedAt).getTime()
      const tb = typeof b.publishedAt === 'number' ? b.publishedAt : new Date(b.publishedAt).getTime()
      return tb - ta
    })
  }

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
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">Top Stories by Category</span>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 bg-[var(--surface)]">
        {COLUMNS.map((col, colIdx) => (
          <div
            key={col.id}
            className={colIdx < COLUMNS.length - 1 ? 'border-b lg:border-b-0 lg:border-r border-[var(--border)]' : ''}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
              <span className="text-[12px]" role="img" aria-hidden>{col.icon}</span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                {col.label}
              </span>
            </div>

            {/* Articles — scrollable with fade */}
            <div className="relative">
              {loading ? (
                <ColumnSkeleton />
              ) : byCategory[col.id].length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="font-mono text-[10px] text-[var(--text-muted)] opacity-50">No articles</p>
                </div>
              ) : (
                <div className="scrollbar-hide overflow-y-auto" style={{ maxHeight: '420px' }}>
                  {byCategory[col.id].map((a, i) => (
                    <ArticleRow key={i} article={a} category={col.id} />
                  ))}
                </div>
              )}
              {/* Gradient fade at bottom */}
              {!loading && byCategory[col.id].length > 5 && (
                <div
                  className="pointer-events-none absolute bottom-0 left-0 right-0 h-10"
                  style={{ background: 'linear-gradient(to top, var(--surface), transparent)' }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
