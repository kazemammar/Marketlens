import { MetadataRoute } from 'next'

const BASE_URL = 'https://marketlens.live'

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

  const popularAssets = [
    // Stocks
    'stock/AAPL', 'stock/MSFT', 'stock/GOOGL', 'stock/AMZN', 'stock/NVDA',
    'stock/META', 'stock/TSLA', 'stock/BRK.B', 'stock/JPM', 'stock/V',
    'stock/UNH', 'stock/XOM', 'stock/JNJ', 'stock/WMT', 'stock/PG',
    // Crypto
    'crypto/BTC', 'crypto/ETH', 'crypto/SOL', 'crypto/BNB', 'crypto/XRP',
    // Forex
    'forex/EUR%2FUSD', 'forex/USD%2FJPY', 'forex/GBP%2FUSD',
    'forex/USD%2FCHF', 'forex/AUD%2FUSD', 'forex/USD%2FCAD',
    // Commodities
    'commodity/GLD', 'commodity/USO', 'commodity/UNG',
    'commodity/WEAT', 'commodity/CORN', 'commodity/SLV',
    // ETFs
    'etf/SPY', 'etf/QQQ', 'etf/TLT', 'etf/IWM', 'etf/GLD', 'etf/VTI',
  ]

  const assetPages: MetadataRoute.Sitemap = popularAssets.map((path) => ({
    url:             `${BASE_URL}/asset/${path}`,
    lastModified:    new Date(),
    changeFrequency: 'hourly',
    priority:        0.8,
  }))

  return [...staticPages, ...assetPages]
}
