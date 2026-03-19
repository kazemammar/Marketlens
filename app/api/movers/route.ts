import { NextResponse }      from 'next/server'
import { withRateLimit }     from '@/lib/utils/rate-limit'
import { redis }             from '@/lib/cache/redis'
import { getQuotesBatched }  from '@/lib/api/finnhub'
import { getCryptoMarkets }  from '@/lib/api/coingecko'
import { getYahooQuotesBatch } from '@/lib/api/yahoo'

// ─── Symbol lists ────────────────────────────────────────────────────────────

const STOCK_SYMBOLS = [
  // Technology
  'AAPL','MSFT','GOOGL','NVDA','META','TSLA','AVGO','CRM','AMD','INTC','ORCL','ADBE','CSCO','NFLX','QCOM','PLTR','PANW','SNOW','NOW','SHOP','UBER','SQ','COIN','MSTR','MU',
  // Finance
  'JPM','V','MA','BAC','GS','MS','BLK','AXP','SCHW','C','WFC','USB','PNC','COF','AIG','MET','PRU','ICE','CME','PYPL',
  // Healthcare
  'UNH','JNJ','LLY','PFE','ABBV','MRK','TMO','ABT','AMGN','MDT','ISRG','DHR','BMY','GILD','CVS','CI','ELV','ZTS','REGN','VRTX',
  // Energy
  'XOM','CVX','COP','SLB','EOG','MPC','PSX','VLO','OXY','HAL','DVN','FANG','HES','BKR','KMI','WMB','OKE','TRGP','LNG','MRO',
  // Consumer Disc.
  'AMZN','HD','NKE','SBUX','MCD','LOW','TJX','BKNG','CMG','YUM','ABNB','MAR','RCL','LULU','DPZ',
  // Consumer Staples
  'PG','KO','PEP','COST','WMT','PM','MO','CL','KHC','GIS','STZ','MNST','KR','SYY','HSY',
  // Industrial
  'CAT','DE','GE','BA','HON','UPS','LMT','RTX','MMM','UNP','FDX','WM','EMR','ITW','GD','NOC','TDG','CARR','JCI','IR',
  // Communication
  'DIS','CMCSA','T','VZ','TMUS','CHTR','SPOT','RBLX','EA','TTWO','WBD','PARA','LYV','MTCH','PINS',
  // Real Estate
  'AMT','PLD','CCI','EQIX','PSA','SPG','O','WELL','DLR','AVB','EQR','VICI','IRM','ARE','KIM',
  // Utilities
  'NEE','DUK','SO','D','AEP','SRE','EXC','XEL','ED','WEC','ES','AWK','ATO','CMS','DTE',
]

const COMMODITY_SYMBOLS = ['CL=F','BZ=F','GC=F','SI=F','NG=F','HG=F','ZW=F','ZC=F']

// ─── Name lookups ─────────────────────────────────────────────────────────────

