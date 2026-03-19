'use client'

import { useEffect, useState, useCallback } from 'react'

interface Article {
  headline:    string
  summary:     string
  url:         string
  source:      string
  publishedAt: string | number
  thumbnail?:  string
  imageUrl?:   string
}

interface FeedResponse {
  articles: Article[]
  total:    number
  hasMore:  boolean
}

const REGIONS = [
  { id: 'all',          label: 'All',          keywords: [] as string[] },
  { id: 'middle-east',  label: 'Mid. East',    keywords: ['israel', 'iran', 'saudi', 'gulf', 'opec', 'iraq', 'lebanon', 'yemen', 'uae', 'qatar', 'hormuz', 'persian'] },
  { id: 'europe',       label: 'Europe',       keywords: ['europe', 'ecb', 'euro', 'ukraine', 'russia', 'germany', 'france', 'uk ', 'britain', 'nato', 'london', 'berlin'] },
  { id: 'asia',         label: 'Asia',         keywords: ['china', 'japan', 'korea', 'india', 'taiwan', 'asean', 'rba', 'boj', 'pboc', 'beijing', 'tokyo', 'singapore'] },
  { id: 'americas',     label: 'Americas',     keywords: ['fed ', 'federal reserve', 'canada', 'brazil', 'mexico', 'latin', 'fomc', 'treasury', 'white house', 'congress'] },
  { id: 'africa',       label: 'Africa',       keywords: ['africa', 'nigeria', 'south africa', 'egypt', 'kenya', 'angola', 'ghana', 'sudan', 'ethiopia'] },
] as const

type RegionId = typeof REGIONS[number]['id']

// ─── Impact scoring ───────────────────────────────────────────────────────

const HIGH_KEYWORDS  = ['war', 'attack', 'sanction', 'crisis', 'crash', 'collapse', 'plunge', 'soar', 'surge', 'default', 'emergency', 'invasion', 'explosion', 'drone', 'missile', 'seized', 'blockade']
const MED_KEYWORDS   = ['tariff', 'rate hike', 'rate cut', 'inflation', 'gdp', 'opec', 'trade deal', 'recession', 'election', 'ban', 'regulation', 'sanction', 'devaluation', 'deficit', 'unemployment']

function getImpact(text: string): 'HIGH' | 'MED' | 'LOW' {
  const lower = text.toLowerCase()
  if (HIGH_KEYWORDS.some((k) => lower.includes(k))) return 'HIGH'
  if (MED_KEYWORDS.some((k) => lower.includes(k)))  return 'MED'
  return 'LOW'
}

const IMPACT_STYLE = {
  HIGH: 'text-red-400 bg-red-500/10 border-red-500/25',
  MED:  'text-amber-400 bg-amber-500/10 border-amber-500/25',
  LOW:  'text-[var(--text-muted)] bg-[var(--surface-2)] border-[var(--border)]',
}

function timeAgo(ts: string | number) {
  const diff = Date.now() - (typeof ts === 'number' ? ts : new Date(ts).getTime())
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function RegionalNewsFeed() {
  const [region,      setRegion]      = useState<RegionId>('all')
  const [all,         setAll]         = useState<Article[]>([])
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page,        setPage]        = useState(1)
  const [hasMore,     setHasMore]     = useState(false)

  const fetchPage = useCallback(async (p: number, reset: boolean) => {
    if (reset) setLoading(true)
    else       setLoadingMore(true)
    try {
      const res  = await fetch(`/api/news?page=${p}&limit=40`)
      const data = await res.json() as FeedResponse
      if (reset) setAll(data.articles)
      else       setAll((prev) => [...prev, ...data.articles])
      setHasMore(data.hasMore)
      setPage(p)
    } catch { /* silent */ }
    setLoading(false)
    setLoadingMore(false)
  }, [])

  useEffect(() => { fetchPage(1, true) }, [fetchPage])

  const regionDef = REGIONS.find((r) => r.id === region)!
  const filtered  = region === 'all'
    ? all
    : all.filter((a) => {
        const hay = `${a.headline} ${a.summary}`.toLowerCase()
        return regionDef.keywords.some((k) => hay.includes(k))
      })

  const visible = filtered.slice(0, 12)

  return (
    <div
      className="flex flex-col overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]"
      style={{ minHeight: '400px' }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-2 shrink-0">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Regional Feed
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        {!loading && (
          <span className="font-mono text-[9px] text-[var(--text-muted)]">
            {filtered.length} articles
          </span>
        )}
      </div>

      {/* Region tabs */}
      <div className="flex border-b border-[var(--border)] shrink-0">
        {REGIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => setRegion(r.id)}
            className={`flex-1 border-b-2 px-1 py-2 font-mono text-[9px] font-semibold uppercase tracking-wide transition ${
              region === r.id
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Articles — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="divide-y divide-[var(--border)]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex animate-pulse gap-2 px-3 py-2.5">
                <div className="h-10 w-10 shrink-0 rounded bg-[var(--surface-2)]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-full rounded bg-[var(--surface-2)]" />
                  <div className="h-2.5 w-3/4 rounded bg-[var(--surface-2)]" />
                  <div className="h-2 w-16 rounded bg-[var(--surface-2)]" />
                </div>
              </div>
            ))}
          </div>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center font-mono text-[11px] text-[var(--text-muted)]">No articles</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {visible.map((a, i) => {
              const impact  = getImpact(`${a.headline} ${a.summary}`)
              const thumb   = a.imageUrl ?? a.thumbnail
              const ts      = a.publishedAt
              return (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-2 px-3 py-2.5 transition hover:bg-[var(--surface-2)]"
                >
                  {thumb ? (
                    <img src={thumb} alt="" className="h-10 w-10 shrink-0 rounded object-cover opacity-80 group-hover:opacity-100" loading="lazy" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[var(--surface-2)]">
                      <svg className="h-3.5 w-3.5 text-[var(--text-muted)]" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                        <path d="M2 3h12v1H2V3zm0 3h12v1H2V6zm0 3h8v1H2V9z"/>
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[11px] font-medium leading-snug text-[var(--text-muted)] group-hover:text-[var(--text)]">
                      {a.headline}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`rounded border px-1 py-px font-mono text-[9px] font-bold ${IMPACT_STYLE[impact]}`}>
                        {impact}
                      </span>
                      <span className="font-mono text-[9px] text-[var(--text-muted)]">{a.source}</span>
                      <span className="font-mono text-[9px] text-[var(--text-muted)]">·</span>
                      <span className="font-mono text-[9px] text-[var(--text-muted)]">{timeAgo(ts)}</span>
                    </div>
                  </div>
                </a>
              )
            })}

            {hasMore && !loadingMore && (
              <button
                onClick={() => fetchPage(page + 1, false)}
                className="w-full py-2.5 font-mono text-[10px] text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              >
                Load more
              </button>
            )}
            {loadingMore && (
              <div className="flex justify-center py-2.5">
                <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent text-[var(--text-muted)]" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
