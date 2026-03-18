import { NextRequest, NextResponse } from 'next/server'
import { createClient }             from '@supabase/supabase-js'
import { getQuote }                 from '@/lib/api/finnhub'
import { getYahooQuote }            from '@/lib/api/yahoo'

// Add SUPABASE_SERVICE_ROLE_KEY to your Vercel env vars
// (Supabase dashboard → Settings → API → service_role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

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

export async function GET(req: NextRequest) {
  // Verify Vercel Cron auth (skip check if CRON_SECRET is not set — for local testing)
  if (process.env.CRON_SECRET) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const today = new Date().toISOString().slice(0, 10)

    // 1. Get all positions across all users
    const { data: allPositions, error: posErr } = await supabase
      .from('portfolio_positions')
      .select('user_id, symbol, asset_type, direction, quantity, avg_cost')

    if (posErr) throw posErr

    if (!allPositions?.length) {
      return NextResponse.json({ ok: true, date: today, usersProcessed: 0, snapshotsWritten: 0 })
    }

    // 2. Deduplicate user IDs
    const userIds = [...new Set(allPositions.map((p) => p.user_id as string))]

    // 3. Bucket symbols by asset type for different quote sources
    const stockSymbols     = [...new Set(allPositions.filter((p) => p.asset_type === 'stock' || p.asset_type === 'etf').map((p) => p.symbol as string))]
    const commoditySymbols = [...new Set(allPositions.filter((p) => p.asset_type === 'commodity').map((p) => p.symbol as string))]
    const cryptoSymbols    = [...new Set(allPositions.filter((p) => p.asset_type === 'crypto').map((p) => p.symbol as string))]

    // 4. Fetch all quotes in parallel
    const [stockResults, commodityResults, cryptoResults] = await Promise.all([
      Promise.allSettled(stockSymbols.map((sym) => getQuote(sym).then((q) => ({ sym, price: q?.price ?? 0 })))),
      Promise.allSettled(commoditySymbols.map((sym) => getYahooQuote(sym).then((q) => ({ sym, price: q?.price ?? 0 })))),
      Promise.allSettled(
        cryptoSymbols.map((sym) => {
          const binanceSym = CRYPTO_MAP[sym] ?? `BINANCE:${sym}USDT`
          return getQuote(binanceSym).then((q) =>
            q?.price ? { sym, price: q.price } : getYahooQuote(sym + '-USD').then((yq) => ({ sym, price: yq?.price ?? 0 })),
          )
        }),
      ),
    ])

    // 5. Build quotes map: symbol → price
    const quotes: Record<string, number> = {}
    for (const r of [...stockResults, ...commodityResults, ...cryptoResults]) {
      if (r.status === 'fulfilled' && r.value.price > 0) {
        quotes[r.value.sym] = r.value.price
      }
    }

    // 6. Calculate per-user portfolio values and build snapshots
    const snapshots: Array<{
      user_id:     string
      date:        string
      total_value: number
      total_cost:  number
      positions:   number
    }> = []

    for (const userId of userIds) {
      const userPositions = allPositions.filter((p) => p.user_id === userId)
      let totalValue    = 0
      let totalCost     = 0
      let countWithData = 0

      for (const p of userPositions) {
        const price = quotes[p.symbol as string]
        if (!price || !p.quantity || !p.avg_cost) continue

        countWithData++
        const qty  = Number(p.quantity)
        const cost = Number(p.avg_cost)

        if (p.direction === 'short') {
          // Short P&L: profit when price drops below cost
          totalValue += qty * cost * 2 - qty * price
        } else {
          totalValue += qty * price
        }
        totalCost += qty * cost
      }

      if (countWithData > 0) {
        snapshots.push({
          user_id:     userId,
          date:        today,
          total_value: Math.round(totalValue * 100) / 100,
          total_cost:  Math.round(totalCost * 100) / 100,
          positions:   countWithData,
        })
      }
    }

    // 7. Bulk upsert
    if (snapshots.length > 0) {
      const { error: upsertErr } = await supabase
        .from('portfolio_snapshots')
        .upsert(snapshots, { onConflict: 'user_id,date' })

      if (upsertErr) throw upsertErr
    }

    return NextResponse.json({
      ok:              true,
      date:            today,
      usersProcessed:  userIds.length,
      snapshotsWritten: snapshots.length,
    })
  } catch (err) {
    console.error('[cron/snapshot]', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