const STOCK_NAMES: Record<string, string> = {
  // Technology
  AAPL: 'Apple', MSFT: 'Microsoft', GOOGL: 'Alphabet', NVDA: 'NVIDIA', META: 'Meta',
  TSLA: 'Tesla', AVGO: 'Broadcom', CRM: 'Salesforce', AMD: 'AMD', INTC: 'Intel',
  ORCL: 'Oracle', ADBE: 'Adobe', CSCO: 'Cisco', NFLX: 'Netflix', QCOM: 'Qualcomm',
  PLTR: 'Palantir', PANW: 'Palo Alto Networks', SNOW: 'Snowflake', NOW: 'ServiceNow',
  SHOP: 'Shopify', UBER: 'Uber', SQ: 'Block', COIN: 'Coinbase', MSTR: 'MicroStrategy', MU: 'Micron',
  // Finance
  JPM: 'JPMorgan', V: 'Visa', MA: 'Mastercard', BAC: 'Bank of America', GS: 'Goldman Sachs',
  MS: 'Morgan Stanley', BLK: 'BlackRock', AXP: 'Amex', SCHW: 'Schwab', C: 'Citigroup',
  WFC: 'Wells Fargo', USB: 'US Bancorp', PNC: 'PNC Financial', COF: 'Capital One',
  AIG: 'AIG', MET: 'MetLife', PRU: 'Prudential', ICE: 'Intercontinental Exchange',
  CME: 'CME Group', PYPL: 'PayPal',
  // Healthcare
  UNH: 'UnitedHealth', JNJ: 'J&J', LLY: 'Eli Lilly', PFE: 'Pfizer', ABBV: 'AbbVie',
  MRK: 'Merck', TMO: 'Thermo Fisher', ABT: 'Abbott', AMGN: 'Amgen', MDT: 'Medtronic',
  ISRG: 'Intuitive Surgical', DHR: 'Danaher', BMY: 'Bristol Myers', GILD: 'Gilead',
  CVS: 'CVS Health', CI: 'Cigna', ELV: 'Elevance', ZTS: 'Zoetis', REGN: 'Regeneron', VRTX: 'Vertex',
  // Energy
  XOM: 'Exxon', CVX: 'Chevron', COP: 'ConocoPhillips', SLB: 'Schlumberger', EOG: 'EOG Resources',
  MPC: 'Marathon Petro', PSX: 'Phillips 66', VLO: 'Valero', OXY: 'Occidental', HAL: 'Halliburton',
  DVN: 'Devon Energy', FANG: 'Diamondback', HES: 'Hess', BKR: 'Baker Hughes',
  KMI: 'Kinder Morgan', WMB: 'Williams Cos', OKE: 'ONEOK', TRGP: 'Targa Resources',
  LNG: 'Cheniere Energy', MRO: 'Marathon Oil',
  // Consumer Disc.
  AMZN: 'Amazon', HD: 'Home Depot', NKE: 'Nike', SBUX: 'Starbucks', MCD: "McDonald's",
  LOW: 'Lowes', TJX: 'TJX Companies', BKNG: 'Booking', CMG: 'Chipotle',
  YUM: 'Yum! Brands', ABNB: 'Airbnb', MAR: 'Marriott', RCL: 'Royal Caribbean',
  LULU: 'Lululemon', DPZ: "Domino's",
  // Consumer Staples
  PG: 'P&G', KO: 'Coca-Cola', PEP: 'Pepsi', COST: 'Costco', WMT: 'Walmart',
  PM: 'Philip Morris', MO: 'Altria', CL: 'Colgate', KHC: 'Kraft Heinz',
  GIS: 'General Mills', STZ: 'Constellation Brands', MNST: 'Monster Beverage',
  KR: 'Kroger', SYY: 'Sysco', HSY: 'Hershey',
  // Industrial
  CAT: 'Caterpillar', DE: 'Deere', GE: 'GE Aerospace', BA: 'Boeing', HON: 'Honeywell',
  UPS: 'UPS', LMT: 'Lockheed Martin', RTX: 'RTX', MMM: '3M', UNP: 'Union Pacific',
  FDX: 'FedEx', WM: 'Waste Management', EMR: 'Emerson', ITW: 'Illinois Tool Works',
  GD: 'General Dynamics', NOC: 'Northrop Grumman', TDG: 'TransDigm',
  CARR: 'Carrier', JCI: 'Johnson Controls', IR: 'Ingersoll Rand',
  // Communication
  DIS: 'Disney', CMCSA: 'Comcast', T: 'AT&T', VZ: 'Verizon',
  TMUS: 'T-Mobile', CHTR: 'Charter', SPOT: 'Spotify', RBLX: 'Roblox',
  EA: 'EA', TTWO: 'Take-Two', WBD: 'Warner Bros', PARA: 'Paramount',
  LYV: 'Live Nation', MTCH: 'Match Group', PINS: 'Pinterest',
  // Real Estate
  AMT: 'American Tower', PLD: 'Prologis', CCI: 'Crown Castle', EQIX: 'Equinix',
  PSA: 'Public Storage', SPG: 'Simon Property', O: 'Realty Income',
  WELL: 'Welltower', DLR: 'Digital Realty', AVB: 'AvalonBay',
  EQR: 'Equity Residential', VICI: 'VICI Properties', IRM: 'Iron Mountain',
  ARE: 'Alexandria RE', KIM: 'Kimco Realty',
  // Utilities
  NEE: 'NextEra Energy', DUK: 'Duke Energy', SO: 'Southern Company', D: 'Dominion',
  AEP: 'American Electric', SRE: 'Sempra', EXC: 'Exelon', XEL: 'Xcel Energy',
  ED: 'Con Edison', WEC: 'WEC Energy', ES: 'Eversource', AWK: 'American Water',
  ATO: 'Atmos Energy', CMS: 'CMS Energy', DTE: 'DTE Energy',
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
