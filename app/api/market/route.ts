// GET /api/market?tab=stock|crypto|forex|commodity|etf
// Returns AssetCardData[] for the requested tab.
// Called lazily by MarketTabs when the user first clicks a tab.
//
// Caching strategy (Finnhub tabs only: stock, etf, commodity):
//   • Route-level Redis key stores the full assembled AssetCardData[] with a timestamp.
//   • Every request checks this key FIRST.
//     – If fresh  (< 15 min old) → return immediately, zero Finnhub calls.
//     – If stale  (≥ 15 min old) → return stale data immediately AND kick off a
//       background refresh (Redis lock prevents concurrent refreshes).
//     – If absent                → blocking fetch with slow batching (2/1 500 ms)
//       so a cold-start never fires more than ~8 Finnhub calls per minute.
//   • If Finnhub returns 429 the route returns whatever stale data exists
//     (or an empty array), never an error that crashes the UI.

import { NextRequest } from 'next/server'
import { getQuotesBatched }                      from '@/lib/api/finnhub'
import { getYahooQuotesBatch, getYahooSparkline } from '@/lib/api/yahoo'
import { getCryptoMarkets }                      from '@/lib/api/coingecko'
import { getForexCards }       from '@/lib/api/forex'
import { redis }               from '@/lib/cache/redis'
import {
  DEFAULT_STOCKS,
  DEFAULT_ETFS,
  DEFAULT_COMMODITIES,
} from '@/lib/utils/constants'
import { AssetCardData, AssetType } from '@/lib/utils/types'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'


const EDGE_HEADERS = cacheHeaders(60)
// ─── Name maps ────────────────────────────────────────────────────────────

const STOCK_NAMES: Record<string, string> = {
  // Technology
  AAPL: 'Apple Inc.', MSFT: 'Microsoft Corp.', NVDA: 'NVIDIA Corp.',
  // Finance
  JPM: 'JPMorgan Chase', V: 'Visa Inc.', MA: 'Mastercard',
  // Healthcare
  UNH: 'UnitedHealth', LLY: 'Eli Lilly', JNJ: 'Johnson & Johnson',
  // Consumer Disc.
  AMZN: 'Amazon.com', TSLA: 'Tesla Inc.', HD: 'Home Depot',
  // Consumer Staples
  PG: 'Procter & Gamble', KO: 'Coca-Cola', PEP: 'PepsiCo',
  // Industrial
  CAT: 'Caterpillar', GE: 'GE Aerospace', HON: 'Honeywell',
  // Communication
  GOOGL: 'Alphabet Inc.', META: 'Meta Platforms', NFLX: 'Netflix',
  // Energy
  XOM: 'Exxon Mobil', CVX: 'Chevron', COP: 'ConocoPhillips',
  // Real Estate
  AMT: 'American Tower', PLD: 'Prologis', EQIX: 'Equinix',
  // Materials
  LIN: 'Linde', APD: 'Air Products', SHW: 'Sherwin-Williams',
  // Utilities
  NEE: 'NextEra Energy', DUK: 'Duke Energy', SO: 'Southern Company',
}

const ETF_NAMES: Record<string, string> = {
  SPY: 'SPDR S&P 500',       QQQ:  'Invesco Nasdaq 100',
  DIA: 'SPDR Dow Jones',     IWM:  'iShares Russell 2000',
  VTI: 'Vanguard Total Mkt', GLD:  'SPDR Gold Shares',
  SLV: 'iShares Silver',     TLT:  'iShares 20Y+ Treasury',
  VNQ: 'Vanguard Real Est.', ARKK: 'ARK Innovation',
}

// ─── Route-level cache config ─────────────────────────────────────────────

// Keys for the full pre-assembled tab result (includes fetchedAt timestamp)
const TAB_CACHE_KEY  = (tab: string) => `market:v4:${tab}`
const TAB_LOCK_KEY   = (tab: string) => `market:lock:${tab}`
const TAB_CACHE_TTL  = 1_800           // keep stale data for 30 min
const REFRESH_AFTER  = 900_000         // refresh in background if > 15 min old

interface CachedTab {
  data:      AssetCardData[]
  fetchedAt: number
}

// ─── Data builders ────────────────────────────────────────────────────────

// Slow batching: 2 symbols per batch, 1 500 ms between batches.
// For 15 stock symbols → 8 batches → 7 pauses → ~10 500 ms total.
// Keeps Finnhub calls well under 60/min even on concurrent cold starts.
async function quotesToCards(
  symbols:  string[],
  getName:  (s: string) => string,
  type:     AssetType,
  currency = 'USD',
): Promise<AssetCardData[]> {
  const map = await getQuotesBatched(symbols, 2, 1_500)
  const cards: AssetCardData[] = []

  for (const [sym, q] of map) {
    const price = q.price > 0 ? q.price : q.previousClose
    if (price <= 0) continue
    cards.push({
      symbol:        sym,
      name:          getName(sym),
      type,
      price,
      change:        q.price > 0 ? q.change        : 0,
      changePercent: q.price > 0 ? q.changePercent : 0,
      currency,
      open:  q.open  > 0 ? q.open  : price,
      high:  q.high  > 0 ? q.high  : price,
      low:   q.low   > 0 ? q.low   : price,
    })
  }

  // Preserve the original symbol order
  return symbols
    .map((s) => cards.find((c) => c.symbol === s))
    .filter((c): c is AssetCardData => c !== undefined)
}

