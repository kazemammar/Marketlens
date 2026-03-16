import { RssFeed } from './types'

// ─── Colors ───────────────────────────────────────────────────────────────

export const POSITIVE_COLOR = '#22c55e'
export const NEGATIVE_COLOR = '#ef4444'
export const NEUTRAL_COLOR  = '#94a3b8'

// ─── API base URLs ────────────────────────────────────────────────────────

export const FINNHUB_BASE_URL   = 'https://finnhub.io/api/v1'
export const FMP_BASE_URL       = 'https://financialmodelingprep.com/api/v3'
export const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3'

// ─── Cache TTLs (seconds) ─────────────────────────────────────────────────

export const TTL = {
  QUOTE:            900,       // live price — 15 min (aggressive cache to stay within Finnhub free tier)
  SEARCH:           300,       // search results — 5 min
  NEWS:             300,       // news articles — 5 min
  SENTIMENT:        1_800,     // AI sentiment — 30 min
  FINANCIALS:       86_400,    // financials — 24 h
  RECOMMENDATIONS:  3_600,     // analyst recs — 1 h
  CRYPTO_MARKETS:   300,       // crypto list — 5 min
  CRYPTO_DETAIL:    300,       // single coin — 5 min
  FOREX:            300,       // forex rate — 5 min
  COMMODITIES:      300,       // commodities — 5 min
  PROFILE:          86_400,    // company profile — 24 h
  RATIOS:           86_400,    // financial ratios — 24 h
  RSS:              300,       // RSS feeds — 5 min
  RATE_LIMIT_BACKOFF: 30,      // back off after 429 for 30 s
} as const

// ─── Default asset lists ──────────────────────────────────────────────────

export const DEFAULT_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA',
  'META', 'TSLA', 'BRK.B', 'JPM', 'V',
  'UNH', 'XOM', 'JNJ', 'PG', 'MA',
]

export const DEFAULT_ETFS = [
  'SPY',  // S&P 500
  'QQQ',  // Nasdaq 100
  'DIA',  // Dow Jones
  'IWM',  // Russell 2000
  'VTI',  // Total Market
  'GLD',  // Gold
  'SLV',  // Silver
  'TLT',  // Long-term Treasuries
  'VNQ',  // Real Estate
  'ARKK', // ARK Innovation
]

// Commodity ETF proxies — Finnhub free tier supports these via the stocks endpoint
// (Futures symbols like GCUSD/CLUSD require a premium plan)
export const DEFAULT_COMMODITIES = [
  { symbol: 'GLD',  name: 'Gold',         currency: 'USD', underlying: 'Gold Spot' },
  { symbol: 'SLV',  name: 'Silver',       currency: 'USD', underlying: 'Silver Spot' },
  { symbol: 'USO',  name: 'Crude Oil',    currency: 'USD', underlying: 'WTI Crude Oil' },
  { symbol: 'UNG',  name: 'Natural Gas',  currency: 'USD', underlying: 'Henry Hub Nat. Gas' },
  { symbol: 'CPER', name: 'Copper',       currency: 'USD', underlying: 'Copper Index' },
  { symbol: 'PPLT', name: 'Platinum',     currency: 'USD', underlying: 'Platinum Spot' },
  { symbol: 'WEAT', name: 'Wheat',        currency: 'USD', underlying: 'Chicago Wheat' },
  { symbol: 'CORN', name: 'Corn',         currency: 'USD', underlying: 'Chicago Corn' },
]

// Forex pairs — uses open.er-api.com (free, no key required)
// `usdIsBase`: true  → price = rates[quoteCurrency]   (e.g. USD/JPY)
//              false → price = 1 / rates[baseCurrency] (e.g. EUR/USD)
export const DEFAULT_FOREX_PAIRS = [
  { symbol: 'EUR/USD', pair: 'EUR/USD', base: 'EUR', quote: 'USD', usdIsBase: false },
  { symbol: 'GBP/USD', pair: 'GBP/USD', base: 'GBP', quote: 'USD', usdIsBase: false },
  { symbol: 'USD/JPY', pair: 'USD/JPY', base: 'USD', quote: 'JPY', usdIsBase: true  },
  { symbol: 'USD/CHF', pair: 'USD/CHF', base: 'USD', quote: 'CHF', usdIsBase: true  },
  { symbol: 'AUD/USD', pair: 'AUD/USD', base: 'AUD', quote: 'USD', usdIsBase: false },
  { symbol: 'USD/CAD', pair: 'USD/CAD', base: 'USD', quote: 'CAD', usdIsBase: true  },
  { symbol: 'NZD/USD', pair: 'NZD/USD', base: 'NZD', quote: 'USD', usdIsBase: false },
  { symbol: 'USD/CNY', pair: 'USD/CNY', base: 'USD', quote: 'CNY', usdIsBase: true  },
]

