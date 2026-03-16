// Forex client — uses open.er-api.com (free tier, no API key required)
// Provides currency pair rates with 1-hour granularity.
// Note: 24h change is approximated by caching the previous hour's rates.

import { cachedFetch, cacheKey, redis } from '@/lib/cache/redis'
import { TTL, EXCHANGE_RATE_BASE_URL, DEFAULT_FOREX_PAIRS } from '@/lib/utils/constants'
import { AssetCardData } from '@/lib/utils/types'

// ─── Raw API response ─────────────────────────────────────────────────────

interface ExchangeRateResponse {
  result:       string
  base_code:    string
  time_last_update_unix: number
  rates:        Record<string, number>
}

// ─── Internal fetch ───────────────────────────────────────────────────────

async function fetchUsdRates(): Promise<ExchangeRateResponse> {
  const res = await fetch(`${EXCHANGE_RATE_BASE_URL}/USD`, {
    next: { revalidate: 0 },
  })
  if (!res.ok) throw new Error(`ExchangeRate API → HTTP ${res.status}`)
  const data = await res.json() as ExchangeRateResponse
  if (data.result !== 'success') throw new Error('ExchangeRate API returned non-success result')
  return data
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Returns AssetCardData for all DEFAULT_FOREX_PAIRS.
 * Rates come from open.er-api.com (free, no key).
 * Daily change is estimated by comparing with the previously cached rate.
 */
export async function getForexCards(): Promise<AssetCardData[]> {
  // Snapshot previous rates before we overwrite them (for change calculation)
  const prevKey = 'forex:usd-rates:prev'
  let prevRates: Record<string, number> = {}
  try {
    const stored = await redis.get<Record<string, number>>(prevKey)
    prevRates = stored ?? {}
  } catch {
    // Redis unavailable — proceed without change data
  }

  // Fetch fresh rates (cached for TTL.FOREX seconds)
  const data = await cachedFetch(
    cacheKey.forex('USD-ALL'),
    TTL.FOREX,
    fetchUsdRates,
  )

  // Persist current rates as the new "previous" snapshot (1h TTL)
  redis.set(prevKey, data.rates, { ex: 3_600 }).catch(() => {})

  const cards: AssetCardData[] = []

  for (const pair of DEFAULT_FOREX_PAIRS) {
    const { symbol, pair: label, base, quote, usdIsBase } = pair

    // Derive the spot price from the USD-base rate table
    let price: number
    if (usdIsBase) {
      // USD/JPY — how many JPY per 1 USD
      const rate = data.rates[quote]
      if (!rate) continue
      price = rate
    } else {
      // EUR/USD — how many USD per 1 EUR → 1 / (USD per EUR)
      const rate = data.rates[base]
      if (!rate) continue
      price = 1 / rate
    }

    // Estimate 24h change from previous cached snapshot
    let prevPrice = price
    if (usdIsBase) {
      prevPrice = prevRates[quote] ?? price
    } else {
      const prevRate = prevRates[base]
      prevPrice = prevRate ? 1 / prevRate : price
    }

    const change        = price - prevPrice
    const changePercent = prevPrice !== 0 ? (change / prevPrice) * 100 : 0

    // Synthetic OHLC for the sparkline (±0.1% band around current price)
    const band = price * 0.001
    cards.push({
      symbol,
      name:          label,
      type:          'forex',
      price:         parseFloat(price.toFixed(6)),
      change:        parseFloat(change.toFixed(6)),
      changePercent: parseFloat(changePercent.toFixed(4)),
      currency:      quote,
      open:          price - band,
      high:          price + band * 2,
      low:           price - band * 2,
    })
  }

  return cards
}
