'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Flame, TrendingUp, Shield, Landmark, Bitcoin, ArrowLeftRight, Globe, Fuel } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { categorizeArticle, type NewsCategory } from '@/lib/utils/news-helpers'

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
  { id: 'all',      label: 'ALL',      keywords: [] as string[] },
  { id: 'mideast',  label: 'MID EAST', keywords: ['israel','iran','saudi','gulf','opec','iraq','lebanon','yemen','uae','qatar','hormuz','tehran','riyadh'] },
  { id: 'europe',   label: 'EUROPE',   keywords: ['europe','ecb','euro','ukraine','russia','germany','france','uk','britain','nato','london','berlin','moscow','boe','bunds'] },
  { id: 'asia',     label: 'ASIA',     keywords: ['china','japan','korea','india','taiwan','asean','pboc','boj','rba','beijing','tokyo','singapore','rupee','yuan','yen'] },
  { id: 'americas', label: 'AMERICAS', keywords: ['fed','federal reserve','fomc','powell','canada','brazil','mexico','congress','treasury','white house','dollar','wall street'] },
  { id: 'africa',   label: 'AFRICA',   keywords: ['africa','nigeria','south africa','egypt','kenya','angola','ghana','sudan','ethiopia','johannesburg','nairobi'] },
] as const

type RegionId  = typeof REGIONS[number]['id']
type Severity  = 'ALL' | 'HIGH' | 'MED' | 'LOW'
type CatFilter = 'ALL' | NewsCategory

const HIGH_KW = ['war','attack','strike','sanction','blockade','invasion','missile','drone','crisis','crash','collapse','emergency','opec cut','opec+','default','coup','explosion','seized']
const MED_KW  = ['tariff','trade','regulation','election','gdp','inflation','rate hike','rate cut','deficit','devaluation','recession','unemployment','fomc','opec']

function impact(text: string): 'HIGH' | 'MED' | 'LOW' {
  const l = text.toLowerCase()
  if (HIGH_KW.some((k) => l.includes(k))) return 'HIGH'
  if (MED_KW.some((k)  => l.includes(k))) return 'MED'
  return 'LOW'
}

const IMP_BADGE: Record<string, string> = {
  HIGH: 'text-white border-transparent bg-[#ff4444]',
  MED:  'text-black border-transparent bg-[#f59e0b]',
  LOW:  'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]',
}

const IMP_BORDER: Record<string, string> = {
  HIGH: 'border-l-red-500/70',
  MED:  'border-l-amber-500/60',
  LOW:  'border-l-[var(--border)]',
}

const SEV_ACTIVE: Record<Severity, string> = {
  ALL:  'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]',
  HIGH: 'border-transparent bg-[#ff4444] text-white',
  MED:  'border-transparent bg-[#f59e0b] text-black',
  LOW:  'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]',
}

const INACTIVE_PILL = 'border border-[var(--border)] bg-transparent text-[var(--text-muted)] hover:text-[var(--text-2)]'

// ─── Article thumbnail ────────────────────────────────────────────────────

function isValidImage(url?: string): boolean {
  if (!url) return false
  if (url.includes('yimg.com/rz/stage')) return false
  if (url.includes('yahoo_finance_en-US')) return false
  if (url.includes('s.yimg.com/os/creatr-uploaded-images')) return false
  return url.startsWith('http')
}

type IconCategory = { icon: LucideIcon; gradient: string; color: string }

