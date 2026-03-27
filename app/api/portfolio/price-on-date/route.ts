import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit }             from '@/lib/utils/rate-limit'
import { redis }                     from '@/lib/cache/redis'
import { getYahooHistory, toYahooSymbol } from '@/lib/api/yahoo'
import { noCacheHeaders } from '@/lib/utils/cache-headers'


const NO_CACHE = noCacheHeaders()
// ─── Helpers ──────────────────────────────────────────────────────────────────

type YahooRange = '1mo' | '3mo' | '6mo' | '1y'

/** Pick the shortest Yahoo range that covers a given past date */
function rangeForDate(targetDate: Date): YahooRange {
  const msAgo = Date.now() - targetDate.getTime()
  const days  = msAgo / 86_400_000
  if (days <=  35) return '1mo'
  if (days <=  95) return '3mo'
  if (days <= 185) return '6mo'
  return '1y'
}

/** Approximate days-ago values for window mode */
const AGO_DAYS: Record<string, number> = {
  '1w':  7,
  '1mo': 30,
  '3mo': 90,
  '6mo': 180,
  '1y':  365,
  '2y':  365, // Yahoo free tier caps at 1y; '2y' treated as 1y
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const limited = withRateLimit(req, 30)
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const rawSymbol = (searchParams.get('symbol') ?? '').trim().toUpperCase()
  const assetType = (searchParams.get('type')   ?? 'stock').trim().toLowerCase()
  const dateParam = searchParams.get('date')   // "2025-01-15"
  const agoParam  = searchParams.get('ago')    // "3mo"

  if (!rawSymbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400, headers: NO_CACHE })
  }

  const yahooSymbol = toYahooSymbol(rawSymbol, assetType)

  // ── Exact-date mode ──────────────────────────────────────────────────────────
  if (dateParam) {
    const targetDate = new Date(dateParam + 'T12:00:00Z')
    if (isNaN(targetDate.getTime()) || targetDate >= new Date()) {
      return NextResponse.json({ error: 'date must be a valid past date (YYYY-MM-DD)' }, { status: 400 })
    }

    const cacheKey = `priceOnDate:${yahooSymbol}:${dateParam}`
    try {
      const cached = await redis.get(cacheKey)
      if (cached) return NextResponse.json(cached, { headers: NO_CACHE })
    } catch { /* fallthrough */ }

    const range   = rangeForDate(targetDate)
    const history = await getYahooHistory(yahooSymbol, range)

    if (!history.length) {
      return NextResponse.json({ error: 'No historical data available', symbol: rawSymbol, date: dateParam }, { status: 404, headers: NO_CACHE })
    }

    // Find exact match or nearest trading day on or before the target
    const targetStr = dateParam
    let best = history[0]
    for (const day of history) {
      if (day.date <= targetStr) best = day
      else break
    }

    const payload = {
      symbol:  rawSymbol,
      date:    best.date,
      price:   best.close,
      source:  'yahoo' as const,
      exact:   best.date === targetStr,
    }

    redis.set(cacheKey, payload, { ex: 86_400 }).catch(() => {})
    return NextResponse.json(payload, { headers: NO_CACHE })
  }

  // ── Window/ago mode ──────────────────────────────────────────────────────────
  if (agoParam) {
    const agoDays = AGO_DAYS[agoParam]
    if (!agoDays) {
      return NextResponse.json({ error: 'ago must be one of: 1w, 1mo, 3mo, 6mo, 1y, 2y' }, { status: 400, headers: NO_CACHE })
    }

    const cacheKey = `priceOnDate:${yahooSymbol}:ago:${agoParam}`
    try {
      const cached = await redis.get(cacheKey)
      if (cached) return NextResponse.json(cached, { headers: NO_CACHE })
    } catch { /* fallthrough */ }

    const targetDate = new Date(Date.now() - agoDays * 86_400_000)
    const targetStr  = targetDate.toISOString().slice(0, 10)
    const range      = rangeForDate(targetDate)
    const history    = await getYahooHistory(yahooSymbol, range)

    if (!history.length) {
      return NextResponse.json({ error: 'No historical data available', symbol: rawSymbol }, { status: 404, headers: NO_CACHE })
    }

    // Take a ±5 day window around the target date
    const windowFrom = new Date(targetDate.getTime() - 5 * 86_400_000).toISOString().slice(0, 10)
    const windowTo   = new Date(targetDate.getTime() + 5 * 86_400_000).toISOString().slice(0, 10)
    const window     = history.filter((d) => d.date >= windowFrom && d.date <= windowTo)

    const days = window.length > 0 ? window : [history.reduce((best, d) => Math.abs(new Date(d.date).getTime() - targetDate.getTime()) < Math.abs(new Date(best.date).getTime() - targetDate.getTime()) ? d : best)]

    const avgPrice = days.reduce((sum, d) => sum + d.close, 0) / days.length

    const payload = {
      symbol:       rawSymbol,
      dateRange:    { from: windowFrom, to: windowTo, target: targetStr },
      avgPrice:     parseFloat(avgPrice.toFixed(4)),
      source:       'yahoo-avg' as const,
      daysAveraged: days.length,
    }

    redis.set(cacheKey, payload, { ex: 86_400 }).catch(() => {})
    return NextResponse.json(payload, { headers: NO_CACHE })
  }

  return NextResponse.json({ error: 'Either date or ago param is required' }, { status: 400, headers: NO_CACHE })
}
