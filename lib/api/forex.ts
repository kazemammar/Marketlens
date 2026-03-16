// Forex client — uses open.er-api.com (free tier, no API key required)
// Provides currency pair rates with ~24h change calculation.
//
// 24h change strategy:
//   "forex:baseline" is written ONCE with NX (only-if-not-exists) and a 25h TTL.
//   Every request compares current rates against that baseline.
//   After 25h the key expires naturally; the next request seeds a fresh baseline
//   (change shows 0% for the first request of each new window, then diverges).
const BASELINE_KEY = 'forex:baseline'
const BASELINE_TTL = 25 * 3_600   // 25 h

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
  // Read the 25h baseline (may be null on very first call)
  let prevRates: Record<string, number> = {}
  let hasPrev = false
  try {
    const stored = await redis.get<Record<string, number>>(BASELINE_KEY)
    if (stored) { prevRates = stored; hasPrev = true }
  } catch {
    // Redis unavailable — proceed without change data
  }

  // Fetch fresh rates (cached for TTL.FOREX seconds)
  const data = await cachedFetch(
    cacheKey.forex('USD-ALL'),
    TTL.FOREX,
    fetchUsdRates,
  )

  // Seed baseline only if it doesn't exist yet (NX).
  // Once set, it lives for 25h and is never overwritten — this is the stable
  // comparison point for daily change.
  if (!hasPrev) {
    redis.set(BASELINE_KEY, data.rates, { ex: BASELINE_TTL, nx: true }).catch(() => {})
  }

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

    // 24h change against baseline (0 if no baseline available yet)
    let change = 0
    let changePercent = 0
    if (hasPrev) {
      let prevPrice = price
      if (usdIsBase) {
        prevPrice = prevRates[quote] ?? price
      } else {
        const prevRate = prevRates[base]
        prevPrice = prevRate ? 1 / prevRate : price
      }
      change        = price - prevPrice
      changePercent = prevPrice !== 0 ? (change / prevPrice) * 100 : 0
    }

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
