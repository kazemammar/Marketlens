import { NextResponse }        from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { withRateLimit }        from '@/lib/utils/rate-limit'
import { redis }                from '@/lib/cache/redis'
import { getYahooHistory }      from '@/lib/api/yahoo'
import { getQuote }             from '@/lib/api/finnhub'
import { getYahooQuote }        from '@/lib/api/yahoo'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortfolioStats {
  totalReturn:       number
  totalReturnAmt:    number
  totalCost:         number
  totalValue:        number
  positionsWithCost: number
  totalPositions:    number
}

export interface BenchmarkPayload {
  spy:       Array<{ date: string; cumReturn: number }>
  portfolio: PortfolioStats
  spyReturn: number
  range:     string
  generatedAt: number
}

type Range = '1mo' | '3mo' | '6mo' | '1y'
const VALID_RANGES: Range[] = ['1mo', '3mo', '6mo', '1y']

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const url   = new URL(req.url)
  const range = (VALID_RANGES.includes(url.searchParams.get('range') as Range)
    ? url.searchParams.get('range')
    : '3mo') as Range

  // Cache check
  const cacheKey = `portfolio:benchmark:${user.id}:${range}`
  try {
    const cached = await redis.get<BenchmarkPayload>(cacheKey)
    if (cached) return NextResponse.json(cached)
  } catch { /* fallthrough */ }

  // Fetch user positions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: positions } = await (supabase.from('portfolio_positions') as any)
    .select('symbol, asset_type, direction, quantity, avg_cost')
    .eq('user_id', user.id)

  const rows: Array<{
    symbol: string; asset_type: string; direction: string;
    quantity: number | null; avg_cost: number | null
  }> = positions ?? []

  // All positions with cost basis (both long and short)
  const costPositions = rows.filter(
    (p) => p.quantity != null && p.avg_cost != null && p.quantity > 0,
  )

  // Fetch SPY history + current quotes for cost positions in parallel
  const [spyResult, ...quoteResults] = await Promise.allSettled([
    getYahooHistory('SPY', range),
    ...costPositions.map((p) =>
      p.asset_type === 'commodity'
        ? getYahooQuote(p.symbol)
        : getQuote(p.symbol).then((q) =>
            q ? { symbol: p.symbol, price: q.price } : null,
          ),
    ),
  ])

  // Build SPY series
  const spyHistory = spyResult.status === 'fulfilled' ? spyResult.value : []
  const firstClose = spyHistory[0]?.close ?? 0
  const lastClose  = spyHistory[spyHistory.length - 1]?.close ?? 0

  const spySeries = firstClose > 0
    ? spyHistory.map((d) => ({
        date:      d.date,
        cumReturn: ((d.close - firstClose) / firstClose) * 100,
      }))
    : []

  const spyReturn = firstClose > 0 ? ((lastClose - firstClose) / firstClose) * 100 : 0

  // Build portfolio stats from cost basis
  let totalCost  = 0
  let totalValue = 0
  let withCost   = 0

  costPositions.forEach((p, i) => {
    const result   = quoteResults[i]
    const rawPrice = result?.status === 'fulfilled' ? result.value : null
    const price    = rawPrice && 'price' in rawPrice ? (rawPrice as { price: number }).price : 0

    if (price > 0 && p.quantity! > 0 && p.avg_cost! > 0) {
      const qty       = p.quantity!
      const cost      = p.avg_cost!
      const costBasis = qty * cost
      totalCost += costBasis
      if (p.direction === 'long') {
        totalValue += qty * price
      } else {
        // Short: profit when price drops below cost basis
        const marketValue = qty * price
        totalValue += costBasis + (costBasis - marketValue)
      }
      withCost++
    }
  })

  const totalReturnAmt = totalValue - totalCost
  const totalReturn    = totalCost > 0 ? (totalReturnAmt / totalCost) * 100 : 0

  const payload: BenchmarkPayload = {
    spy:       spySeries,
    portfolio: {
      totalReturn,
      totalReturnAmt,
      totalCost,
      totalValue,
      positionsWithCost: withCost,
      totalPositions:    rows.length,
    },
    spyReturn,
    range,
    generatedAt: Date.now(),
  }

  redis.set(cacheKey, payload, { ex: 1800 }).catch(() => {})

  return NextResponse.json(payload)
}
