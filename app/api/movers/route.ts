import { NextResponse }      from 'next/server'
import { withRateLimit }     from '@/lib/utils/rate-limit'
import { redis }             from '@/lib/cache/redis'
import { getQuotesBatched }  from '@/lib/api/finnhub'
import { getCryptoMarkets }  from '@/lib/api/coingecko'
import { getYahooQuotesBatch } from '@/lib/api/yahoo'

// ─── Symbol lists ────────────────────────────────────────────────────────────

const STOCK_SYMBOLS = [
  // Technology
  'AAPL','MSFT','NVDA','AVGO','ORCL','CRM','ADBE','AMD','CSCO','QCOM','INTC','NOW','PLTR','PANW','SNPS','CDNS','MRVL','KLAC','LRCX','AMAT','MU','ADI','FTNT','WDAY','TEAM','CRWD','DDOG','ZS','HUBS','ANSS',
  // Finance
  'JPM','V','MA','BAC','GS','MS','BLK','SCHW','C','AXP','BRK.B','WFC','SPGI','ICE','CME','PGR','USB','MMC','CB','AON','MET','AIG','PRU','TRV','PNC','COF','PYPL','AJG','FITB','FIS',
  // Healthcare
  'UNH','LLY','JNJ','ABBV','MRK','TMO','ABT','PFE','AMGN','MDT','ISRG','DHR','BMY','GILD','CVS','CI','ELV','VRTX','REGN','ZTS','BDX','BSX','SYK','HCA','MCK','A','DXCM','IQV','IDXX','EW',
  // Consumer Disc.
  'AMZN','TSLA','HD','NKE','MCD','LOW','SBUX','TJX','BKNG','CMG','ABNB','MAR','RCL','ORLY','AZO','ROST','DHI','LEN','YUM','DPZ','LULU','ULTA','DECK','GM','F','EBAY','ETSY','CPRT','BBY','GRMN',
  // Consumer Staples
  'PG','KO','PEP','COST','WMT','PM','MO','CL','MDLZ','KHC','GIS','STZ','MNST','KR','SYY','HSY','ADM','TAP','CAG','SJM','CLX','CHD','K','TSN','HRL','MKC','BG','LAMB','CPB','WBA',
  // Industrial
  'CAT','GE','HON','UPS','BA','RTX','LMT','DE','UNP','FDX','WM','ETN','ITW','EMR','GD','NOC','TDG','CSX','NSC','CARR','JCI','IR','PH','PCAR','CTAS','FAST','GWW','VRSK','ROK','SWK',
  // Communication
  'GOOGL','META','NFLX','DIS','CMCSA','T','VZ','TMUS','CHTR','SPOT','RBLX','EA','TTWO','WBD','PARA','LYV','MTCH','PINS','ZM','SNAP','ROKU','OMC','IPG','FOXA','NWSA',
  // Energy
  'XOM','CVX','COP','SLB','EOG','MPC','PSX','VLO','OXY','HAL','DVN','FANG','HES','BKR','KMI','WMB','OKE','TRGP','LNG','MRO','CTRA','EQT','APA','WFRD','FTI',
  // Real Estate
  'AMT','PLD','CCI','EQIX','PSA','SPG','O','WELL','DLR','AVB','EQR','VICI','IRM','ARE','KIM','ESS','MAA','REG','UDR','HST','CPT','BXP','PEAK','SUI','EXR',
  // Materials
  'LIN','APD','SHW','ECL','FCX','NEM','NUE','DOW','DD','VMC','MLM','PPG','IFF','CE','ALB','EMN','FMC','IP','PKG','AVY','SEE','CF','MOS','BALL','AMCR',
  // Utilities
  'NEE','DUK','SO','D','AEP','SRE','EXC','XEL','ED','WEC','ES','AWK','ATO','CMS','DTE','PEG','FE','PPL','EIX','ETR','CEG','EVRG','NI','LNT','AES',
]

const COMMODITY_SYMBOLS = ['CL=F','BZ=F','GC=F','SI=F','NG=F','HG=F','ZW=F','ZC=F']

// ─── Name lookups ─────────────────────────────────────────────────────────────

