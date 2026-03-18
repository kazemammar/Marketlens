import { NextResponse }      from 'next/server'
import { withRateLimit }     from '@/lib/utils/rate-limit'
import { redis }             from '@/lib/cache/redis'
import { getQuotesBatched }  from '@/lib/api/finnhub'
import { getCryptoMarkets }  from '@/lib/api/coingecko'
import { getYahooQuotesBatch } from '@/lib/api/yahoo'

// ─── Symbol lists ────────────────────────────────────────────────────────────

const STOCK_SYMBOLS = [
  'AAPL','MSFT','GOOGL','NVDA','META','TSLA','AVGO','CRM','AMD','INTC','ORCL','ADBE','CSCO','NFLX','QCOM',
  'JPM','V','MA','BAC','GS','MS','BLK','AXP','SCHW','C',
  'UNH','JNJ','LLY','PFE','ABBV','MRK','TMO','ABT','AMGN','MDT',
  'XOM','CVX','COP','SLB','EOG','MPC','PSX','VLO','OXY','HAL',
  'AMZN','HD','PG','KO','PEP','COST','WMT','MCD','NKE','SBUX',
  'CAT','DE','GE','BA','HON','UPS','LMT','RTX','MMM','UNP',
]

const COMMODITY_SYMBOLS = ['CL=F','BZ=F','GC=F','SI=F','NG=F','HG=F','ZW=F','ZC=F']

// ─── Name lookups ─────────────────────────────────────────────────────────────

const STOCK_NAMES: Record<string, string> = {
  AAPL: 'Apple', MSFT: 'Microsoft', GOOGL: 'Alphabet', NVDA: 'NVIDIA', META: 'Meta',
  TSLA: 'Tesla', AVGO: 'Broadcom', CRM: 'Salesforce', AMD: 'AMD', INTC: 'Intel',
  ORCL: 'Oracle', ADBE: 'Adobe', CSCO: 'Cisco', NFLX: 'Netflix', QCOM: 'Qualcomm',
  JPM: 'JPMorgan', V: 'Visa', MA: 'Mastercard', BAC: 'Bank of America', GS: 'Goldman Sachs',
  MS: 'Morgan Stanley', BLK: 'BlackRock', AXP: 'Amex', SCHW: 'Schwab', C: 'Citigroup',
  UNH: 'UnitedHealth', JNJ: 'J&J', LLY: 'Eli Lilly', PFE: 'Pfizer', ABBV: 'AbbVie',
  MRK: 'Merck', TMO: 'Thermo Fisher', ABT: 'Abbott', AMGN: 'Amgen', MDT: 'Medtronic',
  XOM: 'Exxon', CVX: 'Chevron', COP: 'ConocoPhillips', SLB: 'Schlumberger', EOG: 'EOG Resources',
  MPC: 'Marathon Petro', PSX: 'Phillips 66', VLO: 'Valero', OXY: 'Occidental', HAL: 'Halliburton',
  AMZN: 'Amazon', HD: 'Home Depot', PG: 'P&G', KO: 'Coca-Cola', PEP: 'Pepsi',
  COST: 'Costco', WMT: 'Walmart', MCD: "McDonald's", NKE: 'Nike', SBUX: 'Starbucks',
  CAT: 'Caterpillar', DE: 'Deere', GE: 'GE Aerospace', BA: 'Boeing', HON: 'Honeywell',
  UPS: 'UPS', LMT: 'Lockheed Martin', RTX: 'RTX', MMM: '3M', UNP: 'Union Pacific',
}

const COMMODITY_NAMES: Record<string, string> = {
  'CL=F': 'WTI Crude', 'BZ=F': 'Brent Crude', 'GC=F': 'Gold', 'SI=F': 'Silver',
  'NG=F': 'Natural Gas', 'HG=F': 'Copper', 'ZW=F': 'Wheat', 'ZC=F': 'Corn',
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MoverItem {
  symbol:        string
  name:          string
  type:          string
  price:         number
  change:        number
  changePercent: number
}

export interface MoversPayload {
  all:         { gainers: MoverItem[]; losers: MoverItem[] }
  stocks:      { gainers: MoverItem[]; losers: MoverItem[] }
  crypto:      { gainers: MoverItem[]; losers: MoverItem[] }
  commodities: { gainers: MoverItem[]; losers: MoverItem[] }
  generatedAt: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function topGainers(items: MoverItem[], n: number): MoverItem[] {
  return [...items].sort((a, b) => b.changePercent - a.changePercent).slice(0, n)
}

function topLosers(items: MoverItem[], n: number): MoverItem[] {
  return [...items].sort((a, b) => a.changePercent - b.changePercent).slice(0, n)
}

// ─── Route ────────────────────────────────────────────────────────────────────

const CACHE_KEY = 'movers:all'
const CACHE_TTL = 90 // seconds

export async function GET(req: Request) {
  const limited = withRateLimit(req, 30)
  if (limited) return limited

  // Check Redis cache
  try {
    const cached = await redis.get<MoversPayload>(CACHE_KEY)
    if (cached) return NextResponse.json(cached)
  } catch { /* fallthrough */ }

  // Fetch all sources in parallel
  const [stocksResult, cryptoResult, commoditiesResult] = await Promise.allSettled([
    getQuotesBatched(STOCK_SYMBOLS, 3, 1000),
    getCryptoMarkets(1, 'usd', 30),
    getYahooQuotesBatch(COMMODITY_SYMBOLS),
  ])

  // Map stocks
  const stockItems: MoverItem[] = []
  if (stocksResult.status === 'fulfilled') {
    for (const symbol of STOCK_SYMBOLS) {
      const q = stocksResult.value.get(symbol)
      if (!q || q.price === 0) continue
      stockItems.push({
        symbol,
        name:          STOCK_NAMES[symbol] ?? symbol,
        type:          'stock',
        price:         q.price,
        change:        q.change,
        changePercent: q.changePercent,
      })
    }
  }

  // Map crypto
  const cryptoItems: MoverItem[] = []
  if (cryptoResult.status === 'fulfilled') {
    for (const coin of cryptoResult.value) {
      if (coin.currentPrice === 0) continue
      cryptoItems.push({
        symbol:        coin.symbol.toUpperCase(),
        name:          coin.name,
        type:          'crypto',
        price:         coin.currentPrice,
        change:        coin.priceChange24h,
        changePercent: coin.priceChangePercent24h,
      })
    }
  }

  // Map commodities
  const commodityItems: MoverItem[] = []
  if (commoditiesResult.status === 'fulfilled') {
    for (const q of commoditiesResult.value) {
      if (q.price === 0) continue
      commodityItems.push({
        symbol:        q.symbol,
        name:          COMMODITY_NAMES[q.symbol] ?? q.symbol,
        type:          'commodity',
        price:         q.price,
        change:        q.change,
        changePercent: q.changePercent,
      })
    }
  }

  const allItems = [...stockItems, ...cryptoItems, ...commodityItems]

  const payload: MoversPayload = {
    all:         { gainers: topGainers(allItems,       15), losers: topLosers(allItems,       15) },
    stocks:      { gainers: topGainers(stockItems,     10), losers: topLosers(stockItems,     10) },
    crypto:      { gainers: topGainers(cryptoItems,    10), losers: topLosers(cryptoItems,    10) },
    commodities: { gainers: topGainers(commodityItems, 10), losers: topLosers(commodityItems, 10) },
    generatedAt: Date.now(),
  }

  // Cache result (fire-and-forget)
  redis.set(CACHE_KEY, payload, { ex: CACHE_TTL }).catch(() => {})

  return NextResponse.json(payload)
}
