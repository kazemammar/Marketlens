/**
 * lib/api/homepage.ts
 * ───────────────────
 * Single source of truth for all data the homepage needs.
 *
 * getHomepageData():
 *  1. Checks "homepage:init" Redis key — instant on warm cache (600 s TTL).
 *  2. On miss: fetches ALL ~29 Finnhub symbols in one coordinated batch
 *     (3 per batch, 1 000 ms between batches → max ~10 calls/minute).
 *  3. Also fetches BTC/ETH/SOL via CoinGecko (no Finnhub, no rate limit).
 *  4. Assembles stocks, commodityStrip, tickerQuotes, marketRadar and
 *     stores the full result under "homepage:init" for 600 seconds.
 *
 * All shared types (CommodityStripItem, MarketRadarPayload …) live here so
 * route files and components both import from one place with no circular deps.
 */

import { redis }                     from '@/lib/cache/redis'
import { getQuotesBatched, QuoteRaw } from './finnhub'
import { getCryptoByIds }            from './coingecko'
import { DEFAULT_STOCKS }            from '@/lib/utils/constants'
import { AssetCardData }             from '@/lib/utils/types'

// ─── Shared types ─────────────────────────────────────────────────────────

export interface CommodityStripItem {
  symbol:        string
  name:          string
  shortName:     string
  price:         number
  change:        number
  changePercent: number
  currency:      string
}

export type SignalVerdict = 'BUY' | 'CASH' | 'MIXED'

export interface RadarSignal {
  name:    string
  verdict: SignalVerdict
  value:   string
  reason:  string
}

export interface MarketRadarPayload {
  verdict:   SignalVerdict
  score:     number         // 0–100 bull score
  signals:   RadarSignal[]
  updatedAt: number
}

export interface HomepageData {
  stocks:         AssetCardData[]
  commodityStrip: CommodityStripItem[]
  tickerQuotes:   Record<string, QuoteRaw>   // SPY DIA QQQ IWM GLD USO + BINANCE:*
  marketRadar:    MarketRadarPayload | null
  cachedAt:       number
}

// ─── Symbol configuration ─────────────────────────────────────────────────

const STRIP_CONFIG = [
  { symbol: 'USO',  name: 'WTI Crude Oil', shortName: 'WTI'     },
  { symbol: 'BNO',  name: 'Brent Crude',   shortName: 'Brent'   },
  { symbol: 'UNG',  name: 'Natural Gas',   shortName: 'Nat Gas' },
  { symbol: 'GLD',  name: 'Gold',          shortName: 'Gold'    },
  { symbol: 'SLV',  name: 'Silver',        shortName: 'Silver'  },
  { symbol: 'CPER', name: 'Copper',        shortName: 'Copper'  },
  { symbol: 'WEAT', name: 'Wheat',         shortName: 'Wheat'   },
  { symbol: 'URA',  name: 'Uranium',       shortName: 'Uranium' },
]

// Finnhub symbols for the ticker tape (non-crypto)
export const TICKER_FINNHUB_SYMBOLS = ['SPY', 'DIA', 'QQQ', 'IWM', 'GLD', 'USO']

// CoinGecko IDs → BINANCE: symbol keys used by TickerTape
const TICKER_CRYPTO: Array<{ id: string; binanceKey: string }> = [
  { id: 'bitcoin',  binanceKey: 'BINANCE:BTCUSDT' },
  { id: 'ethereum', binanceKey: 'BINANCE:ETHUSDT'  },
  { id: 'solana',   binanceKey: 'BINANCE:SOLUSDT'  },
]

const RADAR_SYMBOLS = ['SPY', 'QQQ', 'GLD', 'USO', 'VXX', 'TLT']

const STOCK_NAMES: Record<string, string> = {
  AAPL: 'Apple Inc.',        MSFT: 'Microsoft Corp.',
  GOOGL: 'Alphabet Inc.',    AMZN: 'Amazon.com',
  NVDA: 'NVIDIA Corp.',      META: 'Meta Platforms',
  TSLA: 'Tesla Inc.',     'BRK.B': 'Berkshire Hathaway',
  JPM:  'JPMorgan Chase',    V:    'Visa Inc.',
  UNH:  'UnitedHealth',      XOM:  'Exxon Mobil',
  JNJ:  'Johnson & Johnson', PG:   'Procter & Gamble',
  MA:   'Mastercard',
}

