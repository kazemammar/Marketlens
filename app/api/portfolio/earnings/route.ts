import { NextResponse }        from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { withRateLimit }        from '@/lib/utils/rate-limit'
import { redis }                from '@/lib/cache/redis'
import { getEarningsCalendar }  from '@/lib/api/fmp'
import type { EarningsEvent }   from '@/lib/api/fmp'

export interface EarningsPayload {
  upcoming:    EarningsEvent[]
  recent:      EarningsEvent[]
  generatedAt: number
}

export async function GET(req: Request) {
  const limited = withRateLimit(req, 20)
  if (limited) return limited

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const cacheKey = `portfolio:earnings:${user.id}`

  const url = new URL(req.url)
  const forceRefresh = url.searchParams.get('refresh') === 'true'

  if (forceRefresh) {
    const now2 = new Date()
    const fr   = new Date(now2); fr.setDate(fr.getDate() - 7)
    const to2  = new Date(now2); to2.setDate(to2.getDate() + 30)
    const fmt2 = (d: Date) => d.toISOString().slice(0, 10)
    await Promise.all([
      redis.del(cacheKey).catch(() => {}),
      redis.del(`earnings:calendar:${fmt2(fr)}:${fmt2(to2)}`).catch(() => {}),
    ])
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

  const equitySymbols = new Set(
    positions
      .filter((p) => p.asset_type === 'stock' || p.asset_type === 'etf')
      .map((p) => p.symbol as string)
  )

  if (equitySymbols.size === 0) {
    return NextResponse.json({ upcoming: [], recent: [], generatedAt: Date.now() })
  }

  // Date range: 7 days ago → 30 days from now
  const now  = new Date()
  const from = new Date(now); from.setDate(from.getDate() - 7)
  const to   = new Date(now); to.setDate(to.getDate() + 30)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const today = fmt(now)

  let allEarnings: EarningsEvent[] = []
  try {
    allEarnings = await getEarningsCalendar(fmt(from), fmt(to))
  } catch (err) {
    console.warn('[portfolio/earnings] Failed to fetch earnings calendar:', err)
  }

  if (allEarnings.length === 0) {
    const empty: EarningsPayload = { upcoming: [], recent: [], generatedAt: Date.now() }
    redis.set(cacheKey, empty, { ex: 600 }).catch(() => {})
    return NextResponse.json(empty)
  }

  const filtered = allEarnings.filter((e) => equitySymbols.has(e.symbol))

  const upcoming = filtered
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))

  const recent = filtered
    .filter((e) => e.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))

  const payload: EarningsPayload = { upcoming, recent, generatedAt: Date.now() }
  redis.set(cacheKey, payload, { ex: 21600 }).catch(() => {})
  return NextResponse.json(payload)
}
