import { NextResponse } from 'next/server'
import { getForexSnapshot, FX_CURRENCIES } from '@/lib/api/forex'
import { redis } from '@/lib/cache/redis'
import { cacheHeaders } from '@/lib/utils/cache-headers'
import { withRateLimit } from '@/lib/utils/rate-limit'

const EDGE_HEADERS = cacheHeaders(300)

export const dynamic = 'force-dynamic'

const CACHE_KEY = 'forex:strength:v1'
const CACHE_TTL = 300  // 5 minutes

// All currencies including USD (which is the Frankfurter base)
const ALL_CURRENCIES = ['USD', ...FX_CURRENCIES]

export interface CurrencyStrength {
  currency: string
  score: number
  rank: number
  trend: Array<{ date: string; score: number }>
}

/**
 * Get the cross-rate between base and quote given a rates object where
 * each value is "X currency units per 1 USD".
 * Returns null if data is insufficient.
 */
function getCrossRate(
  rates: Record<string, number>,
  base: string,
  quote: string,
): number | null {
  if (base === quote) return 1
  // USD as base: rates[quote] = quote per 1 USD
  if (base === 'USD') return rates[quote] ?? null
  // USD as quote: 1/rates[base] = USD per 1 base
  if (quote === 'USD') return rates[base] ? 1 / rates[base] : null
  // Cross rate: (quote per USD) / (base per USD) = quote per 1 base
  if (!rates[base] || !rates[quote]) return null
  return rates[quote] / rates[base]
}

function computeStrengths(allRates: Record<string, Record<string, number>>): CurrencyStrength[] {
  const dates = Object.keys(allRates).sort()
  if (dates.length < 2) return []

  const baseRates = allRates[dates[0]]
  const dailyScores: Record<string, Array<{ date: string; score: number }>> = {}
  for (const ccy of ALL_CURRENCIES) dailyScores[ccy] = []

  for (const date of dates) {
    const dayRates = allRates[date]
    for (const ccy of ALL_CURRENCIES) {
      let totalChange = 0
      let count = 0
      for (const other of ALL_CURRENCIES) {
        if (other === ccy) continue
        const crossRateNow  = getCrossRate(dayRates, ccy, other)
        const crossRateBase = getCrossRate(baseRates, ccy, other)
        if (crossRateBase !== null && crossRateNow !== null && crossRateBase !== 0) {
          totalChange += (crossRateNow / crossRateBase - 1) * 100
          count++
        }
      }
      dailyScores[ccy].push({ date, score: count > 0 ? totalChange / count : 0 })
    }
  }

  const strengths: CurrencyStrength[] = ALL_CURRENCIES.map(ccy => ({
    currency: ccy,
    score: dailyScores[ccy][dailyScores[ccy].length - 1]?.score ?? 0,
    rank: 0,
    trend: dailyScores[ccy],
  }))

  strengths.sort((a, b) => b.score - a.score)
  strengths.forEach((s, i) => { s.rank = i + 1 })
  return strengths
}

export async function GET(req: Request) {
  const limited = withRateLimit(req, 60)
  if (limited) return limited

  try {
    const cached = await redis.get<{ strengths: CurrencyStrength[]; asOf: string }>(CACHE_KEY)
    if (cached) return NextResponse.json(cached, { headers: EDGE_HEADERS })
  } catch { /* fall through to live fetch */ }

  try {
    const snapshot = await getForexSnapshot()
    if (!snapshot?.allRates) {
      return NextResponse.json({ strengths: [], asOf: new Date().toISOString() }, { headers: EDGE_HEADERS })
    }

    const strengths = computeStrengths(snapshot.allRates)
    const result = { strengths, asOf: new Date().toISOString() }

    redis.set(CACHE_KEY, result, { ex: CACHE_TTL }).catch(() => {})
    return NextResponse.json(result, { headers: EDGE_HEADERS })
  } catch (err) {
    console.error('[forex/strength]', err)
    return NextResponse.json({ strengths: [], asOf: new Date().toISOString() }, { headers: EDGE_HEADERS })
  }
}