// De-duplicated union of every Finnhub symbol the homepage needs
export const ALL_HOMEPAGE_SYMBOLS: string[] = (() => {
  const seen = new Set<string>()
  return [
    ...STRIP_CONFIG.map((s) => s.symbol),
    ...TICKER_FINNHUB_SYMBOLS,
    ...RADAR_SYMBOLS,
    ...DEFAULT_STOCKS,
  ].filter((s) => { if (seen.has(s)) return false; seen.add(s); return true })
})()

// ─── Cache config ─────────────────────────────────────────────────────────

export const HOMEPAGE_CACHE_KEY = 'homepage:init'
export const HOMEPAGE_CACHE_TTL = 600   // 10 min

// ─── Data builders ────────────────────────────────────────────────────────

function buildStocks(quotes: Map<string, QuoteRaw>): AssetCardData[] {
  return DEFAULT_STOCKS.flatMap((sym): AssetCardData[] => {
    const q = quotes.get(sym)
    if (!q) return []
    const price = q.price > 0 ? q.price : q.previousClose
    if (price <= 0) return []
    return [{
      symbol:        sym,
      name:          STOCK_NAMES[sym] ?? sym,
      type:          'stock',
      price,
      change:        q.price > 0 ? q.change        : 0,
      changePercent: q.price > 0 ? q.changePercent : 0,
      currency:      'USD',
      open:          q.open  > 0 ? q.open  : price,
      high:          q.high  > 0 ? q.high  : price,
      low:           q.low   > 0 ? q.low   : price,
    }]
  })
}

function buildCommodityStrip(quotes: Map<string, QuoteRaw>): CommodityStripItem[] {
  return STRIP_CONFIG.flatMap((cfg): CommodityStripItem[] => {
    const q = quotes.get(cfg.symbol)
    if (!q) return []
    const price = q.price > 0 ? q.price : q.previousClose
    if (price <= 0) return []
    return [{
      symbol:        cfg.symbol,
      name:          cfg.name,
      shortName:     cfg.shortName,
      price,
      change:        q.price > 0 ? q.change        : 0,
      changePercent: q.price > 0 ? q.changePercent : 0,
      currency:      'USD',
    }]
  })
}

function buildTickerQuotes(quotes: Map<string, QuoteRaw>): Record<string, QuoteRaw> {
  const result: Record<string, QuoteRaw> = {}
  for (const sym of TICKER_FINNHUB_SYMBOLS) {
    const q = quotes.get(sym)
    if (q) result[sym] = q
  }
  return result
}

