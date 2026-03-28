// GET /api/social/daily-brief?edition=morning|close|weekend|weekly
// Pulls from 18 dashboard endpoints + archived articles from Redis,
// Groq writes narrative + picks best slides.
//
// Articles are accumulated hourly by the cron/warm job into a Redis
// sorted set (news:archive). Each edition pulls from a specific time
// window so important stories are never lost to RSS rotation.
//
// Editions & time windows (all UTC):
//   morning  — weekday pre-market: yesterday 17:00 → today 14:00
//   close    — weekday post-market: today 07:00 → today 22:00
//   weekend  — Fri night → Mon open: Friday 21:00 → Monday 14:00
//   weekly   — full trading week: Monday 07:00 → Friday 22:00

import { NextRequest, NextResponse } from 'next/server'
import { groqChat } from '@/lib/api/groq'
import { cachedFetch, redis } from '@/lib/cache/redis'

export const dynamic = 'force-dynamic'

// ─── Types ──────────────────────────────────────────────────────────────────

type Edition = 'morning' | 'close' | 'weekend' | 'weekly'

type SlideType =
  | 'cover' | 'scoreboard' | 'sentiment' | 'narrative' | 'movers'
  | 'energy' | 'crypto' | 'forex' | 'sectors' | 'radar'
  | 'outlook' | 'pulse' | 'cta' | 'heatmap' | 'headlines'

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
      // Yesterday 17:00 UTC → today 14:00 UTC
      const from = Date.UTC(y, m, d - 1, 17, 0)
      const to   = Date.UTC(y, m, d, 14, 0)
      return { from, to }
    }
    case 'close': {
      // Today 07:00 UTC → today 22:00 UTC
      const from = Date.UTC(y, m, d, 7, 0)
      const to   = Date.UTC(y, m, d, 22, 0)
      return { from, to }
    }
    case 'weekend': {
      // Friday 21:00 UTC (after US close) → Monday 14:00 UTC (market open)
      // Always anchored to the actual Fri→Mon window, not "today"
      const friday = new Date(Date.UTC(y, m, d))
      friday.setUTCDate(d - ((dayOfWeek + 2) % 7))
      const monday = new Date(friday)
      monday.setUTCDate(friday.getUTCDate() + 3)
      const from = Date.UTC(friday.getUTCFullYear(), friday.getUTCMonth(), friday.getUTCDate(), 21, 0)
      const to   = Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 14, 0)
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
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketLens/1.0)' },
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

