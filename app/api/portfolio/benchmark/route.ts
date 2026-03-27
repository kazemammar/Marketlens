import { NextResponse }        from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { withRateLimit }        from '@/lib/utils/rate-limit'
import { redis }                from '@/lib/cache/redis'
import { getYahooHistory, toYahooSymbol } from '@/lib/api/yahoo'
import { noCacheHeaders } from '@/lib/utils/cache-headers'

const NO_CACHE = noCacheHeaders()

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortfolioStats {
  totalReturn:          number  // all-time from cost basis
  totalReturnAmt:       number
  totalCost:            number
  totalValue:           number  // latest market value
  positionsWithCost:    number
  totalPositions:       number
}

export interface BenchmarkPayload {
  series: Array<{
    date:            string
    spyReturn:       number   // cumulative % from range start
    portfolioReturn: number   // cumulative % from range start
  }>
  portfolio:            PortfolioStats
  spyReturn:            number   // SPY total % over the range
  portfolioRangeReturn: number   // portfolio total % over the range
  range:                string
  generatedAt:          number
}

type Range = '1mo' | '3mo' | '6mo' | '1y'
const VALID_RANGES: Range[] = ['1mo', '3mo', '6mo', '1y']

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401, headers: NO_CACHE })

  const url     = new URL(req.url)
  const range   = (VALID_RANGES.includes(url.searchParams.get('range') as Range)
    ? url.searchParams.get('range')
    : '3mo') as Range
  const benchmark = url.searchParams.get('benchmark') === 'btc' ? 'btc' : 'spy'
  const refresh = url.searchParams.get('refresh') === 'true'

  const benchmarkSymbol = benchmark === 'btc' ? 'BTC-USD' : 'SPY'
  const benchmarkLabel  = benchmark === 'btc' ? 'BTC' : 'SPY'

  // Cache
  const cacheKey = `portfolio:benchmark:v2:${user.id}:${range}:${benchmark}`
  if (!refresh) {
    try {
      const cached = await redis.get<BenchmarkPayload>(cacheKey)
      if (cached) return NextResponse.json(cached, { headers: NO_CACHE })
    } catch { /* fallthrough */ }
  }

  // Fetch user positions
  const { data: positions } = await supabase.from('portfolio_positions')
    .select('symbol, asset_type, direction, quantity, avg_cost')
    .eq('user_id', user.id)

  const rows: Array<{
    symbol: string; asset_type: string; direction: string;
    quantity: number | null; avg_cost: number | null
  }> = positions ?? []

  // All positions with qty + cost
  const costPositions = rows.filter(
    (p) => p.quantity != null && p.avg_cost != null && p.quantity > 0,
  )

  // Total cost basis (constant — for all-time return)
  const totalCostBasis = costPositions.reduce(
    (sum, p) => sum + p.quantity! * p.avg_cost!,
    0,
  )

  // Build fetch list: SPY first, then each position
  type PositionEntry = {
    symbol:      string
    yahooSymbol: string
    qty:         number
    cost:        number
    direction:   'long' | 'short'
    isSpy:       boolean
  }

  const fetchList: PositionEntry[] = [
    { symbol: benchmarkLabel, yahooSymbol: benchmarkSymbol, qty: 0, cost: 0, direction: 'long', isSpy: true },
    ...costPositions.map((p) => ({
      symbol:      p.symbol,
      yahooSymbol: toYahooSymbol(p.symbol, p.asset_type),
      qty:         p.quantity!,
      cost:        p.avg_cost!,
      direction:   (p.direction === 'short' ? 'short' : 'long') as 'long' | 'short',
      isSpy:       false,
    })),
  ]

  // Fetch all histories in parallel
  const historyResults = await Promise.allSettled(
    fetchList.map((s) => getYahooHistory(s.yahooSymbol, range)),
  )

  // Build symbol → date → close map
  const priceByDate: Record<string, Record<string, number>> = {}
  fetchList.forEach((s, i) => {
    const r = historyResults[i]
    if (r.status !== 'fulfilled') return
    const map: Record<string, number> = {}
    r.value.forEach((d) => { map[d.date] = d.close })
    priceByDate[s.symbol] = map
  })

  // Use benchmark dates as the canonical trading-day spine
  const spyDates = historyResults[0].status === 'fulfilled'
    ? historyResults[0].value.map((d) => d.date)
    : []

  const portfolioPositions = fetchList.filter((s) => !s.isSpy)

  // Carry-forward state: last known price per symbol
  const lastKnown: Record<string, number> = {}

  // First-day portfolio value (for range-relative return)
  let firstPortfolioValue = 0

  // Build series
  const series = spyDates.map((date, idx) => {
    // Benchmark cumulative return
    const spyDayMap = priceByDate[benchmarkLabel] ?? {}
    const spyFirst  = spyDayMap[spyDates[0]] ?? 1
    const spyClose  = spyDayMap[date] ?? 0
    const spyCumReturn = spyFirst > 0 ? ((spyClose - spyFirst) / spyFirst) * 100 : 0

    // Portfolio value on this date (carry forward missing prices)
    let portfolioValue = 0
    for (const p of portfolioPositions) {
      const dayMap = priceByDate[p.symbol]
      if (!dayMap) continue
      const close = dayMap[date] ?? lastKnown[p.symbol] ?? 0
      if (close > 0) lastKnown[p.symbol] = close
      if (!close) continue

      if (p.direction === 'long') {
        portfolioValue += p.qty * close
      } else {
        const costBasis   = p.qty * p.cost
        const marketValue = p.qty * close
        portfolioValue += costBasis + (costBasis - marketValue)
      }
    }

    if (idx === 0) firstPortfolioValue = portfolioValue

    const portfolioCumReturn = firstPortfolioValue > 0
      ? ((portfolioValue - firstPortfolioValue) / firstPortfolioValue) * 100
      : 0

    return {
      date,
      spyReturn:       parseFloat(spyCumReturn.toFixed(4)),
      portfolioReturn: parseFloat(portfolioCumReturn.toFixed(4)),
      portfolioValue:  portfolioValue,
    }
  })

  // All-time return from cost basis
  const latestValue    = series[series.length - 1]?.portfolioValue ?? 0
  const allTimeReturn  = totalCostBasis > 0
    ? ((latestValue - totalCostBasis) / totalCostBasis) * 100
    : 0
  const allTimeReturnAmt = latestValue - totalCostBasis

  const spyReturn            = series[series.length - 1]?.spyReturn       ?? 0
  const portfolioRangeReturn = series[series.length - 1]?.portfolioReturn ?? 0

  const payload: BenchmarkPayload = {
    series: series.map(({ date, spyReturn, portfolioReturn }) => ({ date, spyReturn, portfolioReturn })),
    portfolio: {
      totalReturn:       parseFloat(allTimeReturn.toFixed(4)),
      totalReturnAmt:    parseFloat(allTimeReturnAmt.toFixed(2)),
      totalCost:         parseFloat(totalCostBasis.toFixed(2)),
      totalValue:        parseFloat(latestValue.toFixed(2)),
      positionsWithCost: costPositions.length,
      totalPositions:    rows.length,
    },
    spyReturn:            parseFloat(spyReturn.toFixed(4)),
    portfolioRangeReturn: parseFloat(portfolioRangeReturn.toFixed(4)),
    range,
    generatedAt: Date.now(),
  }

  redis.set(cacheKey, payload, { ex: 1800 }).catch(() => {})

  return NextResponse.json(payload, { headers: NO_CACHE })
}
