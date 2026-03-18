import { NextResponse }        from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { withRateLimit }        from '@/lib/utils/rate-limit'
import { redis }                from '@/lib/cache/redis'
import { getQuote }             from '@/lib/api/finnhub'
import { getYahooQuote }        from '@/lib/api/yahoo'

// NOTE: For users to INSERT their own snapshots, run this in Supabase SQL editor:
// create policy "Users insert own snapshots" on portfolio_snapshots
//   for insert with check (auth.uid() = user_id);

const CRYPTO_MAP: Record<string, string> = {
  BTC:   'BINANCE:BTCUSDT',
  ETH:   'BINANCE:ETHUSDT',
  SOL:   'BINANCE:SOLUSDT',
  BNB:   'BINANCE:BNBUSDT',
  XRP:   'BINANCE:XRPUSDT',
  ADA:   'BINANCE:ADAUSDT',
  DOGE:  'BINANCE:DOGEUSDT',
  AVAX:  'BINANCE:AVAXUSDT',
  DOT:   'BINANCE:DOTUSDT',
  LINK:  'BINANCE:LINKUSDT',
  MATIC: 'BINANCE:MATICUSDT',
  UNI:   'BINANCE:UNIUSDT',
  ATOM:  'BINANCE:ATOMUSDT',
  LTC:   'BINANCE:LTCUSDT',
}

export async function POST(req: Request) {
  const limited = withRateLimit(req, 5)
  if (limited) return limited

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Fetch user's positions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: positions } = await (supabase.from('portfolio_positions') as any)
    .select('symbol, asset_type, direction, quantity, avg_cost')
    .eq('user_id', user.id)

  const rows: Array<{
    symbol: string; asset_type: string; direction: string;
    quantity: number | null; avg_cost: number | null
  }> = positions ?? []

  if (!rows.length) {
    return NextResponse.json({ error: 'No positions found' }, { status: 400 })
  }

  // Fetch quotes for each position
  const quoteResults = await Promise.allSettled(
    rows.map((p) => {
      if (p.asset_type === 'commodity') {
        return getYahooQuote(p.symbol).then((q) => ({ sym: p.symbol, price: q?.price ?? 0 }))
      }
      if (p.asset_type === 'crypto') {
        const binanceSym = CRYPTO_MAP[p.symbol] ?? `BINANCE:${p.symbol}USDT`
        return getQuote(binanceSym).then((q) =>
          q?.price
            ? { sym: p.symbol, price: q.price }
            : getYahooQuote(p.symbol + '-USD').then((yq) => ({ sym: p.symbol, price: yq?.price ?? 0 })),
        )
      }
      return getQuote(p.symbol).then((q) => ({ sym: p.symbol, price: q?.price ?? 0 }))
    }),
  )

  // Calculate portfolio value
  let totalValue    = 0
  let totalCost     = 0
  let countWithData = 0

  rows.forEach((p, i) => {
    const result = quoteResults[i]
    const price  = result?.status === 'fulfilled' ? result.value.price : 0
    if (!price || !p.quantity || !p.avg_cost) return

    countWithData++
    const qty  = Number(p.quantity)
    const cost = Number(p.avg_cost)

    if (p.direction === 'short') {
      totalValue += qty * cost * 2 - qty * price
    } else {
      totalValue += qty * price
    }
    totalCost += qty * cost
  })

  if (countWithData === 0) {
    return NextResponse.json({ error: 'No positions with cost data found' }, { status: 400 })
  }

  const today    = new Date().toISOString().slice(0, 10)
  const snapshot = {
    user_id:     user.id,
    date:        today,
    total_value: Math.round(totalValue * 100) / 100,
    total_cost:  Math.round(totalCost * 100) / 100,
    positions:   countWithData,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('portfolio_snapshots') as any)
    .upsert(snapshot, { onConflict: 'user_id,date' })

  if (error) {
    console.error('[portfolio/snapshot]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Bust history cache for all ranges
  await Promise.allSettled(
    ['1M', '3M', '6M', '1Y', 'ALL'].map((r) =>
      redis.del(`portfolio:history:${user.id}:${r}`).catch(() => {}),
    ),
  )

  return NextResponse.json({
    ok:         true,
    date:       today,
    totalValue: snapshot.total_value,
    totalCost:  snapshot.total_cost,
    positions:  snapshot.positions,
    returnPct:  totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
  })
}
