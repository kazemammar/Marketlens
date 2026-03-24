import { NextResponse }        from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { withRateLimit }        from '@/lib/utils/rate-limit'
import { redis }                from '@/lib/cache/redis'

// ─── Types ────────────────────────────────────────────────────────────────────

type Range = '1M' | '3M' | '6M' | '1Y' | 'ALL'
const VALID_RANGES: Range[] = ['1M', '3M', '6M', '1Y', 'ALL']

interface SnapshotRow {
  date:        string
  total_value: number
  total_cost:  number
  positions:   number
}

export interface HistoryPayload {
  snapshots:   Array<{
    date:       string
    totalValue: number
    totalCost:  number
    positions:  number
    returnPct:  number
  }>
  generatedAt: number
}

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
    : '3M') as Range

  // Cache check
  const cacheKey = `portfolio:history:${user.id}:${range}`
  try {
    const cached = await redis.get<HistoryPayload>(cacheKey)
    if (cached) return NextResponse.json(cached)
  } catch { /* fallthrough */ }

  // Calculate from date
  const fromDate = (() => {
    if (range === 'ALL') return null
    const d = new Date()
    if      (range === '1M') d.setDate(d.getDate() - 30)
    else if (range === '3M') d.setDate(d.getDate() - 90)
    else if (range === '6M') d.setDate(d.getDate() - 180)
    else if (range === '1Y') d.setDate(d.getDate() - 365)
    return d.toISOString().slice(0, 10)
  })()

  // Query snapshots
  let query = supabase.from('portfolio_snapshots')
    .select('date, total_value, total_cost, positions')
    .eq('user_id', user.id)
    .order('date', { ascending: true })

  if (fromDate) {
    query = query.gte('date', fromDate)
  }

  const { data: rows }: { data: SnapshotRow[] | null } = await query

  const snapshots = (rows ?? []).map((r) => ({
    date:       r.date,
    totalValue: r.total_value,
    totalCost:  r.total_cost,
    positions:  r.positions,
    returnPct:  r.total_cost > 0
      ? ((r.total_value - r.total_cost) / r.total_cost) * 100
      : 0,
  }))

  const payload: HistoryPayload = { snapshots, generatedAt: Date.now() }

  redis.set(cacheKey, payload, { ex: 3600 }).catch(() => {})

  return NextResponse.json(payload)
}
