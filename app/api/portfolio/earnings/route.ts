import { NextResponse }        from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { withRateLimit }        from '@/lib/utils/rate-limit'
import { redis }                from '@/lib/cache/redis'
import { getEarnings }          from '@/lib/api/finnhub'
import type { EarningsData }    from '@/lib/utils/types'

export interface EarningsItem {
  symbol:          string
  date:            string
  quarter:         number
  year:            number
  actual:          number | null
  estimate:        number | null
  surprise:        number | null
  surprisePercent: number | null
  estimated:       boolean
}

export interface EarningsPayload {
  upcoming:    EarningsItem[]
  recent:      EarningsItem[]
  generatedAt: number
}

function estimateNextEarningsDate(lastPeriod: string): { date: string; quarter: number; year: number } {
  const last     = new Date(lastPeriod)
  const nextQEnd = new Date(last)
  nextQEnd.setDate(nextQEnd.getDate() + 90)
  const reportDate = new Date(nextQEnd)
  reportDate.setDate(reportDate.getDate() + 35)
  return {
    date:    reportDate.toISOString().slice(0, 10),
    quarter: Math.ceil((nextQEnd.getMonth() + 1) / 3),
    year:    nextQEnd.getFullYear(),
  }
}

export async function GET(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const cacheKey = `portfolio:earnings:${user.id}`

  const url          = new URL(req.url)
  const forceRefresh = url.searchParams.get('refresh') === 'true'

  if (forceRefresh) {
    await redis.del(cacheKey).catch(() => {})
  }

  if (!forceRefresh) {
    try {
      const cached = await redis.get<EarningsPayload>(cacheKey)
      if (cached) return NextResponse.json(cached)
    } catch { /* fall through */ }
  }

  // Fetch portfolio positions — only equities have earnings
  const { data: positions, error } = await supabase
    .from('portfolio_positions')
    .select('symbol, asset_type')
    .eq('user_id', user.id)

  if (error || !positions || positions.length === 0) {
    return NextResponse.json({ upcoming: [], recent: [], generatedAt: Date.now() })
  }

  const equitySymbols = [
    ...new Set(
      positions
        .filter((p) => p.asset_type === 'stock' || p.asset_type === 'etf')
        .map((p) => p.symbol as string),
    ),
  ]

  if (equitySymbols.length === 0) {
    return NextResponse.json({ upcoming: [], recent: [], generatedAt: Date.now() })
  }

  // Fetch earnings for all symbols in parallel (each is individually cached)
  const results = await Promise.allSettled(
    equitySymbols.map(async (symbol) => {
      const data: EarningsData[] = await getEarnings(symbol)
      return { symbol, data }
    }),
  )

  const today    = new Date().toISOString().slice(0, 10)
  const upcoming: EarningsItem[] = []
  const recent:   EarningsItem[] = []

  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    const { symbol, data } = result.value
    if (!data || data.length === 0) continue

    // Sort by period descending — most recent first
    const sorted = [...data].sort((a, b) => b.period.localeCompare(a.period))

    // Recent: last 2 actual quarters
    for (const q of sorted.slice(0, 2)) {
      recent.push({
        symbol,
        date:            q.period,
        quarter:         q.quarter,
        year:            q.year,
        actual:          q.actual,
        estimate:        q.estimate,
        surprise:        q.surprise,
        surprisePercent: q.surprisePercent,
        estimated:       false,
      })
    }

    // Upcoming: estimate next earnings from the most recent period
    const next = estimateNextEarningsDate(sorted[0].period)
    if (next.date > today) {
      upcoming.push({
        symbol,
        date:            next.date,
        quarter:         next.quarter,
        year:            next.year,
        actual:          null,
        estimate:        null,
        surprise:        null,
        surprisePercent: null,
        estimated:       true,
      })
    }
  }

  upcoming.sort((a, b) => a.date.localeCompare(b.date))
  recent.sort((a, b) => b.date.localeCompare(a.date))

  const payload: EarningsPayload = { upcoming, recent, generatedAt: Date.now() }
  redis.set(cacheKey, payload, { ex: 21600 }).catch(() => {})
  return NextResponse.json(payload)
}
