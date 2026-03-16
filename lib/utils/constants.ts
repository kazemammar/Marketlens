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
  QUOTE:           30,        // live price — 30 s
  SEARCH:          300,       // search results — 5 min
  NEWS:            300,       // news articles — 5 min
  SENTIMENT:       1_800,     // AI sentiment — 30 min
  FINANCIALS:      86_400,    // financials — 24 h
  RECOMMENDATIONS: 3_600,     // analyst recs — 1 h
  CRYPTO_MARKETS:  60,        // crypto list — 1 min
  CRYPTO_DETAIL:   60,        // single coin — 1 min
  FOREX:           30,        // forex rate — 30 s
  COMMODITIES:     60,        // commodities — 1 min
  PROFILE:         86_400,    // company profile — 24 h
  RATIOS:          86_400,    // financial ratios — 24 h
  RSS:             300,       // RSS feeds — 5 min
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
export const EXCHANGE_RATE_BASE_URL = 'https://open.er-api.com/v6/latest'

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
  // Financial news
  { name: 'Reuters Business',    url: 'https://feeds.reuters.com/reuters/businessNews' },
  { name: 'Reuters World',       url: 'https://feeds.reuters.com/Reuters/worldNews' },
  { name: 'MarketWatch',         url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
  { name: 'Yahoo Finance',       url: 'https://finance.yahoo.com/news/rssindex' },
  { name: 'Seeking Alpha',       url: 'https://seekingalpha.com/market_currents.xml' },
  { name: 'Investopedia',        url: 'https://www.investopedia.com/feedbuilder/feed/getfeed?feedName=rss_headline' },
  // CNBC
  { name: 'CNBC Top News',       url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114' },
  { name: 'CNBC World Markets',  url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839135' },
  { name: 'CNBC World Economy',  url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362' },
  // World news (good for geopolitical intelligence)
  { name: 'BBC World',           url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'Al Jazeera',          url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  // Energy & commodities
  { name: 'OilPrice.com',        url: 'https://oilprice.com/rss/main' },
  // Defense & security
  { name: 'Defense One',         url: 'https://www.defenseone.com/rss/' },
  // Breaking market news
  { name: 'Benzinga',            url: 'https://www.benzinga.com/feed' },
]