function buildMarketRadar(quotes: Map<string, QuoteRaw>): MarketRadarPayload | null {
  const signals: RadarSignal[] = []
  let buyVotes  = 0
  let cashVotes = 0

  const spy = quotes.get('SPY')
  if (spy) {
    const pct = spy.changePercent
    const v: SignalVerdict = pct > 0 ? 'BUY' : 'CASH'
    pct > 0 ? buyVotes++ : cashVotes++
    signals.push({ name: 'S&P 500', verdict: v, value: `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`, reason: v === 'BUY' ? 'Market advancing' : 'Market declining' })
  }

  const qqq = quotes.get('QQQ')
  if (qqq) {
    const pct = qqq.changePercent
    const v: SignalVerdict = pct > 0 ? 'BUY' : 'CASH'
    pct > 0 ? buyVotes++ : cashVotes++
    signals.push({ name: 'Nasdaq', verdict: v, value: `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`, reason: v === 'BUY' ? 'Tech advancing' : 'Tech under pressure' })
  }

  const vxx = quotes.get('VXX')
  if (vxx) {
    const fearful = vxx.price > 20 || vxx.changePercent > 5
    const v: SignalVerdict = fearful ? 'CASH' : 'BUY'
    fearful ? cashVotes += 2 : buyVotes++
    signals.push({ name: 'Volatility (VXX)', verdict: v, value: `$${vxx.price.toFixed(2)}`, reason: fearful ? 'Elevated fear — reduce risk' : 'Low volatility — conducive to gains' })
  }

  const gld = quotes.get('GLD')
  if (gld) {
    const riskOff = gld.changePercent > 1.2
    const v: SignalVerdict = riskOff ? 'CASH' : 'BUY'
    riskOff ? cashVotes++ : buyVotes++
    signals.push({ name: 'Gold', verdict: v, value: `${gld.changePercent > 0 ? '+' : ''}${gld.changePercent.toFixed(2)}%`, reason: riskOff ? 'Rising gold = risk-off rotation' : 'Gold stable — no flight to safety' })
  }

  const uso = quotes.get('USO')
  if (uso) {
    const inflPressure = uso.changePercent > 2.5
    const v: SignalVerdict = inflPressure ? 'MIXED' : 'BUY'
    inflPressure ? cashVotes++ : buyVotes++
    signals.push({ name: 'WTI Oil', verdict: v, value: `${uso.changePercent > 0 ? '+' : ''}${uso.changePercent.toFixed(2)}%`, reason: inflPressure ? 'High oil = inflation risk' : 'Oil stable — inflation contained' })
  }

  const tlt = quotes.get('TLT')
  if (tlt) {
    const bondRally = tlt.changePercent > 0.8
    const v: SignalVerdict = bondRally ? 'CASH' : 'BUY'
    bondRally ? cashVotes++ : buyVotes++
    signals.push({ name: 'US Bonds (TLT)', verdict: v, value: `${tlt.changePercent > 0 ? '+' : ''}${tlt.changePercent.toFixed(2)}%`, reason: bondRally ? 'Bond rally = risk-off' : 'Bonds weak — money in equities' })
  }

  if (signals.length === 0) return null

  const total   = buyVotes + cashVotes || 1
  const score   = Math.round((buyVotes / total) * 100)
  let verdict: SignalVerdict = 'MIXED'
  if (score >= 60) verdict = 'BUY'
  else if (score <= 40) verdict = 'CASH'

  return { verdict, score, signals, updatedAt: Date.now() }
}

// ─── Main function ────────────────────────────────────────────────────────

export async function getHomepageData(): Promise<HomepageData> {
  // Fast path: full-homepage cache (600 s TTL)
  try {
    const cached = await redis.get<HomepageData>(HOMEPAGE_CACHE_KEY)
    if (cached) {
      console.log('[homepage] cache HIT')
      return cached
    }
  } catch { /* fall through to live fetch */ }

  console.log('[homepage] cache MISS — fetching all symbols')

  // Fetch all Finnhub symbols in one coordinated batch.
  // 3 per batch × 1 000 ms delay → ≤10 Finnhub req/min for a full cold start.
  // Phase-1 Redis check inside getQuotesBatched catches already-warm symbols.
  const quotes = await getQuotesBatched(ALL_HOMEPAGE_SYMBOLS, 3, 1_000)

  const data: HomepageData = {
    stocks:         buildStocks(quotes),
    commodityStrip: buildCommodityStrip(quotes),
    tickerQuotes:   buildTickerQuotes(quotes),
    marketRadar:    buildMarketRadar(quotes),
    cachedAt:       Date.now(),
  }

  // Add crypto quotes for TickerTape (CoinGecko — no Finnhub, no rate limit)
  try {
    const coins = await getCryptoByIds(TICKER_CRYPTO.map((c) => c.id))
    const idMap = Object.fromEntries(TICKER_CRYPTO.map((c) => [c.id, c.binanceKey]))
    for (const coin of coins) {
      const key = idMap[coin.id]
      if (!key) continue
      const price = coin.currentPrice
      data.tickerQuotes[key] = {
        price,
        previousClose: price - coin.priceChange24h,
        change:        coin.priceChange24h,
        changePercent: coin.priceChangePercent24h,
        high:          coin.high24h,
        low:           coin.low24h,
        open:          price - coin.priceChange24h,
        timestamp:     Date.now(),
      }
    }
  } catch { /* non-fatal — crypto quotes just won't be in SSR data */ }

  // Cache the full result for 10 minutes
  redis.set(HOMEPAGE_CACHE_KEY, data, { ex: HOMEPAGE_CACHE_TTL }).catch(() => {})

  return data
}
