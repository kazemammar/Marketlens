import { NextResponse }             from 'next/server'
import { getYahooQuotesBatch }      from '@/lib/api/yahoo'
import { redis }                    from '@/lib/cache/redis'
import type { CommodityStripItem }  from '@/lib/api/homepage'

// Re-export so existing imports of this type from this route still work
export type { CommodityStripItem }

export const dynamic = 'force-dynamic'

// v4 — response shape changed to { items, updatedAt } so components can show
// server-side data freshness instead of a misleading client-receipt timestamp
const CACHE_KEY = 'commodities-strip:v4'
const CACHE_TTL = 300

export interface CommodityStripResponse {
  items:     CommodityStripItem[]
  updatedAt: number  // ms — when Yahoo data was fetched on the server
}

const STRIP = [
  { symbol: 'CL=F',  name: 'WTI Crude Oil',  shortName: 'WTI'     },
  { symbol: 'BZ=F',  name: 'Brent Crude',    shortName: 'Brent'   },
  { symbol: 'NG=F',  name: 'Natural Gas',    shortName: 'Nat Gas' },
  { symbol: 'GC=F',  name: 'Gold',           shortName: 'Gold'    },
  { symbol: 'SI=F',  name: 'Silver',         shortName: 'Silver'  },
  { symbol: 'HG=F',  name: 'Copper',         shortName: 'Copper'  },
  { symbol: 'ZW=F',  name: 'Wheat',          shortName: 'Wheat'   },
  { symbol: 'ZC=F',  name: 'Corn',           shortName: 'Corn'    },
  { symbol: 'UX1!',  name: 'Uranium',        shortName: 'Uranium' },
]

export async function GET() {
  try {
    const cached = await redis.get<CommodityStripResponse>(CACHE_KEY)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

  const quotes = await getYahooQuotesBatch(STRIP.map((s) => s.symbol))
  const updatedAt = Date.now()

  const items = STRIP.flatMap((cfg): CommodityStripItem[] => {
    const q = quotes.find((qq) => qq.symbol === cfg.symbol)
    if (!q || q.price <= 0) return []
    return [{
      symbol:        cfg.symbol,
      name:          cfg.name,
      shortName:     cfg.shortName,
      price:         q.price,
      change:        q.change,
      changePercent: q.changePercent,
      currency:      'USD',
    }]
  })

  const payload: CommodityStripResponse = { items, updatedAt }
  try { await redis.set(CACHE_KEY, payload, { ex: CACHE_TTL }) } catch { /* */ }
  return NextResponse.json(payload)
}
