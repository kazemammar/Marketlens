export const dynamic = 'force-dynamic'

import { NextResponse }           from 'next/server'
import { getSeriesObservations }  from '@/lib/api/fred'
import { cachedFetch }            from '@/lib/cache/redis'
import { withRateLimit } from '@/lib/utils/rate-limit'
import { cacheHeaders } from '@/lib/utils/cache-headers'


const EDGE_HEADERS = cacheHeaders(300)
const CACHE_TTL = 6 * 60 * 60 // 6 hours

const CENTRAL_BANK_RATES: Record<string, { name: string; series: string; bank: string }> = {
  USD: { name: 'US Dollar',            series: 'FEDFUNDS',           bank: 'Federal Reserve'          },
  EUR: { name: 'Euro',                 series: 'ECBMRRFR',           bank: 'European Central Bank'    },
  GBP: { name: 'British Pound',        series: 'BOERATE',            bank: 'Bank of England'          },
  JPY: { name: 'Japanese Yen',         series: 'IRSTCI01JPM156N',    bank: 'Bank of Japan'            },
  CHF: { name: 'Swiss Franc',          series: 'IRSTCI01CHM156N',    bank: 'Swiss National Bank'      },
  AUD: { name: 'Australian Dollar',    series: 'IRSTCB01AUM156N',    bank: 'Reserve Bank of Australia'},
  CAD: { name: 'Canadian Dollar',      series: 'IRSTCB01CAM156N',    bank: 'Bank of Canada'           },
  NZD: { name: 'New Zealand Dollar',   series: 'IRSTCB01NZM156N',    bank: 'Reserve Bank of NZ'       },
  CNY: { name: 'Chinese Yuan',         series: 'IRSTCI01CNM156N',    bank: "People's Bank of China"   },
}

const NEXT_MEETINGS: Record<string, string[]> = {
  USD: ['2026-03-18', '2026-04-29', '2026-06-10', '2026-07-29'],
  EUR: ['2026-04-02', '2026-04-17', '2026-06-05', '2026-07-17'],
  GBP: ['2026-03-20', '2026-05-08', '2026-06-19', '2026-08-07'],
  JPY: ['2026-03-19', '2026-04-30', '2026-06-18', '2026-07-30'],
  CHF: ['2026-03-20', '2026-06-19', '2026-09-18', '2026-12-11'],
  AUD: ['2026-04-01', '2026-05-20', '2026-07-08', '2026-08-19'],
  CAD: ['2026-04-02', '2026-04-16', '2026-06-04', '2026-07-16'],
  NZD: ['2026-04-09', '2026-05-28', '2026-07-09', '2026-08-20'],
  CNY: ['2026-03-20', '2026-04-20', '2026-05-20', '2026-06-20'],
}

function safeFloat(v: string | undefined): number | null {
  if (!v || v === '.') return null
  const n = parseFloat(v)
  return isFinite(n) ? n : null
}

export async function GET(req: Request) {
  const limited = withRateLimit(req, 60)
  if (limited) return limited

  const url   = new URL(req.url)
  const base  = (url.searchParams.get('base')  ?? 'EUR').toUpperCase()
  const quote = (url.searchParams.get('quote') ?? 'USD').toUpperCase()

  try {
    const result = await cachedFetch(
      `forex:cb:${base}:${quote}`,
      CACHE_TTL,
      async () => {
        const baseInfo  = CENTRAL_BANK_RATES[base]
        const quoteInfo = CENTRAL_BANK_RATES[quote]

        const [baseObs, quoteObs] = await Promise.allSettled([
          baseInfo  ? getSeriesObservations(baseInfo.series,  2) : Promise.resolve([]),
          quoteInfo ? getSeriesObservations(quoteInfo.series, 2) : Promise.resolve([]),
        ])

        const baseObsArr  = baseObs.status  === 'fulfilled' ? baseObs.value  : []
        const quoteObsArr = quoteObs.status === 'fulfilled' ? quoteObs.value : []

        const baseRate      = safeFloat(baseObsArr[0]?.value)
        const basePrevRate  = safeFloat(baseObsArr[1]?.value)
        const quoteRate     = safeFloat(quoteObsArr[0]?.value)
        const quotePrevRate = safeFloat(quoteObsArr[1]?.value)

        const differential = baseRate !== null && quoteRate !== null ? baseRate - quoteRate : null

        const now = new Date().toISOString().slice(0, 10)

        const baseUpcoming  = (NEXT_MEETINGS[base]  ?? []).filter(d => d >= now)
        const quoteUpcoming = (NEXT_MEETINGS[quote] ?? []).filter(d => d >= now)

        return {
          base: {
            currency:         base,
            name:             baseInfo?.name ?? base,
            bank:             baseInfo?.bank ?? 'Central Bank',
            rate:             baseRate,
            previousRate:     basePrevRate,
            rateChange:       baseRate !== null && basePrevRate !== null ? baseRate - basePrevRate : null,
            nextMeeting:      baseUpcoming[0]  ?? null,
            upcomingMeetings: baseUpcoming.slice(0, 3),
          },
          quote: {
            currency:         quote,
            name:             quoteInfo?.name ?? quote,
            bank:             quoteInfo?.bank ?? 'Central Bank',
            rate:             quoteRate,
            previousRate:     quotePrevRate,
            rateChange:       quoteRate !== null && quotePrevRate !== null ? quoteRate - quotePrevRate : null,
            nextMeeting:      quoteUpcoming[0]  ?? null,
            upcomingMeetings: quoteUpcoming.slice(0, 3),
          },
          differential,
          carryDirection: differential !== null
            ? differential > 0.01  ? `${base} carry advantage`
            : differential < -0.01 ? `${quote} carry advantage`
            : 'Rates near parity'
            : null,
        }
      },
    )

    return NextResponse.json(result, { headers: EDGE_HEADERS })
  } catch (err) {
    console.error('[forex/central-banks]', err)
    return NextResponse.json({ base: null, quote: null, differential: null, carryDirection: null }, { headers: EDGE_HEADERS })
  }
}