function getArticleIcon(headline: string): IconCategory {
  const h = headline.toLowerCase()
  if (/oil|crude|opec|barrel|brent|wti|petroleum/.test(h))
    return { icon: Flame,          gradient: 'from-orange-950 to-orange-900', color: '#f97316' }
  if (/war|military|strike|attack|conflict|iran|israel|missile|drone|invasion/.test(h))
    return { icon: Shield,         gradient: 'from-red-950 to-red-900',       color: '#ff4444' }
  if (/fed|federal reserve|fomc|rate|inflation|gdp|economy|recession|treasury/.test(h))
    return { icon: Landmark,       gradient: 'from-blue-950 to-blue-900',     color: '#60a5fa' }
  if (/crypto|bitcoin|ethereum|btc|eth|blockchain|defi|nft/.test(h))
    return { icon: Bitcoin,        gradient: 'from-purple-950 to-purple-900', color: '#a78bfa' }
  if (/forex|currency|dollar|yen|euro|pound|yuan|rupee|fx/.test(h))
    return { icon: ArrowLeftRight, gradient: 'from-cyan-950 to-cyan-900',     color: '#22d3ee' }
  if (/gas|wheat|corn|commodity|agriculture|lumber|copper|natural gas/.test(h))
    return { icon: Fuel,           gradient: 'from-yellow-950 to-yellow-900', color: '#eab308' }
  if (/stock|shares|market|s&p|dow|nasdaq|equity|earnings|ipo/.test(h))
    return { icon: TrendingUp,     gradient: 'from-emerald-950 to-emerald-900', color: '#10b981' }
  return   { icon: Globe,          gradient: 'from-zinc-900 to-zinc-800',     color: 'var(--text-muted)' }
}

function ArticleThumb({ headline, imageUrl }: { headline: string; imageUrl?: string }) {
  if (isValidImage(imageUrl)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        aria-hidden
        className="h-12 w-12 shrink-0 rounded object-cover"
        style={{ border: '1px solid var(--border)' }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
    )
  }
  const { icon: Icon, gradient, color } = getArticleIcon(headline)
  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded bg-gradient-to-br ${gradient}`}
      style={{ border: '1px solid var(--border)' }}
      aria-hidden
    >
      <Icon size={20} style={{ color }} strokeWidth={1.5} />
    </div>
  )
}

function ago(ts: string | number) {
  const d = Date.now() - (typeof ts === 'number' ? ts : new Date(ts).getTime())
  const m = Math.floor(d / 60_000)
  if (m < 1)  return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ─── Filter pill ──────────────────────────────────────────────────────────

function Pill({ active, activeClass, onClick, children }: {
  active:      boolean
  activeClass: string
  onClick:     () => void
  children:    React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.1em] transition-all duration-100 ${
        active ? activeClass : INACTIVE_PILL
      }`}
    >
      {children}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────

