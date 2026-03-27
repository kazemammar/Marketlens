import { NextResponse }         from 'next/server'
import { cachedFetch }          from '@/lib/cache/redis'
import { getYahooQuotesBatch }  from '@/lib/api/yahoo'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'

const EDGE_HEADERS = cacheHeaders(300)

// ─── ETF definitions ──────────────────────────────────────────────────────

const BTC_ETFS = [
  { symbol: 'IBIT', name: 'iShares Bitcoin Trust',    issuer: 'BlackRock'  },
  { symbol: 'FBTC', name: 'Wise Origin Bitcoin Fund', issuer: 'Fidelity'   },
  { symbol: 'ARKB', name: 'ARK 21Shares Bitcoin ETF', issuer: 'ARK'        },
  { symbol: 'BITB', name: 'Bitwise Bitcoin ETF',      issuer: 'Bitwise'    },
  { symbol: 'GBTC', name: 'Grayscale Bitcoin Trust',  issuer: 'Grayscale'  },
  { symbol: 'HODL', name: 'VanEck Bitcoin ETF',       issuer: 'VanEck'     },
  { symbol: 'BRRR', name: 'CoinShares Valkyrie BTC',  issuer: 'CoinShares' },
  { symbol: 'EZBC', name: 'Franklin Bitcoin ETF',     issuer: 'Franklin'   },
  { symbol: 'BTCO', name: 'Invesco Galaxy Bitcoin',   issuer: 'Invesco'    },
  { symbol: 'BTCW', name: 'WisdomTree Bitcoin Fund',  issuer: 'WisdomTree' },
]

// ─── Types ────────────────────────────────────────────────────────────────

export interface BtcEtfData {
  symbol:        string
  name:          string
  issuer:        string
  price:         number
  change:        number
  changePercent: number
  volumeRatio:   number
  flowDirection: 'INFLOW' | 'OUTFLOW' | 'NEUTRAL'
  // Note: flowDirection is inferred from price movement (not actual fund flows)
  // "INFLOW" = positive price momentum, "OUTFLOW" = negative momentum
}

export interface BtcEtfPayload {
  etfs:         BtcEtfData[]
  netDirection: 'INFLOW' | 'OUTFLOW' | 'NEUTRAL'
  inflowCount:  number
  outflowCount: number
  generatedAt:  number
  // Note: directions are based on ETF price momentum, not actual reported fund flows
}

// ─── Route ────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const limited = withRateLimit(req, 60)
  if (limited) return limited

  try {
    const data = await cachedFetch<BtcEtfPayload>(
      'crypto:btc-etfs:v1',
      300,  // 5-minute cache
      async () => {
        const symbols = BTC_ETFS.map(e => e.symbol)
        const quotes  = await getYahooQuotesBatch(symbols)

        const etfs: BtcEtfData[] = BTC_ETFS
          .map(etf => {
            const q = quotes.find(qq => qq.symbol === etf.symbol)
            if (!q || q.price <= 0) return null

            const changePercent = q.changePercent ?? 0

            // Flow direction inferred from price movement
            // Threshold ±0.3% to avoid noise
            const flowDirection: BtcEtfData['flowDirection'] =
              changePercent >  0.3 ? 'INFLOW'  :
              changePercent < -0.3 ? 'OUTFLOW' : 'NEUTRAL'

            return {
              symbol:        etf.symbol,
              name:          etf.name,
              issuer:        etf.issuer,
              price:         q.price,
              change:        q.change,
              changePercent,
              volumeRatio:   1,   // volume data not available from YahooQuote
              flowDirection,
            }
          })
          .filter((e): e is BtcEtfData => e !== null)

        // Sort: INFLOW first, then NEUTRAL, then OUTFLOW; within same direction by price desc
        const dirOrder = { INFLOW: 0, NEUTRAL: 1, OUTFLOW: 2 }
        etfs.sort((a, b) =>
          dirOrder[a.flowDirection] - dirOrder[b.flowDirection] || b.price - a.price,
        )

        const inflowCount  = etfs.filter(e => e.flowDirection === 'INFLOW').length
        const outflowCount = etfs.filter(e => e.flowDirection === 'OUTFLOW').length

        const netDirection: BtcEtfPayload['netDirection'] =
          inflowCount > outflowCount  ? 'INFLOW'  :
          outflowCount > inflowCount  ? 'OUTFLOW' : 'NEUTRAL'

        return { etfs, netDirection, inflowCount, outflowCount, generatedAt: Date.now() }
      },
    )
    return NextResponse.json(data, { headers: EDGE_HEADERS })
  } catch (err) {
    console.error('[crypto/btc-etfs]', err)
    return NextResponse.json({
      etfs: [], netDirection: 'NEUTRAL', inflowCount: 0, outflowCount: 0, generatedAt: Date.now(),
    } satisfies BtcEtfPayload)
  }
}
