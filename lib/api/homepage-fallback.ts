/**
 * lib/api/homepage-fallback.ts
 * ────────────────────────────
 * Static fallback data for the homepage when both Redis and live APIs
 * are unavailable (cold start, outage, first deploy).
 *
 * Uses realistic placeholder prices that won't confuse users — all are
 * set to 0% change so no green/red signals appear.
 */

import type { HomepageData } from './homepage'
import type { AssetCardData } from '@/lib/utils/types'

const FALLBACK_STOCKS: AssetCardData[] = [
  { symbol: 'AAPL',  name: 'Apple Inc.',       type: 'stock', price: 0, change: 0, changePercent: 0, currency: 'USD', open: 0, high: 0, low: 0 },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',  type: 'stock', price: 0, change: 0, changePercent: 0, currency: 'USD', open: 0, high: 0, low: 0 },
  { symbol: 'NVDA',  name: 'NVIDIA Corp.',     type: 'stock', price: 0, change: 0, changePercent: 0, currency: 'USD', open: 0, high: 0, low: 0 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',    type: 'stock', price: 0, change: 0, changePercent: 0, currency: 'USD', open: 0, high: 0, low: 0 },
  { symbol: 'AMZN',  name: 'Amazon.com',       type: 'stock', price: 0, change: 0, changePercent: 0, currency: 'USD', open: 0, high: 0, low: 0 },
  { symbol: 'META',  name: 'Meta Platforms',   type: 'stock', price: 0, change: 0, changePercent: 0, currency: 'USD', open: 0, high: 0, low: 0 },
  { symbol: 'TSLA',  name: 'Tesla Inc.',       type: 'stock', price: 0, change: 0, changePercent: 0, currency: 'USD', open: 0, high: 0, low: 0 },
  { symbol: 'JPM',   name: 'JPMorgan Chase',   type: 'stock', price: 0, change: 0, changePercent: 0, currency: 'USD', open: 0, high: 0, low: 0 },
  { symbol: 'V',     name: 'Visa Inc.',        type: 'stock', price: 0, change: 0, changePercent: 0, currency: 'USD', open: 0, high: 0, low: 0 },
  { symbol: 'UNH',   name: 'UnitedHealth',     type: 'stock', price: 0, change: 0, changePercent: 0, currency: 'USD', open: 0, high: 0, low: 0 },
  { symbol: 'XOM',   name: 'Exxon Mobil',      type: 'stock', price: 0, change: 0, changePercent: 0, currency: 'USD', open: 0, high: 0, low: 0 },
  { symbol: 'JNJ',   name: 'Johnson & Johnson', type: 'stock', price: 0, change: 0, changePercent: 0, currency: 'USD', open: 0, high: 0, low: 0 },
]

export const HOMEPAGE_FALLBACK: HomepageData = {
  stocks:         FALLBACK_STOCKS,
  commodityStrip: [],
  tickerQuotes:   {},
  marketRadar:    null,
  cachedAt:       0,
}