// Base URL for the free forex rates API (no key required)
// Kept for reference; forex.ts uses api.frankfurter.app directly.
export const EXCHANGE_RATE_BASE_URL = 'https://api.frankfurter.app'

// CoinGecko IDs for the default crypto list
export const DEFAULT_CRYPTO_IDS = [
  'bitcoin', 'ethereum', 'tether', 'binancecoin', 'solana',
  'usd-coin', 'ripple', 'cardano', 'avalanche-2', 'dogecoin',
]

// Map from uppercase ticker symbol (as used in URL) to CoinGecko ID
export const CRYPTO_SYMBOL_TO_CG_ID: Record<string, string> = {
  BTC:  'bitcoin',
  ETH:  'ethereum',
  USDT: 'tether',
  BNB:  'binancecoin',
  SOL:  'solana',
  USDC: 'usd-coin',
  XRP:  'ripple',
  ADA:  'cardano',
  AVAX: 'avalanche-2',
  DOGE: 'dogecoin',
  TRX:  'tron',
  TON:  'the-open-network',
  MATIC: 'matic-network',
  DOT:  'polkadot',
  LINK: 'chainlink',
  LTC:  'litecoin',
  BCH:  'bitcoin-cash',
  UNI:  'uniswap',
  ATOM: 'cosmos',
  XLM:  'stellar',
}

// ─── RSS feeds ────────────────────────────────────────────────────────────

