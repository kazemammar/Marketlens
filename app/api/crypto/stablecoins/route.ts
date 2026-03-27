import { NextResponse }    from 'next/server'
import { cachedFetch }     from '@/lib/cache/redis'
import { getCryptoByIds }  from '@/lib/api/coingecko'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'

const EDGE_HEADERS = cacheHeaders(300)

// ─── Stablecoin definitions ────────────────────────────────────────────────

const STABLECOINS = [
  { id: 'tether',            symbol: 'USDT',  name: 'Tether',       peg: 1.00 },
  { id: 'usd-coin',          symbol: 'USDC',  name: 'USD Coin',     peg: 1.00 },
  { id: 'dai',               symbol: 'DAI',   name: 'Dai',          peg: 1.00 },
  { id: 'first-digital-usd', symbol: 'FDUSD', name: 'First Digital',peg: 1.00 },
  { id: 'ethena-usde',       symbol: 'USDe',  name: 'Ethena USDe',  peg: 1.00 },
]

// ─── Types ────────────────────────────────────────────────────────────────

export interface StablecoinData {
  symbol:       string
  name:         string
  price:        number
  peg:          number
  deviation:    number      // percentage deviation from peg
  deviationBps: number      // deviation in basis points
  status:       'ON PEG' | 'SLIGHT DEPEG' | 'DEPEGGED'
  marketCap:    number
  volume24h:    number
  change24h:    number      // 24h price change percentage
}

export interface StablecoinPayload {
  coins:          StablecoinData[]
  totalMarketCap: number
  totalVolume:    number
  overallHealth:  'HEALTHY' | 'CAUTION' | 'WARNING'
  generatedAt:    number
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function classifyPeg(deviationPct: number): StablecoinData['status'] {
  const abs = Math.abs(deviationPct)
  if (abs <= 0.5) return 'ON PEG'
  if (abs <= 1.0) return 'SLIGHT DEPEG'
  return 'DEPEGGED'
}

// ─── Route ────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const limited = withRateLimit(req, 60)
  if (limited) return limited

  try {
    const data = await cachedFetch<StablecoinPayload>(
      'crypto:stablecoins:v1',
      120,  // 2-minute cache — depegs need fast detection
      async () => {
        const ids     = STABLECOINS.map(s => s.id)
        const markets = await getCryptoByIds(ids)

        const coins: StablecoinData[] = STABLECOINS
          .map(sc => {
            const market = markets.find(m => m.id === sc.id)
            if (!market) return null

            const price       = market.currentPrice
            const deviation   = ((price - sc.peg) / sc.peg) * 100
            const deviationBps = Math.round(deviation * 100)

            return {
              symbol:       sc.symbol,
              name:         sc.name,
              price,
              peg:          sc.peg,
              deviation,
              deviationBps,
              status:       classifyPeg(deviation),
              marketCap:    market.marketCap,
              volume24h:    market.totalVolume,
              change24h:    market.priceChangePercent24h,
            }
          })
          .filter((c): c is StablecoinData => c !== null)

        // Sort by market cap descending (USDT first, etc.)
        coins.sort((a, b) => b.marketCap - a.marketCap)

        const totalMarketCap  = coins.reduce((s, c) => s + c.marketCap,  0)
        const totalVolume     = coins.reduce((s, c) => s + c.volume24h,  0)
        const hasDepegged     = coins.some(c => c.status === 'DEPEGGED')
        const hasSlightDepeg  = coins.some(c => c.status === 'SLIGHT DEPEG')

        return {
          coins,
          totalMarketCap,
          totalVolume,
          overallHealth: hasDepegged ? 'WARNING' : hasSlightDepeg ? 'CAUTION' : 'HEALTHY',
          generatedAt: Date.now(),
        }
      },
    )
    return NextResponse.json(data, { headers: EDGE_HEADERS })
  } catch (err) {
    console.error('[crypto/stablecoins]', err)
    return NextResponse.json({
      coins: [], totalMarketCap: 0, totalVolume: 0,
      overallHealth: 'HEALTHY', generatedAt: Date.now(),
    } satisfies StablecoinPayload)
  }
}