export default function IntelPanel() {
  const [region,   setRegion]   = useState<RegionId>('all')
  const [severity, setSeverity] = useState<Severity>('ALL')
  const [category, setCategory] = useState<CatFilter>('ALL')
  const [all,      setAll]      = useState<Article[]>([])
  const [loading,  setLoading]  = useState(true)
  const [updating, setUpdating] = useState(false)
  const [page,     setPage]     = useState(1)
  const [hasMore,  setHasMore]  = useState(false)
  const [fetching, setFetching] = useState(false)  // fetching next page

  const scrollRef  = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchPage = useCallback(async (p: number, reset: boolean) => {
    if (reset) {
      setLoading(true)
    } else {
      setFetching(true)
    }
    if (!reset && p === 1) setUpdating(true)

    try {
      // Load 100 on first fetch to fill the panel; 50 for subsequent pages
      const limit = (reset && p === 1) ? 100 : 50
      const res  = await fetch(`/api/news?page=${p}&limit=${limit}`)
      const data = await res.json() as FeedResponse
      if (reset || p === 1) setAll(data.articles)
      else setAll((prev) => [...prev, ...data.articles])
      setHasMore(data.hasMore)
      setPage(p)
    } catch { /* silent */ }

    setLoading(false)
    setFetching(false)
    if (!reset && p === 1) setTimeout(() => setUpdating(false), 800)
  }, [])

  // Initial load + polling
  useEffect(() => {
    fetchPage(1, true)
    const id = setInterval(() => fetchPage(1, false), 120_000)
    return () => clearInterval(id)
  }, [fetchPage])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    const container = scrollRef.current
    if (!sentinel || !container) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !fetching && !loading) {
          fetchPage(page + 1, false)
        }
      },
      { root: container, threshold: 0.1 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, fetching, loading, page, fetchPage])

  // ── Apply filters ─────────────────────────────────────────────────────
  const def = REGIONS.find((r) => r.id === region)!

  let visible = region === 'all'
    ? all
    : all.filter((a) => {
        const h = `${a.headline} ${a.summary}`.toLowerCase()
        return def.keywords.some((k) => h.includes(k))
      })

  if (severity !== 'ALL') {
    visible = visible.filter((a) => impact(`${a.headline} ${a.summary}`) === severity)
  }
  if (category !== 'ALL') {
    visible = visible.filter((a) => categorizeArticle(a.headline) === category)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* Updating shimmer bar */}
      {updating && (
        <div
          className="h-0.5 w-full shrink-0"
          style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', animation: 'shimmer 1s ease-in-out' }}
        />
      )}

      {/* Region tabs */}
      <div className="flex shrink-0 items-center overflow-x-auto border-b border-[var(--border)]">
        <div className="flex flex-1 overflow-x-auto">
          {REGIONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setRegion(r.id)}
              className={`shrink-0 border-b-2 px-2.5 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.1em] transition-all duration-150 whitespace-nowrap ${
                region === r.id
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--border)]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-2 px-3">
          <div className="flex items-center gap-1">
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--accent)' }}>LIVE</span>
          </div>
          <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">{visible.length}</span>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex shrink-0 flex-wrap sm:flex-nowrap items-center gap-1.5 overflow-x-auto border-b border-[var(--border)] px-2 py-1.5">
        {(['ALL', 'HIGH', 'MED', 'LOW'] as Severity[]).map((s) => (
          <Pill key={s} active={severity === s} activeClass={SEV_ACTIVE[s]} onClick={() => setSeverity(s)}>
            {s}
          </Pill>
        ))}

        <div className="hidden sm:block h-3 w-px shrink-0 bg-[var(--border)]" />

        {([
          ['ALL',          'ALL'],
          ['GEOPOLITICAL', 'GEO'],
          ['MARKETS',      'MKTS'],
          ['ENERGY',       'ENERGY'],
          ['TECH',         'TECH'],
          ['CRYPTO',       'CRYPTO'],
        ] as [CatFilter, string][]).map(([id, label]) => (
          <Pill
            key={id}
            active={category === id}
            activeClass="bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]"
            onClick={() => setCategory(id)}
          >
            {label}
          </Pill>
        ))}
      </div>

      {/* Scrollable article list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="border-b border-[var(--border)] border-l-2 border-l-[var(--border)] px-3 py-2">
              <div className="skeleton mb-1.5 h-2.5 w-full rounded" />
              <div className="skeleton h-2 w-3/4 rounded" />
            </div>
          ))
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8 text-[var(--text-muted)] opacity-30" aria-hidden>
              <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
            </svg>
            <p className="font-mono text-[10px] text-[var(--text-muted)]">No articles match filters</p>
          </div>
        ) : (
          <>
            {visible.map((a, i) => {
              const imp = impact(`${a.headline} ${a.summary}`)
              return (
                <a
                  key={i}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex gap-2.5 border-b border-[var(--border)] border-l-2 px-3 py-2 transition-all duration-150 hover:bg-[var(--surface-2)] animate-fade-up ${IMP_BORDER[imp]}`}
                  style={{ animationDelay: `${Math.min(i * 12, 180)}ms` }}
                >
                  <ArticleThumb headline={a.headline} imageUrl={a.imageUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-mono text-[10px] font-medium leading-snug text-[var(--text-2)]">
                      {a.headline}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`rounded border px-1 py-px font-mono text-[8px] font-bold uppercase ${IMP_BADGE[imp]}`}>
                        {imp}
                      </span>
                      <span className="font-mono text-[9px] text-[var(--text-muted)]">{a.source}</span>
                      <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-40">·</span>
                      <span className="font-mono text-[9px] text-[var(--text-muted)]">{ago(a.publishedAt)}</span>
                    </div>
                  </div>
                </a>
              )
            })}

            {/* Sentinel — triggers next page load when scrolled into view */}
            <div ref={sentinelRef} className="h-4" />

            {/* Subtle loading indicator */}
            {fetching && (
              <div className="flex items-center justify-center gap-2 py-3">
                <span className="h-2 w-2 animate-spin rounded-full border border-[var(--text-muted)] border-t-transparent" />
                <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-50">Loading more…</span>
              </div>
            )}

            {!hasMore && all.length > 0 && (
              <p className="py-3 text-center font-mono text-[9px] text-[var(--text-muted)] opacity-30">
                All articles loaded
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