const STOCK_NAMES: Record<string, string> = {
  // Technology
  AAPL: 'Apple', MSFT: 'Microsoft', NVDA: 'NVIDIA', AVGO: 'Broadcom', ORCL: 'Oracle',
  CRM: 'Salesforce', ADBE: 'Adobe', AMD: 'AMD', CSCO: 'Cisco', QCOM: 'Qualcomm',
  INTC: 'Intel', NOW: 'ServiceNow', PLTR: 'Palantir', PANW: 'Palo Alto Networks',
  SNPS: 'Synopsys', CDNS: 'Cadence Design', MRVL: 'Marvell Tech', KLAC: 'KLA Corp',
  LRCX: 'Lam Research', AMAT: 'Applied Materials', MU: 'Micron', ADI: 'Analog Devices',
  FTNT: 'Fortinet', WDAY: 'Workday', TEAM: 'Atlassian', CRWD: 'CrowdStrike',
  DDOG: 'Datadog', ZS: 'Zscaler', HUBS: 'HubSpot', ANSS: 'Ansys',
  // Finance
  JPM: 'JPMorgan', V: 'Visa', MA: 'Mastercard', BAC: 'Bank of America', GS: 'Goldman Sachs',
  MS: 'Morgan Stanley', BLK: 'BlackRock', SCHW: 'Schwab', C: 'Citigroup', AXP: 'Amex',
  'BRK.B': 'Berkshire Hathaway', WFC: 'Wells Fargo', SPGI: 'S&P Global', ICE: 'ICE',
  CME: 'CME Group', PGR: 'Progressive', USB: 'US Bancorp', MMC: 'Marsh McLennan',
  CB: 'Chubb', AON: 'Aon', MET: 'MetLife', AIG: 'AIG', PRU: 'Prudential',
  TRV: 'Travelers', PNC: 'PNC Financial', COF: 'Capital One', PYPL: 'PayPal',
  AJG: 'Arthur J. Gallagher', FITB: 'Fifth Third', FIS: 'Fidelity NIS',
  // Healthcare
  UNH: 'UnitedHealth', LLY: 'Eli Lilly', JNJ: 'J&J', ABBV: 'AbbVie', MRK: 'Merck',
  TMO: 'Thermo Fisher', ABT: 'Abbott', PFE: 'Pfizer', AMGN: 'Amgen', MDT: 'Medtronic',
  ISRG: 'Intuitive Surgical', DHR: 'Danaher', BMY: 'Bristol Myers', GILD: 'Gilead',
  CVS: 'CVS Health', CI: 'Cigna', ELV: 'Elevance', VRTX: 'Vertex', REGN: 'Regeneron',
  ZTS: 'Zoetis', BDX: 'Becton Dickinson', BSX: 'Boston Scientific', SYK: 'Stryker',
  HCA: 'HCA Healthcare', MCK: 'McKesson', A: 'Agilent', DXCM: 'Dexcom',
  IQV: 'IQVIA', IDXX: 'IDEXX Labs', EW: 'Edwards Lifesciences',
  // Consumer Disc.
  AMZN: 'Amazon', TSLA: 'Tesla', HD: 'Home Depot', NKE: 'Nike', MCD: "McDonald's",
  LOW: 'Lowes', SBUX: 'Starbucks', TJX: 'TJX Companies', BKNG: 'Booking', CMG: 'Chipotle',
  ABNB: 'Airbnb', MAR: 'Marriott', RCL: 'Royal Caribbean', ORLY: "O'Reilly Auto",
  AZO: 'AutoZone', ROST: 'Ross Stores', DHI: 'D.R. Horton', LEN: 'Lennar',
  YUM: 'Yum! Brands', DPZ: "Domino's", LULU: 'Lululemon', ULTA: 'Ulta Beauty',
  DECK: 'Deckers Outdoor', GM: 'General Motors', F: 'Ford', EBAY: 'eBay',
  ETSY: 'Etsy', CPRT: 'Copart', BBY: 'Best Buy', GRMN: 'Garmin',
  // Consumer Staples
  PG: 'P&G', KO: 'Coca-Cola', PEP: 'Pepsi', COST: 'Costco', WMT: 'Walmart',
  PM: 'Philip Morris', MO: 'Altria', CL: 'Colgate', MDLZ: 'Mondelez', KHC: 'Kraft Heinz',
  GIS: 'General Mills', STZ: 'Constellation Brands', MNST: 'Monster Beverage',
  KR: 'Kroger', SYY: 'Sysco', HSY: 'Hershey', ADM: 'Archer-Daniels', TAP: 'Molson Coors',
  CAG: 'Conagra', SJM: 'J.M. Smucker', CLX: 'Clorox', CHD: 'Church & Dwight',
  K: 'Kellanova', TSN: 'Tyson Foods', HRL: 'Hormel', MKC: 'McCormick',
  BG: 'Bunge', LAMB: 'Lamb Weston', CPB: "Campbell's", WBA: 'Walgreens',
  // Industrial
  CAT: 'Caterpillar', GE: 'GE Aerospace', HON: 'Honeywell', UPS: 'UPS', BA: 'Boeing',
  RTX: 'RTX', LMT: 'Lockheed Martin', DE: 'Deere', UNP: 'Union Pacific', FDX: 'FedEx',
  WM: 'Waste Management', ETN: 'Eaton', ITW: 'Illinois Tool Works', EMR: 'Emerson',
  GD: 'General Dynamics', NOC: 'Northrop Grumman', TDG: 'TransDigm',
  CSX: 'CSX', NSC: 'Norfolk Southern', CARR: 'Carrier', JCI: 'Johnson Controls',
  IR: 'Ingersoll Rand', PH: 'Parker Hannifin', PCAR: 'PACCAR', CTAS: 'Cintas',
  FAST: 'Fastenal', GWW: 'W.W. Grainger', VRSK: 'Verisk', ROK: 'Rockwell Auto', SWK: 'Stanley Black & Decker',
  // Communication
  GOOGL: 'Alphabet', META: 'Meta', NFLX: 'Netflix', DIS: 'Disney', CMCSA: 'Comcast',
  T: 'AT&T', VZ: 'Verizon', TMUS: 'T-Mobile', CHTR: 'Charter', SPOT: 'Spotify',
  RBLX: 'Roblox', EA: 'EA', TTWO: 'Take-Two', WBD: 'Warner Bros', PARA: 'Paramount',
  LYV: 'Live Nation', MTCH: 'Match Group', PINS: 'Pinterest', ZM: 'Zoom', SNAP: 'Snap',
  ROKU: 'Roku', OMC: 'Omnicom', IPG: 'Interpublic', FOXA: 'Fox Corp', NWSA: 'News Corp',
  // Energy
  XOM: 'Exxon', CVX: 'Chevron', COP: 'ConocoPhillips', SLB: 'Schlumberger', EOG: 'EOG Resources',
  MPC: 'Marathon Petro', PSX: 'Phillips 66', VLO: 'Valero', OXY: 'Occidental', HAL: 'Halliburton',
  DVN: 'Devon Energy', FANG: 'Diamondback', HES: 'Hess', BKR: 'Baker Hughes',
  KMI: 'Kinder Morgan', WMB: 'Williams Cos', OKE: 'ONEOK', TRGP: 'Targa Resources',
  LNG: 'Cheniere Energy', MRO: 'Marathon Oil', CTRA: 'Coterra Energy', EQT: 'EQT Corp',
  APA: 'APA Corp', WFRD: 'Weatherford', FTI: 'TechnipFMC',
  // Real Estate
  AMT: 'American Tower', PLD: 'Prologis', CCI: 'Crown Castle', EQIX: 'Equinix',
  PSA: 'Public Storage', SPG: 'Simon Property', O: 'Realty Income',
  WELL: 'Welltower', DLR: 'Digital Realty', AVB: 'AvalonBay',
  EQR: 'Equity Residential', VICI: 'VICI Properties', IRM: 'Iron Mountain',
  ARE: 'Alexandria RE', KIM: 'Kimco Realty', ESS: 'Essex Property', MAA: 'Mid-America',
  REG: 'Regency Centers', UDR: 'UDR Inc', HST: 'Host Hotels', CPT: 'Camden Property',
  BXP: 'BXP Inc', PEAK: 'Healthpeak', SUI: 'Sun Communities', EXR: 'Extra Space',
  // Materials
  LIN: 'Linde', APD: 'Air Products', SHW: 'Sherwin-Williams', ECL: 'Ecolab', FCX: 'Freeport-McMoRan',
  NEM: 'Newmont', NUE: 'Nucor', DOW: 'Dow', DD: 'DuPont', VMC: 'Vulcan Materials',
  MLM: 'Martin Marietta', PPG: 'PPG Industries', IFF: 'IFF', CE: 'Celanese',
  ALB: 'Albemarle', EMN: 'Eastman Chemical', FMC: 'FMC Corp', IP: 'International Paper',
  PKG: 'Packaging Corp', AVY: 'Avery Dennison', SEE: 'Sealed Air', CF: 'CF Industries',
  MOS: 'Mosaic', BALL: 'Ball Corp', AMCR: 'Amcor',
  // Utilities
  NEE: 'NextEra Energy', DUK: 'Duke Energy', SO: 'Southern Company', D: 'Dominion',
  AEP: 'American Electric', SRE: 'Sempra', EXC: 'Exelon', XEL: 'Xcel Energy',
  ED: 'Con Edison', WEC: 'WEC Energy', ES: 'Eversource', AWK: 'American Water',
  ATO: 'Atmos Energy', CMS: 'CMS Energy', DTE: 'DTE Energy', PEG: 'PSEG',
  FE: 'FirstEnergy', PPL: 'PPL Corp', EIX: 'Edison Intl', ETR: 'Entergy',
  CEG: 'Constellation Energy', EVRG: 'Evergy', NI: 'NiSource', LNT: 'Alliant Energy', AES: 'AES Corp',
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

// ─── Cache config ─────────────────────────────────────────────────────────────

const CACHE_KEY     = 'movers:v2'
const LOCK_KEY      = 'movers:lock'
const CACHE_TTL     = 1_800          // keep stale data for 30 min in Redis
const REFRESH_AFTER = 5 * 60 * 1_000 // background refresh if > 5 min old

interface CachedMovers {
  data:      MoversPayload
  fetchedAt: number
}

// ─── Data fetcher ─────────────────────────────────────────────────────────────

async function fetchMoversData(): Promise<MoversPayload | null> {
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
  if (allItems.length === 0) return null

  return {
    all:         { gainers: topGainers(allItems,       15), losers: topLosers(allItems,       15) },
    stocks:      { gainers: topGainers(stockItems,     10), losers: topLosers(stockItems,     10) },
    crypto:      { gainers: topGainers(cryptoItems,    10), losers: topLosers(cryptoItems,    10) },
    commodities: { gainers: topGainers(commodityItems, 10), losers: topLosers(commodityItems, 10) },
    generatedAt: Date.now(),
  }
}

function emptyPayload(): MoversPayload {
  const empty = { gainers: [], losers: [] }
  return { all: empty, stocks: empty, crypto: empty, commodities: empty, generatedAt: Date.now() }
}

// ─── Background refresh (fire-and-forget) ────────────────────────────────────

function triggerBackgroundRefresh() {
  void (async () => {
    const lock = await redis.set(LOCK_KEY, 1, { ex: 180, nx: true }).catch(() => null)
    if (!lock) return  // another refresh already running

    try {
      const payload = await fetchMoversData()
      if (payload) {
        await redis.set(CACHE_KEY, { data: payload, fetchedAt: Date.now() } satisfies CachedMovers, { ex: CACHE_TTL })
        console.log('[movers] background refresh complete')
      }
    } catch (err) {
      console.warn('[movers] background refresh failed', err)
    } finally {
      redis.del(LOCK_KEY).catch(() => {})
    }
  })()
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const limited = withRateLimit(req, 30)
  if (limited) return limited

  // 1. Check cache
  try {
    const cached = await redis.get<CachedMovers>(CACHE_KEY)
    if (cached?.data) {
      const ageMs = Date.now() - cached.fetchedAt
      console.log(`[movers] cache ${ageMs < REFRESH_AFTER ? 'FRESH' : 'STALE'} age=${Math.round(ageMs / 1000)}s`)

      if (ageMs >= REFRESH_AFTER) {
        triggerBackgroundRefresh()  // non-blocking
      }

      return NextResponse.json(cached.data)
    }
  } catch { /* fallthrough to blocking fetch */ }

  // 2. No cache — cold start blocking fetch
  console.log('[movers] cold fetch')
  const payload = await fetchMoversData()
  if (payload) {
    redis.set(CACHE_KEY, { data: payload, fetchedAt: Date.now() } satisfies CachedMovers, { ex: CACHE_TTL }).catch(() => {})
  }
  return NextResponse.json(payload ?? emptyPayload())
}
