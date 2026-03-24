import { MetadataRoute } from 'next'
import { DEFAULT_STOCKS, DEFAULT_ETFS, DEFAULT_COMMODITIES, DEFAULT_FOREX_PAIRS, CRYPTO_SYMBOL_TO_CG_ID } from '@/lib/utils/constants'

const BASE_URL = 'https://marketlens.live'

// Additional stocks beyond DEFAULT_STOCKS for comprehensive SEO coverage
const EXTENDED_STOCKS = [
  // Technology
  'AVGO', 'ORCL', 'CRM', 'ADBE', 'AMD', 'CSCO', 'QCOM', 'INTC', 'NOW', 'PLTR',
  'PANW', 'SNPS', 'CDNS', 'MRVL', 'KLAC', 'LRCX', 'AMAT', 'MU', 'ADI', 'FTNT',
  'WDAY', 'TEAM', 'CRWD', 'DDOG', 'ZS', 'HUBS',
  // Finance
  'BAC', 'GS', 'MS', 'BLK', 'SCHW', 'C', 'AXP', 'BRK.B', 'WFC', 'SPGI',
  'ICE', 'CME', 'PGR', 'MMC', 'COF', 'PYPL',
  // Healthcare
  'MRK', 'TMO', 'ABT', 'PFE', 'AMGN', 'MDT', 'ISRG', 'DHR', 'BMY', 'GILD',
  'CVS', 'ABBV', 'VRTX', 'REGN', 'ZTS', 'BSX', 'SYK',
  // Consumer
  'AMZN', 'TSLA', 'NKE', 'MCD', 'LOW', 'SBUX', 'TJX', 'BKNG', 'CMG',
  'COST', 'WMT', 'HD', 'NFLX', 'DIS', 'GOOGL', 'META',
  // Industrial
  'CAT', 'GE', 'HON', 'UPS', 'BA', 'RTX', 'LMT', 'DE', 'UNP', 'FDX', 'WM',
  // Energy
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'OXY',
  // ETF proxies
  'SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'GLD', 'TLT',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,                    lastModified: new Date(), changeFrequency: 'always', priority: 1.0 },
    { url: `${BASE_URL}/stocks`,        lastModified: new Date(), changeFrequency: 'daily',  priority: 0.9 },
    { url: `${BASE_URL}/crypto`,        lastModified: new Date(), changeFrequency: 'daily',  priority: 0.9 },
    { url: `${BASE_URL}/forex`,         lastModified: new Date(), changeFrequency: 'daily',  priority: 0.9 },
    { url: `${BASE_URL}/commodities`,   lastModified: new Date(), changeFrequency: 'daily',  priority: 0.9 },
    { url: `${BASE_URL}/etf`,           lastModified: new Date(), changeFrequency: 'daily',  priority: 0.9 },
    { url: `${BASE_URL}/news`,          lastModified: new Date(), changeFrequency: 'hourly', priority: 0.8 },
    { url: `${BASE_URL}/economics`,     lastModified: new Date(), changeFrequency: 'daily',  priority: 0.7 },
  ]

  // All stock symbols (deduplicated union)
  const allStocks = [...new Set([...DEFAULT_STOCKS, ...EXTENDED_STOCKS])]
  const stockPages: MetadataRoute.Sitemap = allStocks.map((sym) => ({
    url:             `${BASE_URL}/asset/stock/${sym}`,
    lastModified:    new Date(),
    changeFrequency: 'hourly',
    priority:        0.7,
  }))

  // All crypto symbols from CRYPTO_SYMBOL_TO_CG_ID keys
  const cryptoPages: MetadataRoute.Sitemap = Object.keys(CRYPTO_SYMBOL_TO_CG_ID).map((sym) => ({
    url:             `${BASE_URL}/asset/crypto/${sym}`,
    lastModified:    new Date(),
    changeFrequency: 'hourly',
    priority:        0.7,
  }))

  // Forex pairs (URL-encoded)
  const forexPages: MetadataRoute.Sitemap = DEFAULT_FOREX_PAIRS.map((p) => ({
    url:             `${BASE_URL}/asset/forex/${encodeURIComponent(p.symbol)}`,
    lastModified:    new Date(),
    changeFrequency: 'hourly',
    priority:        0.7,
  }))

  // Commodities
  const commodityPages: MetadataRoute.Sitemap = DEFAULT_COMMODITIES.map((c) => ({
    url:             `${BASE_URL}/asset/commodity/${encodeURIComponent(c.symbol)}`,
    lastModified:    new Date(),
    changeFrequency: 'hourly',
    priority:        0.7,
  }))

  // ETFs
  const etfPages: MetadataRoute.Sitemap = DEFAULT_ETFS.map((sym) => ({
    url:             `${BASE_URL}/asset/etf/${sym}`,
    lastModified:    new Date(),
    changeFrequency: 'hourly',
    priority:        0.7,
  }))

  return [...staticPages, ...stockPages, ...cryptoPages, ...forexPages, ...commodityPages, ...etfPages]
}
