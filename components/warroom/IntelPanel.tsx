'use client'

import { useEffect, useState, useCallback } from 'react'

// ─── Thumbnail with error fallback ────────────────────────────────────────

function categoryIcon(h: string): string {
  const s = h.toLowerCase()
  if (s.includes('bitcoin') || s.includes('crypto') || s.includes('blockchain')) return '₿'
  if (s.includes('oil') || s.includes('opec') || s.includes('crude') || s.includes('gas')) return '🛢️'
  if (s.includes('gold') || s.includes('silver') || s.includes('metal')) return '🥇'
  if (s.includes('forex') || s.includes('dollar') || s.includes('currency') || s.includes('yen') || s.includes('euro')) return '💱'
  if (s.includes('war') || s.includes('attack') || s.includes('conflict') || s.includes('sanction') || s.includes('missile')) return '🌍'
  if (s.includes('fed') || s.includes('rate') || s.includes('inflation') || s.includes('fomc')) return '🏦'
  if (s.includes('defense') || s.includes('military') || s.includes('nato')) return '🛡️'
  return '📰'
}

function IntelThumb({ src, headline, impact }: { src?: string; headline: string; impact: string }) {
  const [err, setErr] = useState(false)
  const icon = src && !err ? null : (impact === 'HIGH' ? '⚠️' : categoryIcon(headline))
  if (!src || err) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[var(--surface-2)] text-[14px]">
        {icon}
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-9 w-9 shrink-0 rounded object-cover opacity-70 group-hover:opacity-90" loading="lazy" onError={() => setErr(true)} />
  )
}

interface Article {
  headline:    string
  summary:     string
  url:         string
  source:      string
  publishedAt: string | number
  imageUrl?:   string
}

interface FeedResponse { articles: Article[]; total: number; hasMore: boolean }

const REGIONS = [
  { id: 'all',         label: 'ALL',     keywords: [] as string[] },
  { id: 'mideast',     label: 'MID EAST',keywords: ['israel','iran','saudi','gulf','opec','iraq','lebanon','yemen','uae','qatar','hormuz','tehran','riyadh'] },
  { id: 'europe',      label: 'EUROPE',  keywords: ['europe','ecb','euro','ukraine','russia','germany','france','uk','britain','nato','london','berlin','moscow','boe','bunds'] },
  { id: 'asia',        label: 'ASIA',    keywords: ['china','japan','korea','india','taiwan','asean','pboc','boj','rba','beijing','tokyo','singapore','rupee','yuan','yen'] },
  { id: 'americas',    label: 'AMERICAS',keywords: ['fed','federal reserve','fomc','powell','canada','brazil','mexico','congress','treasury','white house','dollar','wall street'] },
  { id: 'africa',      label: 'AFRICA',  keywords: ['africa','nigeria','south africa','egypt','kenya','angola','ghana','sudan','ethiopia','johannesburg','nairobi'] },
] as const

type RegionId = typeof REGIONS[number]['id']

const HIGH = ['war','attack','strike','sanction','blockade','invasion','missile','drone','crisis','crash','collapse','emergency','opec cut','opec+','default','coup','explosion','seized']
const MED  = ['tariff','trade','regulation','election','gdp','inflation','rate hike','rate cut','deficit','devaluation','recession','unemployment','fomc','opec']

function impact(text: string): 'HIGH' | 'MED' | 'LOW' {
  const l = text.toLowerCase()
  if (HIGH.some((k) => l.includes(k))) return 'HIGH'
  if (MED.some((k)  => l.includes(k))) return 'MED'
  return 'LOW'
}

const IMP_STYLE: Record<string, string> = {
  HIGH: 'bg-red-500/20 text-red-400 border-red-500/30',
  MED:  'bg-amber-500/15 text-amber-400 border-amber-500/25',
  LOW:  'bg-slate-700/30 text-slate-400 border-slate-700/30',
}