export const RSS_FEEDS: RssFeed[] = [
  // ── Financial News (Major) ──
  { name: 'Reuters Business',    url: 'https://feeds.reuters.com/reuters/businessNews' },
  { name: 'Reuters World',       url: 'https://feeds.reuters.com/Reuters/worldNews' },
  { name: 'MarketWatch',         url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  { name: 'Yahoo Finance',       url: 'https://finance.yahoo.com/news/rssindex' },
  { name: 'Seeking Alpha',       url: 'https://seekingalpha.com/market_currents.xml' },
  { name: 'Investopedia',        url: 'https://www.investopedia.com/feedbuilder/feed/getfeed?feedName=rss_headline' },
  { name: 'Benzinga',            url: 'https://www.benzinga.com/feed' },

  // ── CNBC ──
  { name: 'CNBC Top News',       url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114' },
  { name: 'CNBC World Markets',  url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839135' },
  { name: 'CNBC Economy',        url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362' },
  { name: 'CNBC Tech',           url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=19854910' },
  { name: 'CNBC Finance',        url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664' },

  // ── World News & Geopolitics ──
  { name: 'BBC World',           url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'BBC Business',        url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { name: 'Al Jazeera',          url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { name: 'NPR World',           url: 'https://feeds.npr.org/1004/rss.xml' },
  { name: 'NPR Business',        url: 'https://feeds.npr.org/1006/rss.xml' },
  { name: 'AP News',             url: 'https://rsshub.app/apnews/topics/business' },
  { name: 'France 24',           url: 'https://www.france24.com/en/rss' },
  { name: 'DW News',             url: 'https://rss.dw.com/rdf/rss-en-all' },

  // ── Energy & Commodities ──
  { name: 'OilPrice.com',        url: 'https://oilprice.com/rss/main' },
  { name: 'Rigzone',             url: 'https://www.rigzone.com/news/rss/rigzone_latest.aspx' },
  { name: 'Mining.com',          url: 'https://www.mining.com/feed/' },

  // ── Crypto ──
  { name: 'CoinDesk',            url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { name: 'CoinTelegraph',       url: 'https://cointelegraph.com/rss' },
  { name: 'The Block',           url: 'https://www.theblock.co/rss.xml' },
  { name: 'Decrypt',             url: 'https://decrypt.co/feed' },

  // ── Tech ──
  { name: 'TechCrunch',          url: 'https://techcrunch.com/feed/' },
  { name: 'The Verge',           url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'Ars Technica',        url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { name: 'Wired Business',      url: 'https://www.wired.com/feed/category/business/latest/rss' },

  // ── Defense & Security ──
  { name: 'Defense One',         url: 'https://www.defenseone.com/rss/' },
  { name: 'Defense News',        url: 'https://www.defensenews.com/arc/outboundfeeds/rss/' },
  { name: 'War on the Rocks',    url: 'https://warontherocks.com/feed/' },

  // ── Central Banks & Economics ──
  { name: 'Fed Reserve',         url: 'https://www.federalreserve.gov/feeds/press_all.xml' },
  { name: 'ECB',                 url: 'https://www.ecb.europa.eu/rss/press.html' },
  { name: 'IMF Blog',            url: 'https://www.imf.org/en/News/rss?Language=ENG' },
  { name: 'World Bank',          url: 'https://blogs.worldbank.org/feed' },

  // ── Real Estate & Housing ──
  { name: 'HousingWire',         url: 'https://www.housingwire.com/feed/' },

  // ── Auto & EV ──
  { name: 'Electrek',            url: 'https://electrek.co/feed/' },
  { name: 'InsideEVs',           url: 'https://insideevs.com/rss/news/all/' },

  // ── Healthcare & Pharma ──
  { name: 'STAT News',           url: 'https://www.statnews.com/feed/' },
  { name: 'Fierce Pharma',       url: 'https://www.fiercepharma.com/rss/xml' },

  // ── Supply Chain & Trade ──
  { name: 'FreightWaves',        url: 'https://www.freightwaves.com/news/rss.xml' },
  { name: 'Supply Chain Dive',   url: 'https://www.supplychaindive.com/feeds/news/' },

  // ── Climate & ESG ──
  { name: 'Carbon Brief',        url: 'https://www.carbonbrief.org/feed' },
  { name: 'CleanTechnica',       url: 'https://cleantechnica.com/feed/' },

  // ── Asia Markets ──
  { name: 'Nikkei Asia',         url: 'https://asia.nikkei.com/rss' },
  { name: 'South China Morning Post', url: 'https://www.scmp.com/rss/91/feed' },
]

// ─── Related assets ───────────────────────────────────────────────────────

export interface RelatedAsset {
  symbol: string
  name:   string
  type:   'stock' | 'crypto' | 'forex' | 'commodity' | 'etf'
}

export const RELATED_ASSETS: Record<string, RelatedAsset[]> = {
  // ── Stocks ──────────────────────────────────────────────────────────────
  AAPL:  [
    { symbol: 'MSFT',    name: 'Microsoft',    type: 'stock' },
    { symbol: 'GOOGL',   name: 'Alphabet',     type: 'stock' },
    { symbol: 'META',    name: 'Meta',         type: 'stock' },
    { symbol: 'QQQ',     name: 'Nasdaq 100',   type: 'etf'   },
    { symbol: 'BTC',     name: 'Bitcoin',      type: 'crypto' },
  ],
  MSFT:  [
    { symbol: 'AAPL',    name: 'Apple',        type: 'stock' },
    { symbol: 'GOOGL',   name: 'Alphabet',     type: 'stock' },
    { symbol: 'AMZN',    name: 'Amazon',       type: 'stock' },
    { symbol: 'NVDA',    name: 'NVIDIA',       type: 'stock' },
    { symbol: 'QQQ',     name: 'Nasdaq 100',   type: 'etf'   },
  ],
  GOOGL: [
    { symbol: 'META',    name: 'Meta',         type: 'stock' },
    { symbol: 'MSFT',    name: 'Microsoft',    type: 'stock' },
    { symbol: 'AMZN',    name: 'Amazon',       type: 'stock' },
    { symbol: 'SNAP',    name: 'Snap',         type: 'stock' },
    { symbol: 'QQQ',     name: 'Nasdaq 100',   type: 'etf'   },
  ],
  AMZN:  [
    { symbol: 'MSFT',    name: 'Microsoft',    type: 'stock' },
    { symbol: 'GOOGL',   name: 'Alphabet',     type: 'stock' },
    { symbol: 'SHOP',    name: 'Shopify',      type: 'stock' },
    { symbol: 'WMT',     name: 'Walmart',      type: 'stock' },
    { symbol: 'QQQ',     name: 'Nasdaq 100',   type: 'etf'   },
  ],
  NVDA:  [
    { symbol: 'AMD',     name: 'AMD',          type: 'stock' },
    { symbol: 'INTC',    name: 'Intel',        type: 'stock' },
    { symbol: 'MSFT',    name: 'Microsoft',    type: 'stock' },
    { symbol: 'AVGO',    name: 'Broadcom',     type: 'stock' },
    { symbol: 'SOXX',    name: 'Semi ETF',     type: 'etf'   },
  ],
  META:  [
    { symbol: 'GOOGL',   name: 'Alphabet',     type: 'stock' },
    { symbol: 'SNAP',    name: 'Snap',         type: 'stock' },
    { symbol: 'PINS',    name: 'Pinterest',    type: 'stock' },
    { symbol: 'TWTR',    name: 'Twitter/X',    type: 'stock' },
    { symbol: 'QQQ',     name: 'Nasdaq 100',   type: 'etf'   },
  ],
  TSLA:  [
    { symbol: 'RIVN',    name: 'Rivian',       type: 'stock' },
    { symbol: 'NIO',     name: 'NIO',          type: 'stock' },
    { symbol: 'F',       name: 'Ford',         type: 'stock' },
    { symbol: 'GM',      name: 'GM',           type: 'stock' },
    { symbol: 'LIT',     name: 'Lithium ETF',  type: 'etf'   },
  ],
  JPM:   [
    { symbol: 'BAC',     name: 'Bank of America', type: 'stock' },
    { symbol: 'GS',      name: 'Goldman Sachs',   type: 'stock' },
    { symbol: 'MS',      name: 'Morgan Stanley',  type: 'stock' },
    { symbol: 'WFC',     name: 'Wells Fargo',     type: 'stock' },
    { symbol: 'XLF',     name: 'Financials ETF',  type: 'etf'   },
  ],
  XOM:   [
    { symbol: 'CVX',     name: 'Chevron',      type: 'stock' },
    { symbol: 'COP',     name: 'ConocoPhillips', type: 'stock' },
    { symbol: 'BP',      name: 'BP',           type: 'stock' },
    { symbol: 'USO',     name: 'Crude Oil',    type: 'commodity' },
    { symbol: 'XLE',     name: 'Energy ETF',   type: 'etf'   },
  ],
  // ── Crypto ──────────────────────────────────────────────────────────────
  BTC:   [
    { symbol: 'ETH',     name: 'Ethereum',     type: 'crypto' },
    { symbol: 'SOL',     name: 'Solana',       type: 'crypto' },
    { symbol: 'BNB',     name: 'BNB',          type: 'crypto' },
    { symbol: 'GLD',     name: 'Gold',         type: 'commodity' },
    { symbol: 'MSTR',    name: 'MicroStrategy', type: 'stock' },
  ],
  ETH:   [
    { symbol: 'BTC',     name: 'Bitcoin',      type: 'crypto' },
    { symbol: 'SOL',     name: 'Solana',       type: 'crypto' },
    { symbol: 'MATIC',   name: 'Polygon',      type: 'crypto' },
    { symbol: 'LINK',    name: 'Chainlink',    type: 'crypto' },
    { symbol: 'AVAX',    name: 'Avalanche',    type: 'crypto' },
  ],
  SOL:   [
    { symbol: 'ETH',     name: 'Ethereum',     type: 'crypto' },
    { symbol: 'AVAX',    name: 'Avalanche',    type: 'crypto' },
    { symbol: 'MATIC',   name: 'Polygon',      type: 'crypto' },
    { symbol: 'BTC',     name: 'Bitcoin',      type: 'crypto' },
    { symbol: 'DOT',     name: 'Polkadot',     type: 'crypto' },
  ],
  BNB:   [
    { symbol: 'BTC',     name: 'Bitcoin',      type: 'crypto' },
    { symbol: 'ETH',     name: 'Ethereum',     type: 'crypto' },
    { symbol: 'XRP',     name: 'XRP',          type: 'crypto' },
    { symbol: 'ADA',     name: 'Cardano',      type: 'crypto' },
    { symbol: 'DOGE',    name: 'Dogecoin',     type: 'crypto' },
  ],
  XRP:   [
    { symbol: 'BTC',     name: 'Bitcoin',      type: 'crypto' },
    { symbol: 'ADA',     name: 'Cardano',      type: 'crypto' },
    { symbol: 'XLM',     name: 'Stellar',      type: 'crypto' },
    { symbol: 'ATOM',    name: 'Cosmos',       type: 'crypto' },
    { symbol: 'DOT',     name: 'Polkadot',     type: 'crypto' },
  ],
  DOGE:  [
    { symbol: 'SHIB',    name: 'Shiba Inu',    type: 'crypto' },
    { symbol: 'BTC',     name: 'Bitcoin',      type: 'crypto' },
    { symbol: 'LTC',     name: 'Litecoin',     type: 'crypto' },
    { symbol: 'BCH',     name: 'Bitcoin Cash', type: 'crypto' },
    { symbol: 'TSLA',    name: 'Tesla',        type: 'stock'  },
  ],
  // ── Forex ────────────────────────────────────────────────────────────────
  'EUR/USD': [
    { symbol: 'GBP/USD', name: 'Cable',        type: 'forex' },
    { symbol: 'USD/CHF', name: 'Swissie',      type: 'forex' },
    { symbol: 'USD/JPY', name: 'Dollar Yen',   type: 'forex' },
    { symbol: 'AUD/USD', name: 'Aussie',       type: 'forex' },
    { symbol: 'GLD',     name: 'Gold',         type: 'commodity' },
  ],
  'GBP/USD': [
    { symbol: 'EUR/USD', name: 'Fiber',        type: 'forex' },
    { symbol: 'EUR/GBP', name: 'EUR/GBP',      type: 'forex' },
    { symbol: 'USD/JPY', name: 'Dollar Yen',   type: 'forex' },
    { symbol: 'AUD/USD', name: 'Aussie',       type: 'forex' },
    { symbol: 'GLD',     name: 'Gold',         type: 'commodity' },
  ],
  'USD/JPY': [
    { symbol: 'EUR/USD', name: 'Fiber',        type: 'forex' },
    { symbol: 'GBP/USD', name: 'Cable',        type: 'forex' },
    { symbol: 'USD/CHF', name: 'Swissie',      type: 'forex' },
    { symbol: 'AUD/USD', name: 'Aussie',       type: 'forex' },
    { symbol: 'NZD/USD', name: 'Kiwi',         type: 'forex' },
  ],
  // ── Commodities ──────────────────────────────────────────────────────────
  GLD:   [
    { symbol: 'SLV',     name: 'Silver',       type: 'commodity' },
    { symbol: 'GDX',     name: 'Gold Miners',  type: 'etf'   },
    { symbol: 'EUR/USD', name: 'EUR/USD',      type: 'forex' },
    { symbol: 'BTC',     name: 'Bitcoin',      type: 'crypto' },
    { symbol: 'TLT',     name: 'Long Bonds',   type: 'etf'   },
  ],
  SLV:   [
    { symbol: 'GLD',     name: 'Gold',         type: 'commodity' },
    { symbol: 'PPLT',    name: 'Platinum',     type: 'commodity' },
    { symbol: 'CPER',    name: 'Copper',       type: 'commodity' },
    { symbol: 'GDX',     name: 'Gold Miners',  type: 'etf'   },
    { symbol: 'XOM',     name: 'Exxon',        type: 'stock' },
  ],
  USO:   [
    { symbol: 'XOM',     name: 'Exxon',        type: 'stock' },
    { symbol: 'CVX',     name: 'Chevron',      type: 'stock' },
    { symbol: 'UNG',     name: 'Natural Gas',  type: 'commodity' },
    { symbol: 'XLE',     name: 'Energy ETF',   type: 'etf'   },
    { symbol: 'EUR/USD', name: 'EUR/USD',      type: 'forex' },
  ],
  // ── ETFs ─────────────────────────────────────────────────────────────────
  SPY:   [
    { symbol: 'QQQ',     name: 'Nasdaq 100',   type: 'etf'   },
    { symbol: 'DIA',     name: 'Dow Jones',    type: 'etf'   },
    { symbol: 'IWM',     name: 'Russell 2000', type: 'etf'   },
    { symbol: 'VTI',     name: 'Total Market', type: 'etf'   },
    { symbol: 'AAPL',    name: 'Apple',        type: 'stock' },
  ],
  QQQ:   [
    { symbol: 'SPY',     name: 'S&P 500',      type: 'etf'   },
    { symbol: 'AAPL',    name: 'Apple',        type: 'stock' },
    { symbol: 'MSFT',    name: 'Microsoft',    type: 'stock' },
    { symbol: 'NVDA',    name: 'NVIDIA',       type: 'stock' },
    { symbol: 'ARKK',    name: 'ARK Innov.',   type: 'etf'   },
  ],
  TLT:   [
    { symbol: 'SPY',     name: 'S&P 500',      type: 'etf'   },
    { symbol: 'GLD',     name: 'Gold',         type: 'commodity' },
    { symbol: 'HYG',     name: 'High Yield',   type: 'etf'   },
    { symbol: 'IEF',     name: '7-10yr Bond',  type: 'etf'   },
    { symbol: 'EUR/USD', name: 'EUR/USD',      type: 'forex' },
  ],
}
