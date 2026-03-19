// Forex client — uses api.frankfurter.app (free, no key required)
//
// A single 7-day range request returns multiple trading days.
// We take the last two dates to compute the real previous-trading-day change
// immediately, without any bootstrapping delay.
//
// Cache: the full {current, previous, currentDate} blob is stored in Redis for
// TTL.FOREX (5 min) so we hit the external API at most once per 5 minutes.

import { cachedFetch } from '@/lib/cache/redis'
import { TTL, DEFAULT_FOREX_PAIRS } from '@/lib/utils/constants'
import { AssetCardData } from '@/lib/utils/types'

// ─── Constants ────────────────────────────────────────────────────────────

const FRANKFURTER_BASE  = 'https://api.frankfurter.app'
const FX_CACHE_KEY      = 'forex:frankfurter:v2'
export const FX_CURRENCIES     = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'CNY']

// ─── Raw API response shapes ──────────────────────────────────────────────

interface FrankfurterRangeResponse {
  base:       string
  start_date: string
  end_date:   string
  rates:      Record<string, Record<string, number>>  // date → currency → rate
}

// ─── Internal types ───────────────────────────────────────────────────────

export interface FxRateSnapshot {
  current:     Record<string, number>  // currency → USD-based rate
  previous:    Record<string, number>  // previous trading day (may be empty on first ever call)
  currentDate: string                  // YYYY-MM-DD of the current rates
  allRates:    Record<string, Record<string, number>>  // date → currency → rate (7-day range)
}

// ─── Internal fetch ───────────────────────────────────────────────────────

async function fetchFxSnapshot(): Promise<FxRateSnapshot> {
  // Fetch the last 7 calendar days — always yields ≥2 trading days
  const now       = new Date()
  const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000)
  const startStr  = startDate.toISOString().slice(0, 10)
  const endStr    = now.toISOString().slice(0, 10)

  const url = `${FRANKFURTER_BASE}/${startStr}..${endStr}?from=USD&to=${FX_CURRENCIES.join(',')}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`Frankfurter API → HTTP ${res.status}`)

  const data   = await res.json() as FrankfurterRangeResponse
  const dates  = Object.keys(data.rates).sort()

  if (dates.length === 0) throw new Error('Frankfurter returned no date entries')

  const currentDate = dates[dates.length - 1]
  const prevDate    = dates.length >= 2 ? dates[dates.length - 2] : null

  return {
    current:     data.rates[currentDate],
    previous:    prevDate ? data.rates[prevDate] : {},
    currentDate,
    allRates:    data.rates,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Returns the raw FxRateSnapshot (all 7-day rate data) for use in the
 * currency strength meter and other consumers that need cross-rate history.
 */
export async function getForexSnapshot(): Promise<FxRateSnapshot> {
  return cachedFetch<FxRateSnapshot>(FX_CACHE_KEY, TTL.FOREX, fetchFxSnapshot)
}

/**
 * Returns AssetCardData for all DEFAULT_FOREX_PAIRS with real previous-
 * trading-day 24h change.  Rates come from api.frankfurter.app (free, no key).
 */
export async function getForexCards(): Promise<AssetCardData[]> {
  const snapshot = await cachedFetch<FxRateSnapshot>(FX_CACHE_KEY, TTL.FOREX, fetchFxSnapshot)

  const { current, previous, allRates, currentDate } = snapshot
  const hasPrev    = Object.keys(previous).length > 0
  const allDayRates = Object.values(allRates)  // array of {currency → raw rate} per day

  const cards: AssetCardData[] = []

  for (const pair of DEFAULT_FOREX_PAIRS) {
    const { symbol, pair: label, base, quote, usdIsBase } = pair

    // Derive spot price (USD is always the base in Frankfurter)
    let price: number
    if (usdIsBase) {
      // USD/JPY → rates['JPY'] = how many JPY per 1 USD
      const rate = current[quote]
      if (!rate) continue
      price = rate
    } else {
      // EUR/USD → rates['EUR'] = how many EUR per 1 USD → invert
      const rate = current[base]
      if (!rate) continue
      price = 1 / rate
    }

    // 24h change against previous trading day
    let change        = 0
    let changePercent = 0
    if (hasPrev) {
      let prevPrice: number
      if (usdIsBase) {
        prevPrice = previous[quote] ?? price
      } else {
        const prevRate = previous[base]
        prevPrice = prevRate ? 1 / prevRate : price
      }
      change        = price - prevPrice
      changePercent = prevPrice !== 0 ? (change / prevPrice) * 100 : 0
    }

    // Compute real 7-day high/low from all fetched trading days
    const prices7d = allDayRates
      .map((dayRates) => {
        if (usdIsBase) {
          const r = dayRates[quote]; return r ? r : null
        } else {
          const r = dayRates[base];  return r ? 1 / r : null
        }
      })
      .filter((v): v is number => v !== null)

    const high7d = prices7d.length > 0 ? Math.max(...prices7d) : price * 1.002
    const low7d  = prices7d.length > 0 ? Math.min(...prices7d) : price * 0.998

    cards.push({
      symbol,
      name:          label,
      type:          'forex',
      price:         parseFloat(price.toFixed(6)),
      change:        parseFloat(change.toFixed(6)),
      changePercent: parseFloat(changePercent.toFixed(4)),
      currency:      quote,
      open:          price - change,
      high:          parseFloat(high7d.toFixed(6)),
      low:           parseFloat(low7d.toFixed(6)),
      dataAsOf:      currentDate,  // ECB publication date (YYYY-MM-DD)
    })
  }

  return cards
}
