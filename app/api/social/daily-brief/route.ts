// GET /api/social/daily-brief?edition=morning|close|weekend|weekly
// Pulls from 18 dashboard endpoints + archived articles from Redis,
// Groq writes narrative + picks best slides.
//
// Articles are accumulated hourly by the cron/warm job into a Redis
// sorted set (news:archive). Each edition pulls from a specific time
// window so important stories are never lost to RSS rotation.
//
// Editions & time windows (all UTC, MECE — no overlap between consecutive editions):
//   morning  — weekday pre-market: yesterday 22:00 → today 14:00
//   close    — weekday post-market: today 14:00 → today 22:00
//   weekend  — Sat/Sun only: Saturday 00:00 → Monday 06:00
//   weekly   — full trading week: Monday 07:00 → Friday 22:00 (standalone recap)

import { NextRequest, NextResponse } from 'next/server'
import { groqChat } from '@/lib/api/groq'
import { cachedFetch, redis } from '@/lib/cache/redis'

export const dynamic = 'force-dynamic'

// ─── Types ──────────────────────────────────────────────────────────────────

type Edition = 'morning' | 'close' | 'weekend' | 'weekly'

type SlideType =
  | 'cover' | 'scoreboard' | 'sentiment' | 'narrative' | 'movers'
  | 'energy' | 'crypto' | 'forex' | 'sectors' | 'radar'
  | 'outlook' | 'pulse' | 'cta' | 'heatmap' | 'headlines' | 'signals'

