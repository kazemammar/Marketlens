import { NextResponse }      from 'next/server'
import { getQuotesBatched }  from '@/lib/api/finnhub'
import { redis }             from '@/lib/cache/redis'

export const dynamic = 'force-dynamic'

const CACHE_KEY = 'commodities-strip:v2'
const CACHE_TTL = 60

export interface CommodityStripItem {
  symbol:        string
  name:          string
  shortName:     string
  price:         number
  change:        number
  changePercent: number
  currency:      string
}

const STRIP = [
  { symbol: 'USO',  name: 'WTI Crude Oil',  shortName: 'WTI'     },
  { symbol: 'BNO',  name: 'Brent Crude',    shortName: 'Brent'   },
  { symbol: 'UNG',  name: 'Natural Gas',    shortName: 'Nat Gas' },
  { symbol: 'GLD',  name: 'Gold',           shortName: 'Gold'    },
  { symbol: 'SLV',  name: 'Silver',         shortName: 'Silver'  },
  { symbol: 'CPER', name: 'Copper',         shortName: 'Copper'  },
  { symbol: 'WEAT', name: 'Wheat',          shortName: 'Wheat'   },
  { symbol: 'URA',  name: 'Uranium',        shortName: 'Uranium' },
]

export async function GET() {
  try {
    const cached = await redis.get<CommodityStripItem[]>(CACHE_KEY)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  const map   = await getQuotesBatched(STRIP.map((s) => s.symbol))
  const items = STRIP.flatMap((cfg): CommodityStripItem[] => {
    const q = map.get(cfg.symbol)
    if (!q) return []
    const price = q.price > 0 ? q.price : q.previousClose
    if (price <= 0) return []
    return [{
      symbol:        cfg.symbol,
      name:          cfg.name,
      shortName:     cfg.shortName,
      price,
      change:        q.price > 0 ? q.change        : 0,
      changePercent: q.price > 0 ? q.changePercent : 0,
      currency:      'USD',
    }]
  })

  try { await redis.set(CACHE_KEY, items, { ex: CACHE_TTL }) } catch { /* */ }
  return NextResponse.json(items)
}