async function buildTabData(tab: AssetType): Promise<AssetCardData[]> {
  switch (tab) {
    case 'stock':
      return quotesToCards(DEFAULT_STOCKS, (s) => STOCK_NAMES[s] ?? s, 'stock')

    case 'crypto':
      return getCryptoMarkets(1, 'usd', 20).then((coins) =>
        coins.map((c): AssetCardData => ({
          symbol:        c.symbol.toUpperCase(),
          name:          c.name,
          type:          'crypto',
          price:         c.currentPrice,
          change:        c.priceChange24h,
          changePercent: c.priceChangePercent24h,
          currency:      'USD',
          open:          c.currentPrice - c.priceChange24h,
          high:          c.high24h,
          low:           c.low24h,
        })),
      )

    case 'forex':
      return getForexCards()

    case 'commodity': {
      const symbols = DEFAULT_COMMODITIES.map((c) => c.symbol)
      const [quotes, ...sparklines] = await Promise.all([
        getYahooQuotesBatch(symbols),
        ...symbols.map((s) => getYahooSparkline(s)),
      ])
      return DEFAULT_COMMODITIES
        .map((c, i): AssetCardData => {
          const q     = quotes.find((qq) => qq.symbol === c.symbol)
          const price = q?.price ?? 0
          return {
            symbol:        c.symbol,
            name:          c.name,
            type:          'commodity',
            price,
            change:        q?.change        ?? 0,
            changePercent: q?.changePercent ?? 0,
            currency:      'USD',
            open:          price,
            high:          price,
            low:           price,
            sparkline:     sparklines[i] ?? [],
          }
        })
        .filter((a) => a.price > 0)
    }

    case 'etf':
      return quotesToCards(DEFAULT_ETFS, (s) => ETF_NAMES[s] ?? s, 'etf')

    default:
      return []
  }
}

// ─── Background cache refresh ─────────────────────────────────────────────

// Uses a Redis NX lock to ensure only one refresh runs at a time per tab.
async function refreshCache(tab: AssetType): Promise<void> {
  const lock = await redis.set(TAB_LOCK_KEY(tab), 1, { ex: 120, nx: true }).catch(() => null)
  if (!lock) return  // another invocation is already refreshing this tab

  try {
    const data = await buildTabData(tab)
    if (data.length > 0) {
      await redis.set(TAB_CACHE_KEY(tab), { data, fetchedAt: Date.now() } satisfies CachedTab, { ex: TAB_CACHE_TTL })
      console.log(`[/api/market] background refresh complete: tab=${tab} symbols=${data.length}`)
    }
  } catch (err) {
    console.warn(`[/api/market] background refresh failed: tab=${tab}`, err)
  } finally {
    redis.del(TAB_LOCK_KEY(tab)).catch(() => {})
  }
}

// ─── Route ────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const limited = withRateLimit(req, 60)
  if (limited) return limited

  const tab = req.nextUrl.searchParams.get('tab') as AssetType | null

  if (!tab) {
    return Response.json({ error: 'Missing tab param' }, { status: 400 })
  }

  const validTabs: AssetType[] = ['stock', 'crypto', 'forex', 'commodity', 'etf']
  if (!validTabs.includes(tab)) {
    return Response.json({ error: `Unknown tab: "${tab}"` }, { status: 400 })
  }

  // ── Step 1: Check route-level cache ──────────────────────────────────────
  try {
    const cached = await redis.get<CachedTab>(TAB_CACHE_KEY(tab))

    if (cached && cached.data.length > 0) {
      const ageMs = Date.now() - cached.fetchedAt
      console.log(`[/api/market] cache ${ageMs < REFRESH_AFTER ? 'FRESH' : 'STALE'} tab=${tab} age=${Math.round(ageMs / 1000)}s`)

      if (ageMs >= REFRESH_AFTER) {
        // Step 2a: Return stale data immediately, refresh in background.
        // Fire-and-forget — the function may or may not complete the refresh
        // before Vercel terminates it, but the lock prevents pile-ups and the
        // next request will retry if this one dies early.
        refreshCache(tab).catch(() => {})
      }

      return Response.json(cached.data, {
        headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=840' },
      })
    }
  } catch (err) {
    console.warn(`[/api/market] Redis read failed for tab=${tab}:`, err)
    // Fall through to live fetch
  }

  // ── Step 3: No cache — blocking slow fetch ────────────────────────────────
  console.log(`[/api/market] cold fetch tab=${tab}`)
  try {
    const data = await buildTabData(tab)

    if (data.length > 0) {
      redis.set(TAB_CACHE_KEY(tab), { data, fetchedAt: Date.now() } satisfies CachedTab, { ex: TAB_CACHE_TTL }).catch(() => {})
    }

    console.log(`[/api/market] tab=${tab} → ${data.length} assets`)
    return Response.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=840' },
    })
  } catch (err) {
    console.error(`[/api/market] cold fetch failed tab=${tab}:`, err)
    // Step 4: 429 or other error — return empty gracefully (never 500 the UI)
    return Response.json([], {
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}