function ago(ts: string | number) {
  const d = Date.now() - (typeof ts === 'number' ? ts : new Date(ts).getTime())
  const m = Math.floor(d / 60_000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h/24)}d`
}

export default function IntelPanel() {
  const [region,   setRegion]   = useState<RegionId>('all')
  const [all,      setAll]      = useState<Article[]>([])
  const [loading,  setLoading]  = useState(true)
  const [refresh,  setRefresh]  = useState(false)
  const [page,     setPage]     = useState(1)
  const [hasMore,  setHasMore]  = useState(false)
  const [loadMore, setLoadMore] = useState(false)

  const fetch_ = useCallback(async (p: number, reset: boolean) => {
    if (reset) { setLoading(true) } else if (p > 1) { setLoadMore(true) }
    else { setRefresh(true) }
    try {
      const res  = await fetch(`/api/news?page=${p}&limit=50`)
      const data = await res.json() as FeedResponse
      if (reset || p === 1) setAll(data.articles)
      else setAll((prev) => [...prev, ...data.articles])
      setHasMore(data.hasMore)
      setPage(p)
    } catch { /* silent */ }
    setLoading(false)
    setRefresh(false)
    setLoadMore(false)
  }, [])

  // Initial load + auto-refresh every 2 min
  useEffect(() => {
    fetch_(1, true)
    const id = setInterval(() => fetch_(1, false), 120_000)
    return () => clearInterval(id)
  }, [fetch_])

  const def     = REGIONS.find((r) => r.id === region)!
  const visible = region === 'all'
    ? all
    : all.filter((a) => {
        const h = `${a.headline} ${a.summary}`.toLowerCase()
        return def.keywords.some((k) => h.includes(k))
      })

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Refresh indicator */}
      {refresh && (
        <div className="h-0.5 w-full animate-pulse bg-blue-500/50" />
      )}

      {/* Region tabs */}
      <div className="flex shrink-0 overflow-x-auto border-b border-[var(--border)]">
        {REGIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => setRegion(r.id)}
            className={`shrink-0 border-b-2 px-2.5 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] transition whitespace-nowrap ${
              region === r.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {r.label}
          </button>
        ))}
        <div className="ml-auto flex items-center px-2">
          <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
            {visible.length}
          </span>
        </div>
      </div>

      {/* Article list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex animate-pulse gap-2 border-b border-[var(--border)] px-3 py-2.5">
              <div className="h-9 w-9 shrink-0 rounded bg-[var(--surface-2)]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-full rounded bg-[var(--surface-2)]" />
                <div className="h-2.5 w-4/5 rounded bg-[var(--surface-2)]" />
                <div className="h-2 w-20 rounded bg-[var(--surface-2)]" />
              </div>
            </div>
          ))
        ) : visible.length === 0 ? (
          <p className="py-10 text-center font-mono text-[11px] text-[var(--text-muted)]">No articles</p>
        ) : (
          <>
            {visible.map((a, i) => {
              const imp   = impact(`${a.headline} ${a.summary}`)
              return (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-2 border-b border-[var(--border)] px-3 py-2 transition hover:bg-[var(--surface-2)]"
                >
                  <IntelThumb src={a.imageUrl} headline={a.headline} impact={imp} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[11px] font-medium leading-snug text-[var(--text-muted)] group-hover:text-[var(--text)]">
                      {a.headline}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className={`rounded border px-1 py-px font-mono text-[8px] font-bold uppercase tracking-wide ${IMP_STYLE[imp]}`}>
                        {imp}
                      </span>
                      <span className="font-mono text-[9px] text-[var(--text-muted)]">{a.source}</span>
                      <span className="font-mono text-[9px] text-[var(--text-muted)]">·</span>
                      <span className="font-mono text-[9px] text-[var(--text-muted)]">{ago(a.publishedAt)}</span>
                    </div>
                  </div>
                </a>
              )
            })}
            {hasMore && (
              <button
                onClick={() => fetch_(page + 1, false)}
                disabled={loadMore}
                className="w-full border-b border-[var(--border)] py-2.5 font-mono text-[10px] text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] disabled:opacity-50"
              >
                {loadMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