// ─── GET handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const editionParam = req.nextUrl.searchParams.get('edition') as Edition | null
  const edition: Edition = editionParam && VALID_EDITIONS.includes(editionParam)
    ? editionParam : detectEdition()
  const date = todayStr()
  const cacheKey = `social:daily-brief:${edition}:${date}`

  try {
    const payload = await cachedFetch<DailyBriefPayload>(
      cacheKey,
      editionCacheTtl(edition),
      () => generateBrief(edition, date),
    )
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
  'SPY', 'QQQ', 'DIA', 'IWM', 'GC=F', 'BZ=F', 'SI=F', 'NG=F',
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'DX-Y.NYB',
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

  // 2. For weekly/weekend editions, replace daily % with weekly cumulative %
  if (isWeeklyEdition(edition)) {
    const weeklyChanges = await fetchWeeklyChanges()
    const quotes = data.quotes ?? {}
    for (const [sym, { pct, price }] of Object.entries(weeklyChanges)) {
      if (quotes[sym] && quotes[sym].price > 0) {
        // Update existing quote with weekly %
        const prevPrice = quotes[sym].price / (1 + pct / 100)
        quotes[sym].changePercent = pct
        quotes[sym].change = quotes[sym].price - prevPrice
      } else {
        // Create quote from Yahoo weekly data (BTC-USD, DX-Y.NYB may be missing)
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
  }

  // Merge archived articles with live RSS — archive is primary, live fills gaps
  if (archivedArticles.length > 0) {
    const liveArticles = Array.isArray(data.news)
      ? data.news
      : (data.news?.articles ?? data.news?.data ?? [])
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
      // Move hero story: prefer an article WITH an image for the hero (first position)
      const withImg = picked.filter((a: { imageUrl: string | null }) => a.imageUrl)
      const noImg = picked.filter((a: { imageUrl: string | null }) => !a.imageUrl)
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

  // For weekly/weekend editions: sample evenly across days so the full
  // time window is represented, not just the earliest articles.
  // For daily editions: sort by source quality (wire services first).
  const weekly = isWeeklyEdition(edition)
  const headlineLimit = weekly ? 25 : 15   // more headlines for week-long editions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let articles: any[]
  if (weekly && filtered.length > headlineLimit) {
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

// ─── Groq call ──────────────────────────────────────────────────────────────

const EDITION_PROMPTS: Record<Edition, string> = {
  morning: `This is the MORNING PRE-MARKET brief.
Focus on: what happened overnight (Asia/Europe sessions), pre-market futures,
what to watch TODAY (earnings reports, economic data releases, Fed speakers,
geopolitical developments). Set the tone for the trading day ahead.
Frame everything as forward-looking: "Here's what you need to know before the bell."`,

  close: `This is the EVENING POST-MARKET brief.
Focus on: how today actually played out vs expectations, the dominant story that
moved markets, sector rotation patterns, which sectors led/lagged, why winners won
and losers lost. Frame everything as "Here's what happened and what it means."
Include a setup for tomorrow.`,

  weekend: `This is the WEEKEND BRIEF posted Monday morning.
Provide a FULL RECAP of the previous trading week: how each major index performed
over the entire week, the week's biggest stories and turning points, which sectors
rotated in/out, the week's top movers. Then preview what to watch THIS WEEK:
key economic data, earnings season, Fed activity, geopolitical risks.
Think of this as a comprehensive weekly intelligence report.`,

  weekly: `This is the WEEKLY WRAP posted Friday evening.
Provide a comprehensive WEEK IN REVIEW: how the week started vs how it ended,
the narrative arc of the week (what changed from Monday to Friday), cumulative
weekly performance for major indices, the week's defining moments and surprises.
Then give a forward look at next week's catalysts and risks.
Think of this as closing the chapter on this week.`,
}

async function callGroq(edition: Edition, d: ExtractedData): Promise<GroqBriefResponse> {
  const weekly = isWeeklyEdition(edition)
  const middleSlideCount = weekly ? 6 : 5

  const quoteLines = ['SPY', 'QQQ', 'DIA', 'IWM', 'GC=F', 'BZ=F', 'SI=F', 'NG=F', 'BTC-USD', 'ETH-USD', 'SOL-USD', 'DX-Y.NYB']
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
  // For weekly: include source + date so Groq can assess day-by-day importance
  const headlineBlock = d.newsArticlesAll.slice(0, weekly ? 25 : 15).map((a, i) => {
    const dateStr = a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('en-US', { weekday: 'short' }) : ''
    return weekly && dateStr
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

  const weekRecapField = weekly
    ? `"weekRecap": "<exactly 4 bullet points separated by \\n, each starts with a bold label then colon then details. Example: 'MONDAY: S&P opened flat then sold off 1.5% on tariff fears\\nWEDNESDAY: Oil spiked $8 after Saudi supply cut\\nTHURSDAY: Tech earnings missed, NVDA down 4%\\nFRIDAY: Fear index hit 10, worst since 2022'. Use specific data from above.>",`
    : ''

  const systemPrompt = `You are a senior financial content strategist creating a market brief for Instagram carousel slides.

${EDITION_PROMPTS[edition]}

LIVE MARKET DATA${weekly ? ' (% changes are WEEKLY cumulative, not daily)' : ''}:

PRICES:
${quoteLines}

TOP GAINERS: ${gainerLines || 'N/A'}
TOP LOSERS: ${loserLines || 'N/A'}

CNN FEAR & GREED: ${d.fearGreed ? `${d.fearGreed.score} (${d.fearGreed.rating})` : 'N/A'}
CRYPTO FEAR & GREED: ${d.cryptoFearGreed ? `${d.cryptoFearGreed.score} (${d.cryptoFearGreed.label})` : 'N/A'}
RISK LEVEL: ${d.riskLevel ? `${d.riskLevel.score} (${d.riskLevel.label})` : 'N/A'}
RADAR VERDICT: ${d.radarVerdict ? d.radarVerdict.verdict : 'N/A'}

CHOKEPOINTS:
${chokepointLines}

FOREX STRENGTH: ${fxLines || 'N/A'}
SECTOR SENTIMENT: ${sectorLines || 'N/A'}
MARKET PULSE: ${d.pulseText || 'N/A'}

HEADLINES:
${headlineBlock || 'N/A'}

UPCOMING EARNINGS: ${earningsList || 'None today'}

POLYMARKET:
${predictionLines || 'N/A'}

Respond with valid JSON only — no markdown fences:
{
  "briefTitle": "<powerful headline, max 10 words, attention-grabbing and specific>",
  "briefSubtitle": "<max 65 chars, use · separator, e.g. 'S&P -3.2% · Oil $99 · Gold $4524 · Fear: 10' — use human names not ticker symbols, use actual numbers from data>",
  "whyMoved": "<exactly 4 bullet points separated by \\n, each starts with a bold label then a colon then details. Example: 'OIL SHOCK: Saudi output cut sent crude to $99, highest in 6 weeks\\nTECH ROUT: NVDA, META, AMZN all dropped 3%+ on earnings fears\\nGOLD RUSH: Safe-haven buying pushed gold above $4500\\nYIELD SPIKE: 10Y treasury hit 4.8%, highest since October'. Use specific numbers.>",
  ${weekRecapField}
  "energyNarrative": "<1 sentence on oil/commodities, max 20 words>",
  "cryptoNarrative": "<1 sentence on crypto, max 20 words>",
  "forexNarrative": "<1 sentence on USD/FX, max 20 words>",
  "sentimentVerdict": "<1 punchy sentence on what fear/greed means, max 15 words>",
  "watchItems": ["<item 1: max 12 words>", "<item 2: max 12 words>", "<item 3: max 12 words — the 3 most actionable catalysts, each its own array element>"],
  "topHeadlineIndices": "<array of exactly 6 numbers — 1-based indices from the HEADLINES list, ranked by macro importance>",
  "slideOrder": ["cover", "<${middleSlideCount} best middle slides>", "cta"]
}

HEADLINE CURATION (topHeadlineIndices):
- You MUST analyze each headline and select the 6 most relevant to macro markets, geopolitics, or finance
- Return exactly 6 1-based indices from the HEADLINES list above, ordered by importance (most important first)
- The first index = hero story shown largest — pick the single most market-moving headline
- STRONGLY PREFER: oil/energy supply shocks, central bank decisions, GDP/inflation data, trade wars, sanctions, military conflicts, commodity price moves, major index selloffs, gold/currency moves, major earnings surprises
- ACCEPTABLE: sector-level analysis, analyst calls on mega-cap stocks, government policy changes, defense contracts
- ALWAYS SKIP: personal finance advice ("should I buy/ditch/keep..."), insurance questions, retirement planning, "I'm X years old and..." stories, hospital accidents, human interest, lifestyle, celebrity, sports, individual small-cap analysis, ETF comparisons, generic "what analysts say" articles, app/gadget reviews, product roundups, "best of" lists, Holocaust/history stories, medical stories, tech tips, weather personal stories, clickbait
- If fewer than 6 headlines pass the filter, return only the ones that do — never pad with irrelevant stories
- DO NOT copy the example — actually read each headline and judge its macro relevance

SLIDE SELECTION RULES:
- ALWAYS start with "cover" and end with "cta"
- Pick exactly ${middleSlideCount} middle slides from: heatmap, headlines, sentiment, narrative, movers, energy, crypto, forex, sectors, radar, outlook, pulse
- DO NOT include "scoreboard" — the cover already shows key price levels
- ALWAYS include "heatmap" and "headlines" as the first two middle slides — they are the visual anchors
- ${weekly ? 'For weekly briefs, ALWAYS include scoreboard and narrative. Pick remaining from the rest.' : 'Pick the slides with the most interesting/dramatic data TODAY — skip boring ones.'}
- Be opinionated. If crypto barely moved, skip it. If oil spiked 5%, include energy.
- "heatmap" = S&P 500 treemap heatmap (always include)
- "headlines" = top news stories with images (always include)
- "narrative" = the why-things-moved story slide
- "outlook" = what to watch next (forward-looking)
- "scoreboard" = the 6-index price grid
- "pulse" = AI analysis text + headlines

WRITING RULES:
- briefTitle: make it scroll-stopping, specific to today (not "Market Recap")
- whyMoved: tell a STORY with cause and effect, name specific events
- Be direct, opinionated, and use trader language`

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
    max_tokens:      weekly ? 1600 : 1200,
    response_format: { type: 'json_object' },
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'
  let parsed: Partial<GroqBriefResponse>
  try { parsed = JSON.parse(raw) } catch { parsed = {} }

  // Validate + enforce slide order rules
  let slideOrder = Array.isArray(parsed.slideOrder) ? parsed.slideOrder : []
  slideOrder = slideOrder.filter((s: string) => s !== 'cover' && s !== 'cta' && s !== 'scoreboard')
  // Ensure key slides are always included
  const must: SlideType[] = []
  if (d.heatmapStocks.length > 0) must.push('heatmap' as SlideType)
  if (d.newsArticles.length > 0) must.push('headlines' as SlideType)
  // Pulse (Market Vitals dashboard) — always include as a premium summary card
  must.push('pulse' as SlideType)
  // For weekly editions, always include narrative, sentiment, and outlook
  if (weekly) {
    must.push('narrative' as SlideType, 'sentiment' as SlideType, 'outlook' as SlideType)
  }
  slideOrder = slideOrder.filter((s: string) => !must.map(String).includes(s))
  slideOrder = [...must, ...slideOrder].slice(0, middleSlideCount) as SlideType[]
  slideOrder = ['cover' as SlideType, ...slideOrder, 'cta' as SlideType]

  return {
    briefTitle:       parsed.briefTitle       ?? 'Market Brief',
    briefSubtitle:    parsed.briefSubtitle    ?? '',
    whyMoved:         parsed.whyMoved         ?? '',
    weekRecap:        parsed.weekRecap        ?? '',
    energyNarrative:  parsed.energyNarrative  ?? '',
    cryptoNarrative:  parsed.cryptoNarrative  ?? '',
    forexNarrative:   parsed.forexNarrative   ?? '',
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
      const heroSyms = edition === 'morning'
        ? ['SPY', 'QQQ', 'BTC-USD']           // pre-market focus
        : edition === 'close'
        ? ['SPY', 'QQQ', 'DIA', 'IWM']        // full index scorecard
        : ['SPY', 'QQQ', 'BTC-USD', 'GC=F']   // weekly overview
      const heroQuotes = heroSyms.map(sym => ({
        symbol: sym, name: SYMBOL_LABELS[sym] ?? sym,
        price: d.quotes[sym]?.price ?? 0,
        changePercent: d.quotes[sym]?.changePercent ?? 0,
      }))
      return {
        type: 'cover' as SlideType,
        title: groq.briefTitle,
        label: EDITION_LABELS[edition],
        content: {
          subtitle: groq.briefSubtitle,
          edition,
          heroQuotes,
          topGainer: d.gainers[0] ?? null,
          topLoser: d.losers[0] ?? null,
          fearGreedScore: d.fearGreed?.score ?? null,
          radarVerdict: d.radarVerdict?.verdict ?? null,
          riskScore: d.riskLevel?.score ?? null,
          topHeadline: d.newsArticles[0]?.headline ?? d.headlines[0] ?? null,
          isWeekly: weekly,
          dateRange: weekly ? getWeekDateRange() : null,
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
      title: weekly
        ? (edition === 'weekend' ? 'Last Week in Review' : 'The Week That Was')
        : (edition === 'morning' ? 'Overnight Story' : 'Why Markets Moved'),
      label: weekly ? 'WEEK NARRATIVE' : 'MARKET NARRATIVE',
      content: {
        narrative: weekly && groq.weekRecap ? groq.weekRecap : groq.whyMoved,
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
