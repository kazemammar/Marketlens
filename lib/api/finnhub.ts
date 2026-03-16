import { cachedFetch, cacheKey, redis } from '@/lib/cache/redis'
import { TTL, FINNHUB_BASE_URL } from '@/lib/utils/constants'

// ─── Global rate-limit state ──────────────────────────────────────────────
// Redis key set for TTL.RATE_LIMIT_BACKOFF seconds when Finnhub returns 429.
// All callers check this before hitting Finnhub — stops the death-spiral.
const RATE_LIMIT_KEY = 'finnhub:rl'

async function isRateLimited(): Promise<boolean> {
  try {
    return (await redis.get<number>(RATE_LIMIT_KEY)) !== null
  } catch {
    return false
  }
}

async function markRateLimited(): Promise<void> {
  redis.set(RATE_LIMIT_KEY, 1, { ex: TTL.RATE_LIMIT_BACKOFF }).catch(() => {})
}
import {
  Asset,
  AssetType,
  NewsArticle,
  AnalystRecommendation,
  PriceTarget,
  FinancialMetrics,
  EarningsData,
} from '@/lib/utils/types'

// ─── Internal helpers ─────────────────────────────────────────────────────

async function finnhubGet<T>(path: string): Promise<T> {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) throw new Error('FINNHUB_API_KEY is not set')

  const url = `${FINNHUB_BASE_URL}${path}${path.includes('?') ? '&' : '?'}token=${apiKey}`
  const res = await fetch(url, { next: { revalidate: 0 } })

  if (!res.ok) {
    throw new Error(`Finnhub ${path} → HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

// Quote-specific fetch: returns null on any error so the caller can skip gracefully.
// Checks the global rate-limit backoff flag before every call, and sets it on 429.
async function finnhubGetQuote(sym: string): Promise<FinnhubQuote | null> {
  try {
    // Honour the 30-second backoff window after a 429
    if (await isRateLimited()) {
      console.warn(`[finnhub] rate-limit backoff active — skipping ${sym}`)
      return null
    }

    const apiKey = process.env.FINNHUB_API_KEY
    if (!apiKey) throw new Error('FINNHUB_API_KEY is not set')

    const path = `/quote?symbol=${encodeURIComponent(sym)}`
    const url  = `${FINNHUB_BASE_URL}${path}&token=${apiKey}`
    const res  = await fetch(url, { next: { revalidate: 0 } })

    if (res.status === 429) {
      console.warn(`[finnhub] 429 received — setting ${TTL.RATE_LIMIT_BACKOFF}s backoff`)
      await markRateLimited()
      return null
    }
    if (!res.ok) {
      console.warn(`[finnhub] ${sym} → HTTP ${res.status} — skipping`)
      return null
    }
    return res.json() as Promise<FinnhubQuote>
  } catch (err) {
    console.warn(`[finnhub] quote failed for ${sym}:`, (err as Error).message)
    return null
  }
}

// ─── Raw Finnhub response shapes ─────────────────────────────────────────

interface FinnhubQuote {
  c:  number // current price
  d:  number // change
  dp: number // percent change
  h:  number // high
  l:  number // low
  o:  number // open
  pc: number // previous close
  t:  number // timestamp (unix seconds)
}

interface FinnhubSearchResult {
  count:  number
  result: Array<{
    description:  string
    displaySymbol: string
    symbol:       string
    type:         string
  }>
}

interface FinnhubProfile {
  country:       string
  currency:      string
  exchange:      string
  ipo:           string
  marketCapitalization: number
  name:          string
  phone:         string
  shareOutstanding: number
  ticker:        string
  weburl:        string
  logo:          string
  finnhubIndustry: string
}

interface FinnhubNewsItem {
  category:  string
  datetime:  number
  headline:  string
  id:        number
  image:     string
  related:   string
  source:    string
  summary:   string
  url:       string
}

interface FinnhubRecommendation {
  buy:        number
  hold:       number
  period:     string
  sell:       number
  strongBuy:  number
  strongSell: number
  symbol:     string
}

interface FinnhubPriceTarget {
  lastUpdated:    string
  symbol:         string
  targetHigh:     number
  targetLow:      number
  targetMean:     number
  targetMedian:   number
}

// ─── Public API ───────────────────────────────────────────────────────────

export interface QuoteRaw {
  price:         number
  previousClose: number
  change:        number
  changePercent: number
  high:          number
  low:           number
  open:          number
  timestamp:     number
}

/**
 * Fetch a live quote for a stock, ETF, forex pair, or commodity symbol.
 */
export async function getQuote(symbol: string): Promise<QuoteRaw | null> {
  return cachedFetch(
    cacheKey.quote(symbol),
    TTL.QUOTE,
    async () => {
      const data = await finnhubGetQuote(symbol)
      if (data === null) return null
      return {
        price:         data.c,
        previousClose: data.pc,
        change:        data.d,
        changePercent: data.dp,
        high:          data.h,
        low:           data.l,
        open:          data.o,
        timestamp:     data.t * 1_000,
      } satisfies QuoteRaw
    },
  )
}

/**
 * Search for symbols across stocks, ETFs, forex, and indices.
 */
export async function searchSymbols(query: string, type?: AssetType): Promise<Asset[]> {
  return cachedFetch(
    cacheKey.search(query, type),
    TTL.SEARCH,
    async () => {
      const data = await finnhubGet<FinnhubSearchResult>(
        `/search?q=${encodeURIComponent(query)}`,
      )

      return data.result.slice(0, 20).map((r) => ({
        symbol:   r.displaySymbol,
        name:     r.description,
        type:     mapFinnhubType(r.type),
        exchange: undefined,
        currency: undefined,
      } satisfies Asset))
    },
  )
}

/**
 * Fetch company profile (name, logo, industry, exchange, currency).
 */
export async function getCompanyProfile(symbol: string): Promise<FinnhubProfile | null> {
  return cachedFetch(
    cacheKey.profile(symbol),
    TTL.PROFILE,
    async () => {
      const data = await finnhubGet<FinnhubProfile>(
        `/stock/profile2?symbol=${encodeURIComponent(symbol)}`,
      )
      // Finnhub returns an empty object if the symbol is unknown
      return Object.keys(data).length === 0 ? null : data
    },
  )
}

/**
 * Fetch recent company/symbol news articles.
 * `from` and `to` are YYYY-MM-DD strings.
 */
export async function getCompanyNews(
  symbol: string,
  from: string,
  to: string,
): Promise<NewsArticle[]> {
  return cachedFetch(
    cacheKey.news(symbol),
    TTL.NEWS,
    async () => {
      const data = await finnhubGet<FinnhubNewsItem[]>(
        `/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}`,
      )

      return data.slice(0, 30).map((item): NewsArticle => ({
        id:             String(item.id),
        headline:       item.headline,
        summary:        item.summary,
        source:         item.source,
        url:            item.url,
        imageUrl:       item.image || undefined,
        publishedAt:    item.datetime * 1_000,
        relatedSymbols: item.related ? item.related.split(',').map((s) => s.trim()) : [],
      }))
    },
  )
}

/**
 * Fetch analyst buy/hold/sell recommendations for a stock.
 */
export async function getRecommendations(symbol: string): Promise<AnalystRecommendation[]> {
  return cachedFetch(
    cacheKey.recommendations(symbol),
    TTL.RECOMMENDATIONS,
    async () => {
      const data = await finnhubGet<FinnhubRecommendation[]>(
        `/stock/recommendation?symbol=${encodeURIComponent(symbol)}`,
      )

      return data.slice(0, 6).map((r): AnalystRecommendation => ({
        symbol:    r.symbol,
        period:    r.period,
        strongBuy: r.strongBuy,
        buy:       r.buy,
        hold:      r.hold,
        sell:      r.sell,
        strongSell: r.strongSell,
      }))
    },
  )
}

/**
 * Fetch analyst price targets for a stock.
 */
export async function getPriceTarget(symbol: string): Promise<PriceTarget | null> {
  return cachedFetch(
    `${cacheKey.recommendations(symbol)}:target`,
    TTL.RECOMMENDATIONS,
    async () => {
      const data = await finnhubGet<FinnhubPriceTarget>(
        `/stock/price-target?symbol=${encodeURIComponent(symbol)}`,
      )

      if (!data.symbol) return null

      return {
        symbol:      data.symbol,
        lastUpdated: data.lastUpdated,
        low:         data.targetLow,
        median:      data.targetMedian,
        high:        data.targetHigh,
        mean:        data.targetMean,
        consensus:   '',
      } satisfies PriceTarget
    },
  )
}

/**
 * Fetch quotes for multiple Finnhub symbols efficiently:
 *  1. Phase 1 — parallel Redis check (no Finnhub calls for cache hits)
 *  2. Phase 2 — for each miss, do a final Redis re-check right before calling
 *     Finnhub (catches in-flight fetches from OTHER concurrent route handlers
 *     that started at the same time and may have populated the cache since).
 *  3. Phase 3 — Finnhub call ONLY for confirmed misses, in batches of
 *     `batchSize` with `delayMs` pause between batches (≤50 req/min).
 *
 * Returns a Map of symbol → QuoteRaw for every symbol that succeeded.
 */
export async function getQuotesBatched(
  symbols:   string[],
  batchSize = 4,     // was 5 — reduced to stay well under 60 req/min
  delayMs   = 500,   // was 300 — increased to spread load
): Promise<Map<string, QuoteRaw>> {
  const result = new Map<string, QuoteRaw>()
  if (symbols.length === 0) return result

  // ── Phase 1: parallel Redis check (fast, no Finnhub calls) ──────────────
  const redisResults = await Promise.allSettled(
    symbols.map((sym) =>
      redis.get<QuoteRaw>(cacheKey.quote(sym))
        .then((v) => ({ sym, v }))
        .catch(() => ({ sym, v: null })),
    ),
  )

  const misses: string[] = []
  for (const r of redisResults) {
    if (r.status !== 'fulfilled') continue
    const { sym, v } = r.value
    if (v !== null) {
      console.log(`[cache] HIT  ${cacheKey.quote(sym)}`)
      result.set(sym, v)
    } else {
      console.log(`[cache] MISS ${cacheKey.quote(sym)}`)
      misses.push(sym)
    }
  }

  if (misses.length === 0) return result
  console.log(`[finnhub] ${misses.length} cache miss(es) — fetching in batches of ${batchSize}`)

  // ── Phase 2: batch Finnhub calls for misses only ─────────────────────────
  for (let i = 0; i < misses.length; i += batchSize) {
    const batch = misses.slice(i, i + batchSize)
    console.log(`[finnhub] batch ${Math.floor(i / batchSize) + 1}: ${batch.join(', ')}`)

    const settled = await Promise.allSettled(
      batch.map(async (sym) => {
        // Re-check Redis immediately before the Finnhub call.
        // Another concurrent route handler (market-radar, signals, etc.) may
        // have already fetched and cached this symbol since our Phase 1 check.
        const fresh = await redis.get<QuoteRaw>(cacheKey.quote(sym)).catch(() => null)
        if (fresh !== null) {
          console.log(`[cache] LATE-HIT ${cacheKey.quote(sym)}`)
          return { sym, quote: fresh }
        }

        const data = await finnhubGetQuote(sym)
        if (data === null) return null   // 429 or rate-limit backoff — skip
        const quote: QuoteRaw = {
          price:         data.c,
          previousClose: data.pc,
          change:        data.d,
          changePercent: data.dp,
          high:          data.h,
          low:           data.l,
          open:          data.o,
          timestamp:     data.t * 1_000,
        }
        redis.set(cacheKey.quote(sym), quote, { ex: TTL.QUOTE }).catch(() => {})
        return { sym, quote }
      }),
    )

    for (const r of settled) {
      if (r.status === 'fulfilled' && r.value !== null) {
        result.set(r.value.sym, r.value.quote)
      } else if (r.status === 'rejected') {
        console.error(`[finnhub] quote failed:`, r.reason)
      }
    }

    // Pause between batches (skip after last batch)
    if (i + batchSize < misses.length) {
      await new Promise<void>((res) => setTimeout(res, delayMs))
    }
  }

  return result
}

// ─── Financial metrics & earnings ─────────────────────────────────────────

interface FinnhubMetricResponse {
  metric: {
    peBasicExclExtraTTM:  number | null
    pbAnnual:             number | null
    psAnnual:             number | null
    roeTTM:               number | null
    roaRfy:               number | null
    netProfitMarginTTM:   number | null
    totalDebt_totalEquityAnnual: number | null
    currentRatioAnnual:   number | null
    '52WeekHigh':         number | null
    '52WeekLow':          number | null
    dividendYieldIndicatedAnnual: number | null
    marketCapitalization: number | null
  }
}

interface FinnhubEarningsItem {
  actual:          number | null
  estimate:        number | null
  period:          string
  quarter:         number
  surprise:        number | null
  surprisePercent: number | null
  symbol:          string
  year:            number
}

/**
 * Fetch key financial metrics from Finnhub /stock/metric (free tier).
 */
export async function getFinancialMetrics(symbol: string): Promise<FinancialMetrics> {
  return cachedFetch(
    `metrics:${symbol.toUpperCase()}`,
    TTL.RATIOS,
    async () => {
      const data = await finnhubGet<FinnhubMetricResponse>(
        `/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all`,
      )
      const m = data.metric ?? {}
      return {
        peRatio:         m.peBasicExclExtraTTM  ?? null,
        pbRatio:         m.pbAnnual             ?? null,
        psRatio:         m.psAnnual             ?? null,
        roe:             m.roeTTM               ?? null,
        roa:             m.roaRfy               ?? null,
        netProfitMargin: m.netProfitMarginTTM   ?? null,
        debtToEquity:    m.totalDebt_totalEquityAnnual ?? null,
        currentRatio:    m.currentRatioAnnual   ?? null,
        week52High:      m['52WeekHigh']         ?? null,
        week52Low:       m['52WeekLow']          ?? null,
        dividendYield:   m.dividendYieldIndicatedAnnual ?? null,
        marketCap:       m.marketCapitalization  ?? null,
      } satisfies FinancialMetrics
    },
  )
}

/**
 * Fetch last 4 quarters of earnings surprises from Finnhub /stock/earnings.
 */
export async function getEarnings(symbol: string): Promise<EarningsData[]> {
  return cachedFetch(
    `earnings:${symbol.toUpperCase()}`,
    TTL.FINANCIALS,
    async () => {
      const data = await finnhubGet<FinnhubEarningsItem[]>(
        `/stock/earnings?symbol=${encodeURIComponent(symbol)}&limit=4`,
      )
      return data.map((e): EarningsData => ({
        period:          e.period,
        quarter:         e.quarter,
        year:            e.year,
        actual:          e.actual          ?? 0,
        estimate:        e.estimate        ?? 0,
        surprise:        e.surprise        ?? 0,
        surprisePercent: e.surprisePercent ?? 0,
      }))
    },
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function mapFinnhubType(finnhubType: string): AssetType {
  switch (finnhubType.toUpperCase()) {
    case 'ETP':
    case 'ETF': return 'etf'
    case 'FOREX': return 'forex'
    default: return 'stock'
  }
}