interface GroqBriefResponse {
  briefTitle:        string
  briefSubtitle:     string
  whyMoved:          string
  energyNarrative:   string
  cryptoNarrative:   string
  forexNarrative:    string
  sentimentVerdict:  string
  weekRecap:         string   // weekly/weekend only
  watchItems:        string[]
  slideOrder:        SlideType[]
  topHeadlineIndices: number[] // 1-based indices of the 6 most important headlines
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SlideData { type: SlideType; title: string; label: string; content: Record<string, any> }

interface DailyBriefPayload {
  slides:      SlideData[]
  edition:     Edition
  generatedAt: string
  date:        string
  slideCount:  number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_EDITIONS: Edition[] = ['morning', 'close', 'weekend', 'weekly']

function detectEdition(): Edition {
  const now = new Date()
  const day = now.getUTCDay()   // 0=Sun … 6=Sat
  const hour = now.getUTCHours()

  if (day === 0 || day === 6) return 'weekend'
  if (day === 1 && hour < 14) return 'weekend'   // Monday before 2pm UTC → weekend recap
  if (day === 5 && hour >= 17) return 'weekly'    // Friday after 5pm UTC → weekly wrap
  return hour < 17 ? 'morning' : 'close'
}

function isWeeklyEdition(ed: Edition): boolean {
  return ed === 'weekend' || ed === 'weekly'
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Time window (UTC timestamps) for each edition's article pool */
function editionTimeWindow(edition: Edition): { from: number; to: number } {
  const now = new Date()
  const y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate()
  const dayOfWeek = now.getUTCDay() // 0=Sun

  switch (edition) {
    case 'morning': {
      // Yesterday 22:00 UTC → today 14:00 UTC (no overlap with previous close)
      const from = Date.UTC(y, m, d - 1, 22, 0)
      const to   = Date.UTC(y, m, d, 14, 0)
      return { from, to }
    }
    case 'close': {
      // Today 14:00 UTC → today 22:00 UTC (no overlap with morning)
      const from = Date.UTC(y, m, d, 14, 0)
      const to   = Date.UTC(y, m, d, 22, 0)
      return { from, to }
    }
    case 'weekend': {
      // Saturday 00:00 UTC → Monday 06:00 UTC (only true weekend events)
      // No overlap with Friday close or Monday morning
      const saturday = new Date(Date.UTC(y, m, d))
      saturday.setUTCDate(d - ((dayOfWeek + 1) % 7)) // find previous Saturday
      const monday = new Date(saturday)
      monday.setUTCDate(saturday.getUTCDate() + 2)
      const from = Date.UTC(saturday.getUTCFullYear(), saturday.getUTCMonth(), saturday.getUTCDate(), 0, 0)
      const to   = Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 6, 0)
      return { from, to }
    }
    case 'weekly': {
      // Monday 07:00 UTC → Friday 22:00 UTC (full trading week)
      // Always anchored to Mon→Fri, not relative to "today"
      const monday = new Date(Date.UTC(y, m, d))
      monday.setUTCDate(d - ((dayOfWeek + 6) % 7))
      const friday = new Date(monday)
      friday.setUTCDate(monday.getUTCDate() + 4)
      const from = Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 7, 0)
      const to   = Date.UTC(friday.getUTCFullYear(), friday.getUTCMonth(), friday.getUTCDate(), 22, 0)
      return { from, to }
    }
  }
}

/** Cache TTL per edition — briefs don't need to regenerate within their window */
function editionCacheTtl(edition: Edition): number {
  switch (edition) {
    case 'morning': return 6 * 3600   // 6 hours — valid until close edition
    case 'close':   return 10 * 3600  // 10 hours — valid until next morning
    case 'weekend': return 24 * 3600  // 24 hours
    case 'weekly':  return 24 * 3600  // 24 hours
  }
}

/** Retrieve archived articles from Redis sorted set within a time window */
async function getArchivedArticles(
  edition: Edition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  try {
    const { from, to } = editionTimeWindow(edition)
    // Upstash auto-deserializes JSON members
    const results = await redis.zrange('news:archive', from, to, { byScore: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (results as any[]).filter(Boolean)
  } catch {
    return []
  }
}

function getWeekDateRange(): string {
  const now = new Date()
  const dayOfWeek = now.getUTCDay() // 0=Sun
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - ((dayOfWeek + 6) % 7))
  const friday = new Date(monday)
  friday.setUTCDate(monday.getUTCDate() + 4)
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(monday)} – ${fmt(friday)}`
}

async function fetchEndpoint(base: string, path: string): Promise<unknown> {
  const r = await fetch(`${base}${path}`, {
    signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': 'MarketLens-DailyBrief/1.0' },
  })
  if (!r.ok) return null
  return r.json()
}

/** Fetch og:image from an article URL. Returns image URL or null. */
async function fetchOgImage(articleUrl: string): Promise<string | null> {
  try {
    const r = await fetch(articleUrl, {
      signal: AbortSignal.timeout(4000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    })
    if (!r.ok) return null
    // Read only first 50KB to find og:image quickly
    const reader = r.body?.getReader()
    if (!reader) return null
    let html = ''
    const decoder = new TextDecoder()
    while (html.length < 50000) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })
      // Check if we've passed </head> — og:image is always in <head>
      if (html.includes('</head>')) break
    }
    reader.cancel().catch(() => {})

    // Match og:image or twitter:image meta tags
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
      ?? html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)
    return ogMatch?.[1] ?? null
  } catch {
    return null
  }
}

/** Dedup headlines: if two headlines share 3+ significant words, keep only the first
 *  and backfill from the remaining pool so we always have 6. */
function dedupHeadlines(
  picked: Array<{ headline: string; imageUrl: string | null; source: string; url: string | null; publishedAt: number | null }>,
  pool: Array<{ headline: string; imageUrl: string | null; source: string; url: string | null; publishedAt: number | null }>,
) {
  const STOP = new Set(['the','a','an','in','on','at','to','for','of','and','or','is','are','was','were','has','have','its','by','as','with','from','after','over','says','said','may','could','will','new','us','uk'])
  const keyWords = (hl: string) =>
    hl.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))

  const result: typeof picked = []
  const usedHls = new Set<string>()

  for (const a of picked) {
    const words = keyWords(a.headline)
    const isDup = result.some(existing => {
      const ew = keyWords(existing.headline)
      const overlap = words.filter(w => ew.includes(w)).length
      return overlap >= 3
    })
    if (!isDup) {
      result.push(a)
      usedHls.add(a.headline.toLowerCase().trim())
    }
  }

  // Backfill from pool if dedup removed entries
  if (result.length < 6) {
    for (const a of pool) {
      if (result.length >= 6) break
      const hl = a.headline.toLowerCase().trim()
      if (usedHls.has(hl)) continue
      const words = keyWords(a.headline)
      const isDup = result.some(existing => {
        const ew = keyWords(existing.headline)
        return words.filter(w => ew.includes(w)).length >= 3
      })
      if (!isDup) {
        result.push(a)
        usedHls.add(hl)
      }
    }
  }

  return result
}

// ─── GET handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const editionParam = req.nextUrl.searchParams.get('edition') as Edition | null
  const edition: Edition = editionParam && VALID_EDITIONS.includes(editionParam)
    ? editionParam : detectEdition()
  const refresh = req.nextUrl.searchParams.get('refresh') === '1'
  const date = todayStr()
  const cacheKey = `social:daily-brief:${edition}:${date}`

  try {
    let payload: DailyBriefPayload
    if (refresh) {
      // Force fresh generation, bypassing cache
      payload = await generateBrief(edition, date)
      // Store the fresh result in cache for subsequent requests
      await redis.set(cacheKey, payload, { ex: editionCacheTtl(edition) })
    } else {
      payload = await cachedFetch<DailyBriefPayload>(
        cacheKey,
        editionCacheTtl(edition),
        () => generateBrief(edition, date),
      )
    }
    return NextResponse.json(payload)
  } catch (err) {
    console.error('[daily-brief] generation failed:', err)
    return NextResponse.json(
      { error: 'Failed to generate daily brief' },
      { status: 500 },
    )
  }
}

// ─── Weekly change computation ────────────────────────────────────────────

const WEEKLY_SYMBOLS = [
  // Main indices + commodities + crypto + dollar
  'SPY', 'QQQ', 'DIA', 'IWM', 'GC=F', 'BZ=F', 'SI=F', 'NG=F',
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'DX-Y.NYB',
  // Heatmap stocks (top 15 S&P by weight) — needed for weekly heatmap %
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'BRK-B', 'AVGO',
  'LLY', 'TSLA', 'JPM', 'V', 'UNH', 'XOM', 'WMT',
]
const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart'

async function fetchWeeklyChanges(): Promise<Record<string, { pct: number; price: number }>> {
  const results = await Promise.allSettled(
    WEEKLY_SYMBOLS.map(async (sym) => {
      try {
        const res = await fetch(
          `${YAHOO_CHART}/${encodeURIComponent(sym)}?interval=1d&range=5d`,
          { signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'Mozilla/5.0' } },
        )
        if (!res.ok) return null
        const json = await res.json()
        const closes: (number | null)[] =
          json.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
        const valid = closes.filter((c): c is number => c != null && c > 0)
        if (valid.length < 2) return null
        const price = valid[valid.length - 1]
        const pct = ((price - valid[0]) / valid[0]) * 100
        return { sym, pct, price }
      } catch { return null }
    }),
  )

  const map: Record<string, { pct: number; price: number }> = {}
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      map[r.value.sym] = { pct: r.value.pct, price: r.value.price }
    }
  }
  return map
}

// ─── Generate brief ─────────────────────────────────────────────────────────

async function generateBrief(edition: Edition, date: string): Promise<DailyBriefPayload> {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://marketlens.live'

  // 1. Fetch all endpoints + archived articles in parallel
  const endpoints: [string, string][] = [
    ['quotes',           '/api/quotes?symbols=SPY,QQQ,DIA,IWM,GC%3DF,BZ%3DF,SI%3DF,NG%3DF,BTC-USD,ETH-USD,SOL-USD,DX-Y.NYB'],
    ['movers',           '/api/movers'],
    ['fearGreed',        '/api/fear-greed'],
    ['marketRisk',       '/api/market-risk'],
    ['marketPulse',      '/api/market-pulse'],
    ['news',             '/api/news?page=1&limit=15'],
    ['chokepoints',      '/api/chokepoints'],
    ['commoditiesStrip', '/api/commodities-strip'],
    ['stocks',           '/api/market?tab=stock'],
    ['forexStrength',    '/api/forex/strength'],
    ['sectorSentiment',  '/api/sector-sentiment'],
    ['marketRadar',      '/api/market-radar'],
    ['cryptoFearGreed',  '/api/crypto/fear-greed'],
    ['centralBanks',     '/api/central-banks'],
    ['econCalendar',     '/api/economic-calendar'],
    ['earningsCalendar', '/api/earnings-calendar'],
    ['predictions',      '/api/predictions'],
    ['energy',           '/api/energy'],
    ['signals',          '/api/signals'],
    ['newsHeat',         '/api/news-heat'],
  ]

  // Fetch archived articles from Redis alongside live API calls
  const [settled, archivedArticles] = await Promise.all([
    Promise.allSettled(endpoints.map(([, path]) => fetchEndpoint(base, path))),
    getArchivedArticles(edition),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {}
  endpoints.forEach(([key], i) => {
    const result = settled[i]
    data[key] = result.status === 'fulfilled' ? result.value : null
  })

  // 2. For weekly wrap: replace daily % with weekly cumulative % (Mon→Fri)
  //    For weekend: skip — stock markets are closed, crypto uses live 24h change
  if (edition === 'weekly') {
    const weeklyChanges = await fetchWeeklyChanges()
    const quotes = data.quotes ?? {}
    for (const [sym, { pct, price }] of Object.entries(weeklyChanges)) {
      if (quotes[sym] && quotes[sym].price > 0) {
        const prevPrice = quotes[sym].price / (1 + pct / 100)
        quotes[sym].changePercent = pct
        quotes[sym].change = quotes[sym].price - prevPrice
      } else {
        const prevPrice = price / (1 + pct / 100)
        quotes[sym] = {
          price,
          previousClose: prevPrice,
          changePercent: pct,
          change: price - prevPrice,
          high: price,
          low: price,
          open: prevPrice,
          timestamp: Date.now(),
        }
      }
    }
    data.quotes = quotes

    // Overlay weekly % onto heatmap stocks (from /api/market?tab=stock)
    const stocksArr = data.stocks
      ? (Array.isArray(data.stocks) ? data.stocks : (data.stocks.data ?? data.stocks.stocks ?? []))
      : []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const s of stocksArr) {
      const wc = weeklyChanges[s.symbol] ?? weeklyChanges[s.symbol?.replace('.', '-')]
      if (wc) s.changePercent = wc.pct
    }

    // Build weekly movers from Yahoo 5d data instead of daily movers API
    const MOVER_NAMES: Record<string, string> = {
      SPY: 'S&P 500', QQQ: 'Nasdaq 100', DIA: 'Dow Jones', IWM: 'Russell 2000',
      'BTC-USD': 'Bitcoin', 'ETH-USD': 'Ethereum', 'SOL-USD': 'Solana',
      AAPL: 'Apple', MSFT: 'Microsoft', NVDA: 'Nvidia', AMZN: 'Amazon',
      GOOGL: 'Alphabet', META: 'Meta', 'BRK-B': 'Berkshire', AVGO: 'Broadcom',
      LLY: 'Eli Lilly', TSLA: 'Tesla', JPM: 'JPMorgan', V: 'Visa',
      UNH: 'UnitedHealth', XOM: 'Exxon Mobil', WMT: 'Walmart',
    }
    const weeklyMovers = Object.entries(weeklyChanges)
      .filter(([sym]) => !['GC=F', 'BZ=F', 'SI=F', 'NG=F', 'DX-Y.NYB'].includes(sym))
      .map(([sym, { pct, price }]) => ({ symbol: sym, name: MOVER_NAMES[sym] ?? sym, change: 0, changePercent: pct, price }))
      .sort((a, b) => b.changePercent - a.changePercent)
    data.movers = {
      gainers: weeklyMovers.filter(m => m.changePercent > 0).slice(0, 5),
      losers:  weeklyMovers.filter(m => m.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent).slice(0, 5),
    }
  }

  // Merge archived articles with live RSS — archive is primary, live fills gaps
  if (archivedArticles.length > 0) {
    const liveArticles = Array.isArray(data.news)
      ? data.news
      : (data.news?.articles ?? data.news?.data ?? [])
    // Backfill archived articles missing images from the live feed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const liveImageMap = new Map<string, string>(liveArticles.map((a: any) => [
      (a.headline ?? a.title ?? '').toLowerCase().trim(),
      a.imageUrl ?? a.image ?? a.thumbnail ?? '',
    ]).filter(([, img]: [string, string]) => img))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const a of archivedArticles as any[]) {
      if (!a.imageUrl) {
        const hl = (a.headline ?? a.title ?? '').toLowerCase().trim()
        const liveImg = liveImageMap.get(hl)
        if (liveImg) a.imageUrl = liveImg
      }
    }
    // Deduplicate: archive first, then live articles not already in archive
    const seenHeadlines = new Set(archivedArticles.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any) => (a.headline ?? a.title ?? '').toLowerCase().trim()
    ))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniqueLive = liveArticles.filter((a: any) => {
      const hl = (a.headline ?? a.title ?? '').toLowerCase().trim()
      return hl && !seenHeadlines.has(hl)
    })
    data.news = { articles: [...archivedArticles, ...uniqueLive] }
  }

  const extracted = extractData(data, edition)
  const groqResponse = await callGroq(edition, extracted)

  // Reorder newsArticles based on Groq's importance ranking
  if (groqResponse.topHeadlineIndices?.length > 0) {
    const picked = groqResponse.topHeadlineIndices
      .map((idx: number) => extracted.newsArticlesAll?.[idx - 1])  // 1-based → 0-based
      .filter(Boolean)
    if (picked.length >= 3) {
      // Dedup: remove headlines about the same event (same key nouns)
      const deduped = dedupHeadlines(picked, extracted.newsArticlesAll)
      // Move hero story: prefer an article WITH an image for the hero (first position)
      const withImg = deduped.filter((a: { imageUrl: string | null }) => a.imageUrl)
      const noImg = deduped.filter((a: { imageUrl: string | null }) => !a.imageUrl)
      extracted.newsArticles = [...withImg, ...noImg].slice(0, 6)
    }
  }

  // Backfill missing images via OG tags from article URLs
  const missingImg = extracted.newsArticles.filter(a => !a.imageUrl && a.url)
  if (missingImg.length > 0) {
    const ogResults = await Promise.allSettled(
      missingImg.map(a => fetchOgImage(a.url!))
    )
    missingImg.forEach((a, i) => {
      const result = ogResults[i]
      if (result.status === 'fulfilled' && result.value) {
        a.imageUrl = result.value
      }
    })
  }

  const slides = buildSlides(groqResponse, extracted, edition)

  return {
    slides,
    edition,
    generatedAt: new Date().toISOString(),
    date,
    slideCount: slides.length,
  }
}

// ─── Data extraction ────────────────────────────────────────────────────────

interface ExtractedData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quotes: Record<string, any>
  gainers: Array<{ symbol: string; name: string; change: number; changePercent: number; price: number }>
  losers:  Array<{ symbol: string; name: string; change: number; changePercent: number; price: number }>
  fearGreed: { score: number; rating: string; previousClose?: number; oneWeekAgo?: number; oneMonthAgo?: number; history?: Array<{ date: string; score: number }> } | null
  cryptoFearGreed: { score: number; label: string } | null
  riskLevel: { score: number; label: string } | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  radarVerdict: { verdict: string; signals: any[] } | null
  chokepoints: Array<{ name: string; status: string; description: string }>
  forexStrength: Array<{ currency: string; score: number }>
  sectorSentiment: Array<{ sector: string; score: number }>
  headlines: string[]
  pulseText: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commodities: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  centralBanks: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  econEvents: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  earnings: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  predictions: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  energy: any
  signals: Array<{ text: string; severity: string; category: string; explanation?: { type: string; headline?: string; source?: string } }>
  newsHeat: Array<{ region: string; intensity: number; articles: number }>
  newsArticles: Array<{ headline: string; imageUrl: string | null; source: string; url: string | null; publishedAt: number | null }>
  newsArticlesAll: Array<{ headline: string; imageUrl: string | null; source: string; url: string | null; publishedAt: number | null }>
  heatmapStocks: Array<{ symbol: string; name: string; changePercent: number; weight: number }>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractData(raw: Record<string, any>, edition: Edition): ExtractedData {
  const quotes = raw.quotes ?? {}

  let gainers: ExtractedData['gainers'] = []
  let losers: ExtractedData['losers'] = []
  if (raw.movers) {
    const m = raw.movers
    gainers = (m.gainers ?? m.topGainers ?? []).slice(0, 5).map(mapMover)
    losers  = (m.losers  ?? m.topLosers  ?? []).slice(0, 5).map(mapMover)
  }
  if (gainers.length === 0 && raw.stocks) {
    const stocks = Array.isArray(raw.stocks) ? raw.stocks : (raw.stocks.data ?? raw.stocks.stocks ?? [])
    const sorted = [...stocks]
      .filter((s: { changePercent?: number }) => typeof s.changePercent === 'number')
      .sort((a: { changePercent: number }, b: { changePercent: number }) => b.changePercent - a.changePercent)
    gainers = sorted.slice(0, 5).map(mapMover)
    losers  = sorted.slice(-5).reverse().map(mapMover)
  }

  const fg = raw.fearGreed
  const fearGreed = fg ? {
    score: fg.score ?? fg.value ?? 50,
    rating: fg.rating ?? fg.label ?? 'Neutral',
    previousClose: fg.previousClose ?? null,
    oneWeekAgo: fg.oneWeekAgo ?? null,
    oneMonthAgo: fg.oneMonthAgo ?? null,
    history: Array.isArray(fg.history) ? fg.history.slice(-30) : [],
  } : null

  const cfg = raw.cryptoFearGreed
  const cryptoFearGreed = cfg ? {
    score: Number(cfg.data?.[0]?.value ?? cfg.score ?? cfg.value ?? 50),
    label: cfg.data?.[0]?.value_classification ?? cfg.label ?? 'Neutral',
  } : null

  const risk = raw.marketRisk
  const riskLevel = risk ? { score: risk.score ?? risk.level ?? 50, label: risk.label ?? risk.rating ?? 'Moderate' } : null

  const radar = raw.marketRadar
  const radarVerdict = radar ? {
    verdict: radar.verdict ?? radar.signal ?? 'MIXED',
    signals: radar.signals ?? radar.items ?? [],
  } : null

  const cp = raw.chokepoints
  const chokepoints = Array.isArray(cp)
    ? cp.map((c: { name: string; status: string; description?: string; detail?: string }) => ({
        name: c.name ?? '', status: c.status ?? 'NORMAL', description: c.description ?? c.detail ?? '',
      }))
    : (cp?.chokepoints ?? []).map((c: { name: string; status: string; description?: string; detail?: string }) => ({
        name: c.name ?? '', status: c.status ?? 'NORMAL', description: c.description ?? c.detail ?? '',
      }))

  const fx = raw.forexStrength
  const forexStrength = Array.isArray(fx)
    ? fx.map((f: { currency: string; score: number; strength?: number }) => ({ currency: f.currency, score: f.score ?? f.strength ?? 0 }))
    : (fx?.strengths ?? fx?.currencies ?? fx?.data ?? []).map((f: { currency: string; score: number; strength?: number }) => ({
        currency: f.currency, score: f.score ?? f.strength ?? 0,
      }))

  const ss = raw.sectorSentiment
  const sectorSentiment = Array.isArray(ss)
    ? ss.map((s: { sector: string; name?: string; score: number; sentiment?: number }) => ({ sector: s.sector ?? s.name ?? '', score: s.score ?? s.sentiment ?? 0 }))
    : (ss?.sectors ?? ss?.data ?? []).map((s: { sector: string; name?: string; score: number; sentiment?: number }) => ({
        sector: s.sector ?? s.name ?? '', score: s.score ?? s.sentiment ?? 0,
      }))

  const newsRaw = raw.news
  const allArticles = Array.isArray(newsRaw) ? newsRaw : (newsRaw?.articles ?? newsRaw?.data ?? [])

  // Pre-filter: remove obviously irrelevant headlines before Groq sees them
  const JUNK_PATTERNS = [
    // Shopping / deals
    /\bbest deals\b/i, /\bspring sale\b/i, /\bblack friday\b/i, /\bprime day\b/i,
    /\bamazon.*sale/i, /\bwalmart.*deal/i, /\btarget.*deal/i,
    /\bbest [a-z]+ to buy/i, /\bbest [a-z]+ for 202/i,
    // Tech / gadgets / apps
    /\bipad app/i, /\biphone app/i, /\bandroid app/i, /\bgadget/i, /\btech tip/i,
    /\bpower bank/i, /\bbattery pack/i, /\bcharger\b/i,
    /\bwish you had more time/i, /\bmake you wish/i,
    // Sports
    /\bAFCON\b/i, /\btrophy\b/i, /\bparade\b.*\btitle\b/i, /\bworld cup\b/i,
    /\bNBA\b/, /\bNFL\b/, /\bNHL\b/, /\bMLB\b/, /\bUEFA\b/, /\bFIFA\b/,
    /\bchampionship game\b/i, /\bplayoff/i, /\btouchdown/i, /\bgoal scorer/i,
    /\bsoccer\b/i, /\bfootball match/i, /\btennis\b/i, /\bgolf tournament/i,
    // Lifestyle / health / entertainment
    /\brecipe\b/i, /\bhoroscope/i, /\bceleb/i, /\bsports score/i,
    /\blifestyle\b/i, /\bfitness\b/i, /\bweight loss/i, /\bdiet\b/i,
    /\bheart stops\b/i, /\bhospital\b/i, /\btube comes loose/i,
    /\bdog\b.*\bcat\b/i, /\bpet\b/i,
    // Personal finance advice / listicles / retirement
    /\bretire[es]* should/i, /\bultra.safe dividend/i,
    /\bI'm \d+ and\b/i, /\bI am \d+ and\b/i,           // "I'm 73 and live in Florida"
    /\bshould I\b.*\b(buy|sell|ditch|keep|cancel)\b/i,
    /\bDo I\b.*\b(buy|sell|ditch|keep|cancel|need)\b/i,
    /\bditch my\b/i, /\bcancel my\b/i,
    /\bhome insurance\b/i, /\bcar insurance\b/i, /\blife insurance\b/i,
    /\bmortgage\b.*\badvice\b/i, /\b(my|your) portfolio\b/i,
    /\bhurricane.*insurance/i, /\binsurance.*hurricane/i,
    /\bpersonal finance\b/i, /\bfinancial advisor\b/i,
    /\bbig mistake\b/i, /\bworst mistake\b/i,
    /\bmy \$[\d,]+\b/i,                                  // "my $2,400 home insurance"
    /\bhere'?s how much\b/i, /\bhere'?s what I\b/i,
    /\bsave money\b/i, /\bsaving tips\b/i,
    /\bcredit score\b/i, /\bcredit card\b.*\bbest\b/i,
    // Weather / natural disaster personal stories (not geopolitical)
    /\bhurricanes? have come close\b/i,
    // History / memorial (not market-relevant)
    /\bholoca?ust\b/i, /\bHolocaust role\b/i,
    // Bizarre / clickbait
    /\bbizarre plan\b/i, /\byou won't believe\b/i, /\bshocking\b/i,
    /\bwill blow your mind\b/i, /\binsane\b/i,
    /\bIs It Worth It\b/i, /\bIs It Too Late\b/i,
    /\bThis \$[\d,]+ Stock\b/i,                          // "This $5,500 Stock"
    /\bco-?founder.*leaves\b/i, /\bleaves.*co-?founder\b/i,  // tech gossip
    // Personal finance listicles / loopholes
    /\bloophole\b/i, /\bquietly using\b/i, /\bshelter.*tax\b/i,
    /\b401\(k\)\b/i, /\bIRA\b.*\b(tip|trick|loophole)\b/i,
    /\bshopper perks\b/i, /\bnew perks\b/i,
    /\bwealthy savers\b/i, /\brich people\b/i,
    // Airbnb / real estate personal
    /\bairbnb\b.*\bguest\b/i, /\bmy (landlord|tenant|neighbor)\b/i,
    /\bdown.payment dilemma\b/i, /\breverse mortgage\b/i,
    /\b(gift|leave).*\b(kids|children|will)\b.*\bcash\b/i,
    // Crime / bizarre news (not geopolitical)
    /\bstole \d+ tons\b/i, /\bchocolate bars\b/i, /\bKitKat\b/i,
    /\bgobsmacked\b/i, /\bno manners\b/i,
    // Generic "growth sectors helping people" listicles
    /\bgrowth sectors.*helping\b/i, /\bhelping people flourish\b/i,
    // Medical / health stories
    /\bcancer\b.*\btreatment\b/i, /\bheart attack\b/i, /\bsurgery\b/i,
    // Entertainment / celebrity
    /\bTruth Social\b.*\bpost\b/i, /\binstagram\b.*\bpost\b/i,
    /\bred carpet\b/i, /\baward show\b/i,
  ]
  // Source quality tiers — prefer wire services and major business outlets
  const SOURCE_TIER: Record<string, number> = {
    'Reuters': 1, 'CNBC Top News': 1, 'CNBC': 1, 'MarketWatch': 1, 'Bloomberg': 1,
    'BBC World': 2, 'BBC': 2, 'France 24': 2, 'Al Jazeera': 2, 'AP News': 2,
    'DW News': 2, 'NPR': 2, 'South China Morning Post': 2,
    'Seeking Alpha': 3, 'Benzinga': 3, 'OilPrice.com': 3,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filtered = allArticles
    .filter((a: any) => {
      const hl = (a.headline ?? a.title ?? '') as string
      return hl && !JUNK_PATTERNS.some(p => p.test(hl))
    })

  // For weekly wrap: sample evenly across Mon→Fri so no day is overrepresented.
  // For weekend/daily: sort by source quality (wire services first).
  const headlineLimit = edition === 'weekly' ? 25 : 15
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let articles: any[]
  if (edition === 'weekly' && filtered.length > headlineLimit) {
    // Group by day, then round-robin pick from each day (newest first within each day)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const byDay = new Map<string, any[]>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const a of filtered) {
      const ts = a.publishedAt ?? Date.now()
      const day = new Date(ts).toISOString().slice(0, 10)
      if (!byDay.has(day)) byDay.set(day, [])
      byDay.get(day)!.push(a)
    }
    // Sort each day's articles by source quality
    for (const dayArticles of byDay.values()) {
      dayArticles.sort((a: { source?: string }, b: { source?: string }) => {
        const ta = SOURCE_TIER[a.source ?? ''] ?? 5
        const tb = SOURCE_TIER[b.source ?? ''] ?? 5
        return ta - tb
      })
    }
    // Round-robin across days (most recent day first)
    const days = [...byDay.keys()].sort().reverse()
    articles = []
    let idx = 0
    while (articles.length < headlineLimit) {
      let added = false
      for (const day of days) {
        const dayArts = byDay.get(day)!
        if (idx < dayArts.length) {
          articles.push(dayArts[idx])
          added = true
          if (articles.length >= headlineLimit) break
        }
      }
      if (!added) break
      idx++
    }
  } else {
    // Daily editions: source quality sort, newest articles naturally first from archive
    articles = filtered.sort((a: { source?: string }, b: { source?: string }) => {
      const ta = SOURCE_TIER[a.source ?? ''] ?? 5
      const tb = SOURCE_TIER[b.source ?? ''] ?? 5
      return ta - tb
    }).slice(0, headlineLimit)
  }

  const headlines = articles.map((a: { headline?: string; title?: string }) => a.headline ?? a.title ?? '')
    .filter(Boolean)

  // Groq will pick the 6 most important by index
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newsArticlesAll = articles.map((a: any) => ({
    headline: (a.headline ?? a.title ?? '') as string,
    imageUrl: (a.imageUrl ?? a.image ?? a.thumbnail ?? null) as string | null,
    source: (a.source ?? '') as string,
    url: (a.url ?? a.link ?? null) as string | null,
    publishedAt: (a.publishedAt ?? null) as number | null,
  })).filter((a: { headline: string }) => a.headline)
  // Default selection (first 6) — overridden after Groq responds
  let newsArticles = newsArticlesAll.slice(0, 6)

  const pulse = raw.marketPulse
  const pulseText = typeof pulse === 'string' ? pulse : (pulse?.text ?? pulse?.summary ?? pulse?.pulse ?? '')

  const commodities = raw.commoditiesStrip
    ? (Array.isArray(raw.commoditiesStrip) ? raw.commoditiesStrip : raw.commoditiesStrip.data ?? [])
    : []

  const centralBanks = raw.centralBanks
    ? (Array.isArray(raw.centralBanks) ? raw.centralBanks : raw.centralBanks.banks ?? raw.centralBanks.data ?? [])
    : []
  const econEvents = raw.econCalendar
    ? (Array.isArray(raw.econCalendar) ? raw.econCalendar : raw.econCalendar.events ?? raw.econCalendar.data ?? [])
    : []
  const earnings = raw.earningsCalendar
    ? (Array.isArray(raw.earningsCalendar) ? raw.earningsCalendar : raw.earningsCalendar.earnings ?? raw.earningsCalendar.data ?? [])
    : []
  const predictions = raw.predictions
    ? (Array.isArray(raw.predictions) ? raw.predictions : raw.predictions.markets ?? raw.predictions.data ?? [])
    : []
  const energy = raw.energy ?? null

  // Signals: top market-moving alerts
  const signalsRaw = raw.signals
  const signals = (Array.isArray(signalsRaw) ? signalsRaw : [])
    .filter((s: { severity?: string }) => s.severity === 'HIGH' || s.severity === 'MED')
    .slice(0, 5)
    .map((s: { text?: string; severity?: string; category?: string; explanation?: { type?: string; headline?: string; source?: string } }) => ({
      text: s.text ?? '',
      severity: s.severity ?? 'MED',
      category: s.category ?? 'price',
      explanation: s.explanation ? { type: s.explanation.type ?? '', headline: s.explanation.headline ?? '', source: s.explanation.source ?? '' } : undefined,
    }))

  // News heat: geopolitical intensity by region
  const nhRaw = raw.newsHeat
  const newsHeat = (Array.isArray(nhRaw) ? nhRaw : (nhRaw?.regions ?? nhRaw?.data ?? []))
    .filter((h: { intensity?: number }) => (h.intensity ?? 0) > 20)
    .slice(0, 4)
    .map((h: { region?: string; name?: string; intensity?: number; articles?: number; count?: number }) => ({
      region: h.region ?? h.name ?? '',
      intensity: h.intensity ?? 0,
      articles: h.articles ?? h.count ?? 0,
    }))

  // Heatmap: top 15 S&P stocks by market-cap weight
  const HEATMAP_WEIGHTS: Record<string, number> = {
    AAPL: 36, MSFT: 31, NVDA: 30, AMZN: 22, GOOGL: 21,
    META: 15, 'BRK-B': 10, AVGO: 9, LLY: 8, TSLA: 7,
    JPM: 7, V: 6, UNH: 5, XOM: 5, WMT: 5,
  }
  const stocksRaw = raw.stocks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stocksArr: any[] = stocksRaw
    ? (Array.isArray(stocksRaw) ? stocksRaw : (stocksRaw?.data ?? stocksRaw?.stocks ?? []))
    : []
  const heatmapStocks = Object.entries(HEATMAP_WEIGHTS)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map(([sym, weight]: [string, number]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = stocksArr.find((x: any) =>
        x.symbol === sym || x.symbol === sym.replace('-', '.') || x.symbol === sym.replace('-', '_')
      )
      return s ? { symbol: sym, name: s.name ?? sym, changePercent: s.changePercent ?? 0, weight } : null
    })
    .filter((x): x is { symbol: string; name: string; changePercent: number; weight: number } => x !== null)

  return {
    quotes, gainers, losers, fearGreed, cryptoFearGreed, riskLevel,
    radarVerdict, chokepoints, forexStrength, sectorSentiment, headlines,
    newsArticles, newsArticlesAll, heatmapStocks,
    pulseText, commodities, centralBanks, econEvents, earnings, predictions, energy,
    signals, newsHeat,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMover(m: any) {
  return {
    symbol: m.symbol ?? m.ticker ?? '',
    name:   m.name ?? m.companyName ?? m.symbol ?? '',
    change: m.change ?? m.priceChange ?? 0,
    changePercent: m.changePercent ?? m.changesPercentage ?? m.change_percent ?? 0,
    price:  m.price ?? m.lastPrice ?? 0,
  }
}

// ─── Data-driven slide scoring ─────────────────────────────────────────────
// Each slide type gets a 0-100 "interest" score based on how dramatic its
// current data is. The top N scoring slides win slots in the brief.
// This replaces the old hardcoded editionSlides map.

interface SlideScore { type: SlideType; score: number; reason: string }

const WEEKEND_BLOCKED = new Set<SlideType>([
  'heatmap', 'movers', 'sectors', 'forex', 'scoreboard', 'pulse', 'energy',
])

/** Check whether a slide type has enough data to render */
function hasSlideData(type: SlideType, d: ExtractedData): boolean {
  switch (type) {
    case 'heatmap':    return d.heatmapStocks.length > 0
    case 'headlines':  return d.newsArticles.length > 0 || d.newsArticlesAll.length > 0
    case 'signals':    return d.signals.length > 0
    case 'movers':     return d.gainers.length > 0 || d.losers.length > 0
    case 'energy':     return d.quotes['BZ=F']?.price > 0
    case 'crypto':     return d.quotes['BTC-USD']?.price > 0
    case 'forex':      return d.forexStrength.length > 0
    case 'sectors':    return d.sectorSentiment.length > 0
    case 'radar':      return d.radarVerdict != null
    case 'sentiment':  return d.fearGreed != null
    case 'outlook':    return true
    case 'pulse':      return d.quotes['SPY']?.price > 0
    case 'scoreboard': return Object.keys(d.quotes).length > 2
    case 'narrative':  return true
    default:           return false
  }
}

const abs = (n: number | null | undefined) => Math.abs(n ?? 0)

/** Score every slide type based on how "interesting" its data is right now */
function scoreSlides(
  d: ExtractedData,
  edition: Edition,
  groqNarrative: { whyMoved: string; weekRecap: string },
): SlideType[] {
  const isWeekend = edition === 'weekend'
  const isWeekly  = edition === 'weekly'
  const middleCount = isWeekend ? 4 : isWeekly ? 6 : 5

  const scores: SlideScore[] = []
  const q = d.quotes

  // Helper: clamp score to a max
  const s = (type: SlideType, score: number, reason: string) =>
    scores.push({ type, score: Math.min(score, 100), reason })

  // ── heatmap ──────────────────────────────────────────────────
  {
    let sc = 40, why = 'base'
    const spyAbs = abs(q['SPY']?.changePercent)
    if (spyAbs > 1.5)      { sc += 30; why = `SPY ${spyAbs.toFixed(1)}%` }
    else if (spyAbs > 0.8) { sc += 20; why = `SPY ${spyAbs.toFixed(1)}%` }
    const maxStock = Math.max(...d.heatmapStocks.map(x => abs(x.changePercent)), 0)
    if (maxStock > 5) { sc += 15; why += `, stock ${maxStock.toFixed(1)}%` }
    const spread = d.heatmapStocks.length > 1
      ? Math.max(...d.heatmapStocks.map(x => x.changePercent)) - Math.min(...d.heatmapStocks.map(x => x.changePercent))
      : 0
    if (spread > 4) { sc += 10; why += `, spread ${spread.toFixed(1)}` }
    s('heatmap', sc, why)
  }

  // ── headlines ────────────────────────────────────────────────
  {
    let sc = 70, why = 'base (always relevant)'
    const imgCount = d.newsArticles.filter(a => a.imageUrl).length
    if (imgCount >= 4) { sc += 15; why = `${imgCount} articles w/ images` }
    const hasHighSignalHeadline = d.signals.some(sg =>
      sg.severity === 'HIGH' && sg.explanation?.headline
    )
    if (hasHighSignalHeadline) { sc += 10; why += ' + HIGH signal headline' }
    s('headlines', sc, why)
  }

  // ── signals ──────────────────────────────────────────────────
  {
    let sc = 15, why = 'base'
    const high = d.signals.filter(sg => sg.severity === 'HIGH').length
    const med  = d.signals.filter(sg => sg.severity === 'MED').length
    sc += Math.min(high, 3) * 20
    sc += Math.min(med, 3) * 8
    if (high > 0) why = `${high} HIGH signals`
    else if (med > 0) why = `${med} MED signals`
    const hotRegion = d.newsHeat.some(h => h.intensity > 70)
    if (hotRegion) { sc += 15; why += ' + hot region' }
    s('signals', sc, why)
  }

  // ── sentiment ────────────────────────────────────────────────
  {
    let sc = 25, why = 'base'
    const fg = d.fearGreed?.score ?? 50
    if (fg <= 20 || fg >= 80) { sc += 30; why = `F&G extreme: ${fg}` }
    else if (fg <= 30 || fg >= 70) { sc += 20; why = `F&G notable: ${fg}` }
    const fgPrev = d.fearGreed?.previousClose ?? fg
    if (abs(fg - fgPrev) > 10) { sc += 15; why += `, shift ${Math.abs(fg - fgPrev)}` }
    if ((d.riskLevel?.score ?? 50) > 70) { sc += 10; why += ', high risk' }
    const radar = d.radarVerdict?.verdict ?? 'MIXED'
    if (radar === 'BUY' || radar === 'SELL') { sc += 10; why += `, radar ${radar}` }
    s('sentiment', sc, why)
  }

  // ── movers ───────────────────────────────────────────────────
  {
    let sc = 30, why = 'base'
    const topGain = d.gainers[0]?.changePercent ?? 0
    const topLoss = d.losers[0]?.changePercent ?? 0
    if (topGain > 8 || topLoss < -8)      { sc += 25; why = `extreme mover ${Math.max(topGain, abs(topLoss)).toFixed(1)}%` }
    else if (topGain > 5 || topLoss < -5)  { sc += 15; why = `strong mover ${Math.max(topGain, abs(topLoss)).toFixed(1)}%` }
    const bigGainers = d.gainers.filter(g => g.changePercent > 3).length
    const bigLosers  = d.losers.filter(l => l.changePercent < -3).length
    if (bigGainers >= 3 && bigLosers >= 3) { sc += 10; why += ', broad volatility' }
    s('movers', sc, why)
  }

  // ── energy ───────────────────────────────────────────────────
  {
    let sc = 15, why = 'base'
    const brentPct = abs(q['BZ=F']?.changePercent)
    const ngPct    = abs(q['NG=F']?.changePercent)
    const goldPct  = abs(q['GC=F']?.changePercent)
    if (brentPct > 3)      { sc += 35; why = `Brent ${brentPct.toFixed(1)}%` }
    else if (brentPct > 2) { sc += 25; why = `Brent ${brentPct.toFixed(1)}%` }
    if (ngPct > 4)   { sc += 20; why += `, NatGas ${ngPct.toFixed(1)}%` }
    if (goldPct > 1.5) { sc += 15; why += `, Gold ${goldPct.toFixed(1)}%` }
    const activeChokepoints = d.chokepoints.filter(c => c.status !== 'NORMAL').length
    if (activeChokepoints > 0) { sc += 10; why += `, ${activeChokepoints} chokepoints` }
    s('energy', sc, why)
  }

  // ── crypto ───────────────────────────────────────────────────
  {
    let sc = 20, why = 'base'
    const btcPct = abs(q['BTC-USD']?.changePercent)
    const ethPct = abs(q['ETH-USD']?.changePercent)
    const solPct = abs(q['SOL-USD']?.changePercent)
    if (btcPct > 5)      { sc += 35; why = `BTC ${btcPct.toFixed(1)}%` }
    else if (btcPct > 3) { sc += 25; why = `BTC ${btcPct.toFixed(1)}%` }
    if (ethPct > 7 || solPct > 7) { sc += 15; why += `, alt ${Math.max(ethPct, solPct).toFixed(1)}%` }
    const cfg = d.cryptoFearGreed?.score ?? 50
    if (cfg <= 15 || cfg >= 85)      { sc += 15; why += `, crypto F&G ${cfg}` }
    else if (cfg <= 25 || cfg >= 75) { sc += 10; why += `, crypto F&G ${cfg}` }
    if (isWeekend) { sc += 15; why += ' (weekend — only live market)' }
    s('crypto', sc, why)
  }

  // ── forex ────────────────────────────────────────────────────
  {
    let sc = 15, why = 'base'
    const dxyPct = abs(q['DX-Y.NYB']?.changePercent)
    if (dxyPct > 0.8)      { sc += 25; why = `DXY ${dxyPct.toFixed(2)}%` }
    else if (dxyPct > 0.5) { sc += 15; why = `DXY ${dxyPct.toFixed(2)}%` }
    const fxScores = d.forexStrength.map(f => f.score)
    const maxFx = Math.max(...fxScores.map(Math.abs), 0)
    if (maxFx > 3) { sc += 20; why += `, extreme fx ${maxFx.toFixed(1)}` }
    const fxSpread = fxScores.length > 1 ? Math.max(...fxScores) - Math.min(...fxScores) : 0
    if (fxSpread > 5) { sc += 10; why += `, spread ${fxSpread.toFixed(1)}` }
    s('forex', sc, why)
  }

  // ── sectors ──────────────────────────────────────────────────
  {
    let sc = 15, why = 'base'
    const secScores = d.sectorSentiment.map(x => x.score)
    const secSpread = secScores.length > 1 ? Math.max(...secScores) - Math.min(...secScores) : 0
    if (secSpread > 6) { sc += 25; why = `rotation spread ${secSpread.toFixed(1)}` }
    const maxSec = Math.max(...secScores.map(Math.abs), 0)
    if (maxSec > 4) { sc += 15; why += `, extreme sector ${maxSec.toFixed(1)}` }
    const negCount = secScores.filter(x => x < 0).length
    if (negCount >= 3) { sc += 10; why += `, ${negCount} sectors negative` }
    s('sectors', sc, why)
  }

  // ── radar ────────────────────────────────────────────────────
  {
    let sc = 15, why = 'base'
    const verdict = d.radarVerdict?.verdict ?? 'MIXED'
    if (verdict === 'BUY' || verdict === 'SELL') { sc += 25; why = `radar ${verdict}` }
    const signalCount = d.radarVerdict?.signals?.length ?? 0
    if (signalCount >= 4) { sc += 10; why += `, ${signalCount} signals` }
    s('radar', sc, why)
  }

  // ── outlook ──────────────────────────────────────────────────
  {
    let sc = 35, why = 'base (forward-looking)'
    if (d.econEvents.length >= 3)  { sc += 15; why = `${d.econEvents.length} econ events` }
    if (d.earnings.length >= 3)    { sc += 10; why += `, ${d.earnings.length} earnings` }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extremePred = d.predictions.some((p: any) => {
      const prob = p.probability ?? p.yesPrice ?? 0.5
      const pct = prob > 1 ? prob : prob * 100
      return pct > 80 || pct < 20
    })
    if (extremePred) { sc += 10; why += ', extreme prediction' }
    if (isWeekend) { sc += 10; why += ' (week ahead)' }
    s('outlook', sc, why)
  }

  // ── narrative ────────────────────────────────────────────────
  {
    let sc = 30, why = 'base'
    if (groqNarrative.whyMoved || groqNarrative.weekRecap) { sc += 20; why = 'Groq generated content' }
    const activeChokepoints = d.chokepoints.filter(c => c.status !== 'NORMAL').length
    if (activeChokepoints > 0) { sc += 15; why += `, ${activeChokepoints} chokepoints` }
    // Guarantee for recap editions
    if (isWeekend || isWeekly) { sc = 100; why = 'guaranteed for recap edition' }
    s('narrative', sc, why)
  }

  // ── pulse ────────────────────────────────────────────────────
  {
    let sc = 20, why = 'base'
    const spyPct = q['SPY']?.changePercent ?? 0
    const btcPct = q['BTC-USD']?.changePercent ?? 0
    const riskAvg = (spyPct + btcPct) / 2
    if (abs(riskAvg) > 1.5) { sc += 15; why = `risk bias ${riskAvg.toFixed(1)}` }
    if (abs(spyPct) > 1 && abs(btcPct) > 1 && Math.sign(spyPct) === Math.sign(btcPct)) {
      sc += 10; why += ', correlated move'
    }
    s('pulse', sc, why)
  }

  // ── scoreboard ───────────────────────────────────────────────
  {
    let sc = 20, why = 'base'
    const bigMoves = ['SPY','QQQ','DIA','IWM','BTC-USD','GC=F','BZ=F','DX-Y.NYB']
      .filter(sym => abs(q[sym]?.changePercent) > 1).length
    if (bigMoves >= 4) { sc += 15; why = `${bigMoves}/8 moved >1%` }
    s('scoreboard', sc, why)
  }

  // ── Filter, rank, select ─────────────────────────────────────

  const eligible = scores
    .filter(x => x.score > 0)
    .filter(x => !(isWeekend && WEEKEND_BLOCKED.has(x.type)))
    .filter(x => hasSlideData(x.type, d))
    .sort((a, b) => b.score - a.score)

  const selected = eligible.slice(0, middleCount)

  // Guarantee headlines (always included if we have news)
  if (!selected.find(x => x.type === 'headlines')) {
    const headlineEntry = eligible.find(x => x.type === 'headlines')
    if (headlineEntry && selected.length > 0) {
      selected[selected.length - 1] = headlineEntry
    }
  }

  // Guarantee narrative for recap editions
  if ((isWeekend || isWeekly) && !selected.find(x => x.type === 'narrative')) {
    const narrativeEntry = eligible.find(x => x.type === 'narrative')
    if (narrativeEntry) {
      const replaceIdx = [...selected].reverse().findIndex(x => x.type !== 'headlines')
      if (replaceIdx >= 0) selected[selected.length - 1 - replaceIdx] = narrativeEntry
    }
  }

  // Sort by score descending — most dramatic slide is first after cover
  selected.sort((a, b) => b.score - a.score)

  // Log for debugging
  console.log('[daily-brief] slide scores:', selected.map(x => `${x.type}:${x.score} (${x.reason})`).join(', '))

  return selected.map(x => x.type)
}

// ─── Groq call ──────────────────────────────────────────────────────────────

const EDITION_PROMPTS: Record<Edition, string> = {
  morning: `MORNING PRE-MARKET brief.
Focus on: what happened overnight (Asia/Europe sessions), pre-market futures,
what to watch TODAY (earnings, econ data, Fed speakers, geopolitics).
Frame: "Here's what you need to know before the bell."
The PREVIOUS closing brief already covered yesterday's session — do NOT repeat yesterday's stock moves.`,

  close: `EVENING POST-MARKET brief.
Focus on: how today actually played out, the dominant story, sector rotation,
winners/losers, and what it means.
Frame: "Here's what happened and what it means."
The MORNING brief already covered overnight + pre-market setup — focus on the SESSION itself.`,

  weekend: `WEEKEND BRIEF for Monday morning.
Focus ONLY on Saturday/Sunday events: geopolitical breaking news, weekend policy
announcements, crypto moves (the only live market), and their Monday implications.
ALL stock, commodity, forex, and bond markets are CLOSED. Do NOT cite any prices
or percentage moves for closed markets — the Friday closing brief already covered those.
Only reference crypto prices (BTC, ETH, SOL) as live data.
Frame: "Here's what happened while markets were closed and what it means for Monday."`,

  weekly: `WEEKLY WRAP for Friday evening.
WEEK IN REVIEW: narrative arc from Monday to Friday, cumulative weekly performance,
the week's defining moments and surprises. Forward look at next week's catalysts.
Frame: "Closing the chapter on this week."`,
}

async function callGroq(edition: Edition, d: ExtractedData): Promise<GroqBriefResponse> {
  const weekly = isWeeklyEdition(edition)
  const isWeekend = edition === 'weekend'

  // Weekend: only crypto (the only markets actually open and moving)
  const quoteSymbols = isWeekend
    ? ['BTC-USD', 'ETH-USD', 'SOL-USD']
    : ['SPY', 'QQQ', 'DIA', 'IWM', 'GC=F', 'BZ=F', 'SI=F', 'NG=F', 'BTC-USD', 'ETH-USD', 'SOL-USD', 'DX-Y.NYB']
  const quoteLines = quoteSymbols
    .map(sym => {
      const q = d.quotes[sym]
      if (!q) return null
      const pct = q.changePercent ?? ((q.change / (q.price - q.change)) * 100)
      return `${sym}: $${q.price?.toFixed(2)} (${pct >= 0 ? '+' : ''}${pct?.toFixed(2)}%)`
    }).filter(Boolean).join('\n')

  const gainerLines = d.gainers.slice(0, 5).map(g =>
    `${g.symbol}: +${g.changePercent?.toFixed(2)}% ($${g.price?.toFixed(2)})`
  ).join(', ')

  const loserLines = d.losers.slice(0, 5).map(l =>
    `${l.symbol}: ${l.changePercent?.toFixed(2)}% ($${l.price?.toFixed(2)})`
  ).join(', ')

  const chokepointLines = d.chokepoints
    .filter(c => c.status !== 'NORMAL')
    .map(c => `${c.name}: ${c.status} — ${c.description}`)
    .join('\n') || 'All chokepoints NORMAL'

  const fxLines = d.forexStrength
    .sort((a, b) => b.score - a.score)
    .map(f => `${f.currency}: ${f.score > 0 ? '+' : ''}${f.score.toFixed(1)}`)
    .join(', ')

  const sectorLines = d.sectorSentiment
    .sort((a, b) => b.score - a.score)
    .map(s => `${s.sector}: ${s.score > 0 ? '+' : ''}${s.score.toFixed(1)}`)
    .join(', ')

  // Pass headlines for Groq to rank by importance (more for weekly editions)
  // For weekly wrap: include source + date so Groq can assess day-by-day importance
  const isWeeklyWrap = edition === 'weekly'
  const headlineBlock = d.newsArticlesAll.slice(0, isWeeklyWrap ? 25 : 15).map((a, i) => {
    const dateStr = a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('en-US', { weekday: 'short' }) : ''
    return isWeeklyWrap && dateStr
      ? `${i + 1}. [${dateStr}] [${a.source}] ${a.headline}`
      : `${i + 1}. ${a.headline}`
  }).join('\n')

  const earningsList = d.earnings.slice(0, 8).map((e: { symbol?: string; ticker?: string }) =>
    e.symbol ?? e.ticker ?? ''
  ).filter(Boolean).join(', ')

  const predictionLines = d.predictions.slice(0, 5).map((p: { question?: string; title?: string; probability?: number; yesPrice?: number }) => {
    const prob = p.probability ?? p.yesPrice ?? 0
    const pct = prob > 1 ? prob : prob * 100
    return `${p.question ?? p.title ?? ''} (${pct.toFixed(0)}%)`
  }).join('\n')

  const weekRecapField = edition === 'weekly'
    ? `"weekRecap": "<exactly 4 bullets separated by \\n. Format: DAY_LABEL: what happened — consequence. NO dollar amounts (we inject real prices). NO markdown. Example format: 'MONDAY: Markets opened cautious on tariff fears — S&P fell sharply\\nWEDNESDAY: Brent crude spiked after Saudi supply cut\\nTHURSDAY: Tech earnings disappointed — NVDA and META led selloff\\nFRIDAY: Fear index reached extreme levels, worst reading since 2022'>",`
    : ''

  // Signals summary for Groq context
  const signalLines = d.signals.slice(0, 5).map(s => s.text).join('\n')

  const systemPrompt = `You are a senior financial content strategist creating a market brief for Instagram carousel slides.

${EDITION_PROMPTS[edition]}

MARKET DATA${edition === 'weekly' ? ' (% are WEEKLY cumulative Mon→Fri)' : isWeekend ? ' (WEEKEND — only crypto is live)' : ''}:

PRICES:
${quoteLines}
${isWeekend ? '' : `
GAINERS: ${gainerLines || 'N/A'}
LOSERS: ${loserLines || 'N/A'}`}
${isWeekend ? '' : `
FEAR & GREED: ${d.fearGreed ? `${d.fearGreed.score} (${d.fearGreed.rating})` : 'N/A'}
RISK: ${d.riskLevel ? `${d.riskLevel.score} (${d.riskLevel.label})` : 'N/A'}
RADAR: ${d.radarVerdict ? d.radarVerdict.verdict : 'N/A'}`}
CRYPTO FEAR & GREED: ${d.cryptoFearGreed ? `${d.cryptoFearGreed.score} (${d.cryptoFearGreed.label})` : 'N/A'}

CHOKEPOINTS: ${chokepointLines}
${signalLines ? `\nSIGNALS:\n${signalLines}` : ''}
${isWeekend ? '' : `FOREX: ${fxLines || 'N/A'}
SECTORS: ${sectorLines || 'N/A'}`}

HEADLINES:
${headlineBlock || 'N/A'}

EARNINGS: ${earningsList || 'None'}
POLYMARKET: ${predictionLines || 'N/A'}

Respond with valid JSON only — no markdown fences:
{
  "briefTitle": "<powerful headline, max 10 words, specific to today's events>",
  "briefSubtitle": "ignored",
  "whyMoved": "<exactly 4 bullets separated by \\n. Format: ALL_CAPS_TOPIC: what happened — consequence. Each bullet must cover a DIFFERENT theme (no two about the same topic). NO dollar amounts or percentages — we auto-inject real numbers. NO markdown. Just describe events and consequences in plain text.>",
  ${weekRecapField}
  "energyNarrative": "<1 sentence, max 20 words, NO dollar amounts — describe the move, not the price>",
  "cryptoNarrative": "<1 sentence, max 20 words, NO dollar amounts>",
  "forexNarrative": "<1 sentence, max 20 words>",
  "sentimentVerdict": "<1 punchy sentence, max 15 words>",
  "watchItems": ["<item 1: max 12 words>", "<item 2>", "<item 3>"],
  "topHeadlineIndices": [<6 numbers: 1-based indices from HEADLINES, ranked by macro importance>],
  "slideOrder": ["ignored"]
}

HEADLINE RANKING (topHeadlineIndices):
- Pick the 6 most macro-relevant headlines. First = hero story (shown largest).
- PREFER: geopolitics, central banks, GDP/inflation, sanctions, military conflicts, energy shocks, major earnings
- SKIP: personal finance, insurance, lifestyle, sports, clickbait, "best of" lists, celebrity
- Each picked headline must cover a DIFFERENT event — never pick 2 headlines about the same story

WRITING RULES:
- NO markdown (no **, *, #, backticks) — plain text only
- NO dollar amounts or percentages in whyMoved/weekRecap/narratives — we inject real numbers automatically
- Say "Brent crude" not "oil" or "crude" when discussing petroleum
- briefTitle: scroll-stopping, event-specific (not "Market Recap" or "Weekly Wrap")
- Each whyMoved bullet must be a DISTINCT theme — if 2 bullets are about the same topic, merge them
- Be direct, opinionated, trader language`

  const dateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const editionLabels: Record<Edition, string> = {
    morning: 'morning pre-market',
    close: 'evening post-market',
    weekend: 'Monday morning weekend recap',
    weekly: 'Friday evening weekly wrap',
  }

  const completion = await groqChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: `Generate the ${editionLabels[edition]} brief for ${dateFormatted}.` },
    ],
    temperature:     0.4,
    max_tokens:      edition === 'weekly' ? 1600 : 1200,
    response_format: { type: 'json_object' },
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  let parsed: Partial<GroqBriefResponse>
  try { parsed = JSON.parse(raw) } catch { parsed = {} }

  // ── Data-driven slide selection — scored by how interesting the data is ────
  const dynamicMiddle = scoreSlides(d, edition, {
    whyMoved: parsed.whyMoved ?? '',
    weekRecap: parsed.weekRecap ?? '',
  })
  const slideOrder = ['cover' as SlideType, ...dynamicMiddle, 'cta' as SlideType]

  // Post-process: fix hallucinated prices in Groq text with real data
  const fixPrices = (text: string): string => {
    if (!text) return text

    const fmtPrice = (p: number) =>
      p >= 10000 ? `$${(p / 1000).toFixed(1)}k` : p >= 100 ? `$${Math.round(p)}` : `$${p.toFixed(2)}`

    // Map of keywords → real price from quotes (all 12 symbols)
    const priceMap: Array<[RegExp, number]> = [
      [/\b(?:Brent|brent|crude|oil)\b[^$]*\$[\d,.]+k?/gi, d.quotes['BZ=F']?.price],
      [/\bgold\b[^$]*\$[\d,.]+k?/gi, d.quotes['GC=F']?.price],
      [/\bsilver\b[^$]*\$[\d,.]+k?/gi, d.quotes['SI=F']?.price],
      [/\b(?:nat(?:ural)?\s*gas|NG)\b[^$]*\$[\d,.]+k?/gi, d.quotes['NG=F']?.price],
      [/\b(?:BTC|Bitcoin|bitcoin)\b[^$]*\$[\d,.]+k?/gi, d.quotes['BTC-USD']?.price],
      [/\b(?:ETH|Ethereum|ethereum)\b[^$]*\$[\d,.]+k?/gi, d.quotes['ETH-USD']?.price],
      [/\b(?:SOL|Solana|solana)\b[^$]*\$[\d,.]+k?/gi, d.quotes['SOL-USD']?.price],
      [/\b(?:S&P|SPY|S&P\s*500)\b[^$]*\$[\d,.]+k?/gi, d.quotes['SPY']?.price],
      [/\b(?:QQQ|Nasdaq\s*100)\b[^$]*\$[\d,.]+k?/gi, d.quotes['QQQ']?.price],
      [/\b(?:DIA|Dow)\b[^$]*\$[\d,.]+k?/gi, d.quotes['DIA']?.price],
      [/\b(?:IWM|Russell)\b[^$]*\$[\d,.]+k?/gi, d.quotes['IWM']?.price],
      [/\b(?:DXY|dollar\s*index)\b[^$]*\$[\d,.]+k?/gi, d.quotes['DX-Y.NYB']?.price],
    ].filter((p): p is [RegExp, number] => p[1] != null && p[1] > 0)

    let fixed = text
    for (const [pattern, realPrice] of priceMap) {
      fixed = fixed.replace(pattern, (match) =>
        match.replace(/\$[\d,.]+k?/i, fmtPrice(realPrice))
      )
    }

    // Fix hallucinated percentages — match "SPY fell 3.2%" patterns
    const pctMap: Array<[RegExp, number]> = [
      [/\b(?:S&P|SPY)\b[^%]*[\d.]+%/gi, d.quotes['SPY']?.changePercent],
      [/\b(?:QQQ|Nasdaq)\b[^%]*[\d.]+%/gi, d.quotes['QQQ']?.changePercent],
      [/\b(?:DIA|Dow)\b[^%]*[\d.]+%/gi, d.quotes['DIA']?.changePercent],
      [/\b(?:Brent|brent|crude|oil)\b[^%]*[\d.]+%/gi, d.quotes['BZ=F']?.changePercent],
      [/\b(?:BTC|Bitcoin)\b[^%]*[\d.]+%/gi, d.quotes['BTC-USD']?.changePercent],
      [/\b(?:ETH|Ethereum)\b[^%]*[\d.]+%/gi, d.quotes['ETH-USD']?.changePercent],
      [/\bgold\b[^%]*[\d.]+%/gi, d.quotes['GC=F']?.changePercent],
    ].filter((p): p is [RegExp, number] => p[1] != null)

    for (const [pattern, realPct] of pctMap) {
      const fmtPct = `${Math.abs(realPct).toFixed(1)}%`
      fixed = fixed.replace(pattern, (match) =>
        match.replace(/[\d.]+%/, fmtPct)
      )
    }

    return fixed
  }

  return {
    briefTitle:       parsed.briefTitle       ?? 'Market Brief',
    briefSubtitle:    parsed.briefSubtitle    ?? '',
    whyMoved:         fixPrices(parsed.whyMoved ?? ''),
    weekRecap:        fixPrices(parsed.weekRecap ?? ''),
    energyNarrative:  fixPrices(parsed.energyNarrative ?? ''),
    cryptoNarrative:  fixPrices(parsed.cryptoNarrative ?? ''),
    forexNarrative:   fixPrices(parsed.forexNarrative ?? ''),
    sentimentVerdict: parsed.sentimentVerdict  ?? '',
    watchItems:       Array.isArray(parsed.watchItems) ? parsed.watchItems.slice(0, 6) : [],
    topHeadlineIndices: Array.isArray(parsed.topHeadlineIndices) ? parsed.topHeadlineIndices : [],
    slideOrder:       slideOrder as SlideType[],
  }
}

// ─── Build slides ───────────────────────────────────────────────────────────

function buildSlides(
  groq: GroqBriefResponse,
  d: ExtractedData,
  edition: Edition,
): SlideData[] {
  const weekly = isWeeklyEdition(edition)

  const SYMBOL_LABELS: Record<string, string> = {
    'SPY': 'S&P 500', 'QQQ': 'Nasdaq 100', 'DIA': 'Dow Jones', 'IWM': 'Russell 2000',
    'GC=F': 'Gold', 'BZ=F': 'Brent Crude', 'SI=F': 'Silver', 'NG=F': 'Nat Gas',
    'BTC-USD': 'Bitcoin', 'ETH-USD': 'Ethereum', 'SOL-USD': 'Solana', 'DX-Y.NYB': 'US Dollar',
  }

  const EDITION_LABELS: Record<Edition, string> = {
    morning: 'MORNING BRIEF', close: 'CLOSING BRIEF',
    weekend: 'WEEKEND BRIEF', weekly: 'WEEKLY WRAP',
  }

  const builders: Record<SlideType, () => SlideData> = {
    cover: () => {
      // Edition-specific hero data for visual differentiation
      const heroSyms = edition === 'weekend'
        ? ['BTC-USD', 'ETH-USD', 'SOL-USD'] // crypto only — all other markets closed
        : edition === 'morning'
        ? ['SPY', 'QQQ', 'BTC-USD', 'BZ=F']   // pre-market focus + Brent
        : edition === 'close'
        ? ['SPY', 'QQQ', 'BZ=F', 'GC=F']      // full index + Brent + Gold
        : ['SPY', 'QQQ', 'BZ=F', 'GC=F']      // weekly overview + Brent + Gold
      const heroQuotes = heroSyms.map(sym => ({
        symbol: sym, name: SYMBOL_LABELS[sym] ?? sym,
        price: d.quotes[sym]?.price ?? 0,
        changePercent: d.quotes[sym]?.changePercent ?? 0,
      }))

      // Build subtitle from REAL data — never let Groq hallucinate prices
      const fmtSub = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`
      const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
      const subtitleParts: string[] = []
      const sq = d.quotes
      if (edition === 'weekend') {
        if (sq['BTC-USD']?.price) subtitleParts.push(`BTC ${fmtSub(sq['BTC-USD'].price)}`)
        if (sq['ETH-USD']?.price) subtitleParts.push(`ETH ${fmtSub(sq['ETH-USD'].price)}`)
        if (sq['SOL-USD']?.price) subtitleParts.push(`SOL ${fmtSub(sq['SOL-USD'].price)}`)
      } else {
        if (sq['SPY']?.changePercent != null) subtitleParts.push(`S&P ${fmtPct(sq['SPY'].changePercent)}`)
        if (sq['BZ=F']?.price)    subtitleParts.push(`Brent ${fmtSub(sq['BZ=F'].price)}`)
        if (sq['GC=F']?.price)    subtitleParts.push(`Gold ${fmtSub(sq['GC=F'].price)}`)
      }
      if (edition !== 'weekend' && d.fearGreed?.score != null) subtitleParts.push(`Fear: ${d.fearGreed.score}`)
      const realSubtitle = subtitleParts.join(' · ')

      return {
        type: 'cover' as SlideType,
        title: groq.briefTitle,
        label: EDITION_LABELS[edition],
        content: {
          subtitle: realSubtitle,
          edition,
          heroQuotes,
          topGainer: edition === 'weekend' ? null : (d.gainers[0] ?? null),
          topLoser: edition === 'weekend' ? null : (d.losers[0] ?? null),
          // Weekend: all sentiment indicators are stale Friday data — hide them
          fearGreedScore: edition === 'weekend' ? null : (d.fearGreed?.score ?? null),
          radarVerdict: edition === 'weekend' ? null : (d.radarVerdict?.verdict ?? null),
          riskScore: edition === 'weekend' ? null : (d.riskLevel?.score ?? null),
          topHeadline: d.newsArticles[0]?.headline ?? d.headlines[0] ?? null,
          isWeekly: edition === 'weekly',
          dateRange: edition === 'weekly' ? getWeekDateRange() : null,
        },
      }
    },

    scoreboard: () => ({
      type: 'scoreboard',
      title: weekly ? 'Weekly Levels' : 'Market Snapshot',
      label: weekly ? 'WEEK CHANGE' : 'KEY LEVELS',
      content: {
        isWeekly: weekly,
        quotes: ['SPY', 'QQQ', 'DIA', 'IWM', 'BTC-USD', 'GC=F', 'BZ=F', 'DX-Y.NYB'].map(sym => {
          const q = d.quotes[sym]
          return {
            symbol: sym, name: SYMBOL_LABELS[sym] ?? sym,
            price: q?.price ?? 0,
            change: q?.change ?? 0,
            changePercent: q?.changePercent ?? 0,
          }
        }),
      },
    }),

    sentiment: () => ({
      type: 'sentiment',
      title: 'Market Sentiment',
      label: 'FEAR & GREED',
      content: {
        fearGreed: d.fearGreed,
        cryptoFearGreed: d.cryptoFearGreed,
        riskLevel: d.riskLevel,
        radarVerdict: d.radarVerdict?.verdict ?? 'MIXED',
        sentimentVerdict: groq.sentimentVerdict,
      },
    }),

    narrative: () => ({
      type: 'narrative',
      title: edition === 'weekend' ? 'Weekend Developments'
        : edition === 'weekly' ? 'The Week That Was'
        : edition === 'morning' ? 'Overnight Story' : 'Why Markets Moved',
      label: edition === 'weekend' ? 'WEEKEND EVENTS'
        : edition === 'weekly' ? 'WEEK NARRATIVE' : 'MARKET NARRATIVE',
      content: {
        // Weekend uses whyMoved (weekend events), weekly uses weekRecap (Mon→Fri story)
        narrative: edition === 'weekly' && groq.weekRecap ? groq.weekRecap : groq.whyMoved,
        chokepoints: d.chokepoints.filter(c => c.status !== 'NORMAL'),
      },
    }),

    movers: () => ({
      type: 'movers',
      title: weekly ? "Week's Top Movers" : 'Top Movers',
      label: 'WINNERS & LOSERS',
      content: {
        gainers: d.gainers.slice(0, 5),
        losers:  d.losers.slice(0, 5),
      },
    }),

    energy: () => {
      const oil = d.quotes['BZ=F']
      const gold = d.quotes['GC=F']
      const silver = d.quotes['SI=F']
      const natgas = d.quotes['NG=F']
      return {
        type: 'energy',
        title: 'Energy & Commodities',
        label: 'COMMODITIES',
        content: {
          oil:   oil ? { price: oil.price, change: oil.change, changePercent: oil.changePercent } : null,
          gold:  gold ? { price: gold.price, change: gold.change, changePercent: gold.changePercent } : null,
          silver: silver ? { price: silver.price, change: silver.change, changePercent: silver.changePercent } : null,
          natgas: natgas ? { price: natgas.price, change: natgas.change, changePercent: natgas.changePercent } : null,
          narrative: groq.energyNarrative,
        },
      }
    },

    crypto: () => ({
      type: 'crypto',
      title: 'Crypto Markets',
      label: 'DIGITAL ASSETS',
      content: {
        btc: d.quotes['BTC-USD'] ? { price: d.quotes['BTC-USD'].price, change: d.quotes['BTC-USD'].change, changePercent: d.quotes['BTC-USD'].changePercent } : null,
        eth: d.quotes['ETH-USD'] ? { price: d.quotes['ETH-USD'].price, change: d.quotes['ETH-USD'].change, changePercent: d.quotes['ETH-USD'].changePercent } : null,
        sol: d.quotes['SOL-USD'] ? { price: d.quotes['SOL-USD'].price, change: d.quotes['SOL-USD'].change, changePercent: d.quotes['SOL-USD'].changePercent } : null,
        cryptoFearGreed: d.cryptoFearGreed,
        narrative: groq.cryptoNarrative,
      },
    }),

    forex: () => ({
      type: 'forex',
      title: 'Currency Markets',
      label: 'FOREX STRENGTH',
      content: {
        dxy: d.quotes['DX-Y.NYB'] ? {
          price: d.quotes['DX-Y.NYB'].price,
          change: d.quotes['DX-Y.NYB'].change,
          changePercent: d.quotes['DX-Y.NYB'].changePercent,
        } : null,
        currencies: d.forexStrength.sort((a, b) => b.score - a.score),
        narrative: groq.forexNarrative,
      },
    }),

    sectors: () => ({
      type: 'sectors',
      title: 'Sector Sentiment',
      label: 'SECTOR ROTATION',
      content: {
        sectors: d.sectorSentiment.sort((a, b) => b.score - a.score),
      },
    }),

    heatmap: () => ({
      type: 'heatmap' as SlideType,
      title: 'S&P 500 Heatmap',
      label: 'MARKET HEATMAP',
      content: {
        stocks: d.heatmapStocks,
        spyChange: d.quotes['SPY']?.changePercent ?? null,
        spyPrice: d.quotes['SPY']?.price ?? null,
      },
    }),

    headlines: () => ({
      type: 'headlines' as SlideType,
      title: 'Top Stories',
      label: 'TOP STORIES',
      content: {
        articles: d.newsArticles,
      },
    }),

    signals: () => ({
      type: 'signals' as SlideType,
      title: edition === 'morning' ? 'Overnight Signals' : "Today's Signals",
      label: 'WHAT MOVED',
      content: {
        signals: d.signals.slice(0, 4),
        newsHeat: d.newsHeat.slice(0, 3),
      },
    }),

    radar: () => ({
      type: 'radar',
      title: 'Market Radar',
      label: 'SIGNAL ANALYSIS',
      content: {
        verdict: d.radarVerdict?.verdict ?? 'MIXED',
        signals: (d.radarVerdict?.signals ?? []).slice(0, 6),
      },
    }),

    outlook: () => {
      const lookAhead = edition === 'morning' ? 'today' : edition === 'close' ? 'tomorrow' : 'this week'
      return {
        type: 'outlook',
        title: weekly
          ? (edition === 'weekend' ? 'Week Ahead' : 'Next Week Preview')
          : (edition === 'morning' ? 'Watch Today' : 'Watch Tomorrow'),
        label: `WHAT TO WATCH ${lookAhead === 'this week' ? 'THIS WEEK' : lookAhead.toUpperCase()}`,
        content: {
          watchItems: groq.watchItems,
          econEvents: d.econEvents.slice(0, 4).map((e: { event?: string; name?: string; title?: string }) =>
            e.event ?? e.name ?? e.title ?? ''
          ).filter(Boolean),
          earnings: d.earnings.slice(0, 6).map((e: { symbol?: string; ticker?: string }) =>
            e.symbol ?? e.ticker ?? ''
          ).filter(Boolean),
          predictions: d.predictions.slice(0, 5).map((p: { question?: string; title?: string; probability?: number; yesPrice?: number }) => {
            const prob = p.probability ?? p.yesPrice ?? 0
            return { title: p.question ?? p.title ?? '', probability: prob > 1 ? prob : Math.round(prob * 100) }
          }).filter((p: { title: string }) => p.title),
        },
      }
    },

    pulse: () => {
      const metrics = [
        { key: 'SPY',     label: 'EQUITIES',    sym: 'SPY' },
        { key: 'BTC',     label: 'CRYPTO',       sym: 'BTC-USD' },
        { key: 'GOLD',    label: 'GOLD',         sym: 'GC=F' },
        { key: 'OIL',     label: 'BRENT CRUDE',  sym: 'BZ=F' },
        { key: 'DOLLAR',  label: 'US DOLLAR',    sym: 'DX-Y.NYB' },
      ].map(m => {
        const q = d.quotes[m.sym]
        return { key: m.key, label: m.label, price: q?.price ?? 0, changePercent: q?.changePercent ?? 0 }
      })
      // Derive bias from risk assets only (equities + crypto), not safe havens
      const spyPct = d.quotes['SPY']?.changePercent ?? 0
      const btcPct = d.quotes['BTC-USD']?.changePercent ?? 0
      const riskAvg = (spyPct + btcPct) / 2
      const bias = riskAvg > 1 ? 'RISK-ON' : riskAvg > 0.2 ? 'LEAN BULLISH' : riskAvg > -0.2 ? 'MIXED' : riskAvg > -1 ? 'LEAN BEARISH' : 'RISK-OFF'
      return {
        type: 'pulse',
        title: 'Market Vitals',
        label: 'PULSE CHECK',
        content: {
          metrics,
          bias,
          fearGreed: d.fearGreed ? { score: d.fearGreed.score, rating: d.fearGreed.rating } : null,
          cryptoFearGreed: d.cryptoFearGreed ? { score: d.cryptoFearGreed.score, label: d.cryptoFearGreed.label } : null,
          riskLevel: d.riskLevel ? { score: d.riskLevel.score, level: d.riskLevel.label } : null,
          sentimentVerdict: groq.sentimentVerdict,
        },
      }
    },

    cta: () => {
      const followCtas: Record<Edition, string> = {
        morning: 'Follow for the closing brief tonight',
        close: "Follow for tomorrow's morning brief",
        weekend: 'Follow for daily market briefs all week',
        weekly: "Follow for Monday's weekend brief",
      }
      return {
        type: 'cta',
        title: 'MarketLens',
        label: 'FOLLOW FOR MORE',
        content: {
          edition,
          tagline: 'Real-time prices. AI analysis. Geopolitical intelligence.',
          followCta: followCtas[edition],
        },
      }
    },
  }

  return groq.slideOrder.map(type => {
    const builder = builders[type]
    return builder ? builder() : builders.cover()
  })
}
