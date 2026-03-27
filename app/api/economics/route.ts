export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getMultipleSeries } from '@/lib/api/fred'
import { cachedFetch } from '@/lib/cache/redis'
import { cacheHeaders } from '@/lib/utils/cache-headers'

const EDGE_HEADERS = cacheHeaders(3600)

const CACHE_TTL = 6 * 60 * 60 // 6 hours

// ─── Indicator config ─────────────────────────────────────────────────────

export interface EconomicIndicator {
  id:             string
  name:           string
  value:          number | null
  previousValue:  number | null
  change:         number | null
  changePct:      number | null
  date:           string
  unit:           string
  interpretation: string
  history:        Array<{ date: string; value: number }> // last 12 readings
  isMock?:        boolean
}

const INDICATORS = [
  { id: 'GDP',      name: 'GDP',                  unit: '$T',  decimals: 1 },
  { id: 'CPIAUCSL', name: 'CPI Inflation',         unit: '%',   decimals: 2 },
  { id: 'FEDFUNDS', name: 'Fed Funds Rate',        unit: '%',   decimals: 2 },
  { id: 'UNRATE',   name: 'Unemployment',          unit: '%',   decimals: 1 },
  { id: 'DGS10',    name: '10Y Treasury',          unit: '%',   decimals: 2 },
  { id: 'DGS2',     name: '2Y Treasury',           unit: '%',   decimals: 2 },
  { id: 'M2SL',     name: 'M2 Money Supply',       unit: '$T',  decimals: 1 },
  { id: 'UMCSENT',  name: 'Consumer Confidence',   unit: 'idx', decimals: 1 },
] as const

// ─── Mock fallback data (when FRED_API_KEY is missing) ────────────────────

const MOCK_INDICATORS: EconomicIndicator[] = [
  { id: 'GDP',      name: 'GDP',               value: 28.2,  previousValue: 27.7,  change: 0.5,  changePct: 1.8,   date: '2025-10-01', unit: '$T',  interpretation: 'Economy expanding at steady pace',          history: [], isMock: true },
  { id: 'CPIAUCSL', name: 'CPI Inflation',      value: 2.9,   previousValue: 3.2,   change: -0.3, changePct: -9.4,  date: '2026-01-01', unit: '%',   interpretation: 'Inflation declining toward Fed target',      history: [], isMock: true },
  { id: 'FEDFUNDS', name: 'Fed Funds Rate',     value: 4.33,  previousValue: 4.58,  change: -0.25,changePct: -5.5,  date: '2026-02-01', unit: '%',   interpretation: 'Rate cut cycle in progress',                  history: [], isMock: true },
  { id: 'UNRATE',   name: 'Unemployment',       value: 4.1,   previousValue: 4.0,   change: 0.1,  changePct: 2.5,   date: '2026-02-01', unit: '%',   interpretation: 'Labor market slightly loosening',             history: [], isMock: true },
  { id: 'DGS10',    name: '10Y Treasury',       value: 4.28,  previousValue: 4.55,  change: -0.27,changePct: -5.9,  date: '2026-03-14', unit: '%',   interpretation: 'Long yields declining on growth fears',       history: [], isMock: true },
  { id: 'DGS2',     name: '2Y Treasury',        value: 3.98,  previousValue: 4.22,  change: -0.24,changePct: -5.7,  date: '2026-03-14', unit: '%',   interpretation: 'Short rates pricing in Fed cuts',             history: [], isMock: true },
  { id: 'M2SL',     name: 'M2 Money Supply',    value: 21.4,  previousValue: 21.1,  change: 0.3,  changePct: 1.4,   date: '2026-01-01', unit: '$T',  interpretation: 'Money supply growing moderately',            history: [], isMock: true },
  { id: 'UMCSENT',  name: 'Consumer Confidence',value: 64.7,  previousValue: 71.1,  change: -6.4, changePct: -9.0,  date: '2026-02-01', unit: 'idx', interpretation: 'Sentiment declining on tariff uncertainty',  history: [], isMock: true },
]

// ─── Interpretation logic ─────────────────────────────────────────────────

function interpret(id: string, value: number, change: number | null): string {
  const up = (change ?? 0) > 0
  switch (id) {
    case 'GDP':      return up ? 'Economy expanding' : 'GDP growth slowing'
    case 'CPIAUCSL': return value < 2.5 ? 'Inflation near target' : value < 4 ? 'Inflation moderating' : 'Inflation elevated — Fed hawkish risk'
    case 'FEDFUNDS': return up ? 'Rate hike cycle — tightening' : 'Rate cut cycle in progress'
    case 'UNRATE':   return value < 4 ? 'Labor market tight — wage pressure' : value < 5 ? 'Labor market balanced' : 'Unemployment elevated — recession risk'
    case 'DGS10':    return value > 5 ? 'High long rates — equity headwind' : value > 4 ? 'Yields elevated but stable' : 'Low yields — accommodative'
    case 'DGS2':     return up ? 'Short rates rising — hawkish pricing' : 'Short rates declining — Fed cuts priced'
    case 'M2SL':     return up ? 'Money supply expanding' : 'Money supply contracting — liquidity tightening'
    case 'UMCSENT':  return value > 90 ? 'Consumer optimism high' : value > 70 ? 'Consumer confidence neutral' : 'Consumer pessimism — spending risk'
    default:         return ''
  }
}

// ─── Build indicators from FRED observations ──────────────────────────────

function buildIndicators(
  series: Record<string, Array<{ date: string; value: string }>>,
): EconomicIndicator[] {
  const result: EconomicIndicator[] = []

  for (const cfg of INDICATORS) {
    const obs = series[cfg.id] ?? []
    // obs is sorted descending (newest first from FRED API)
    const validObs = obs.filter((o) => o.value !== '.' && o.value !== '')

    if (validObs.length === 0) {
      result.push({
        id: cfg.id, name: cfg.name, value: null, previousValue: null,
        change: null, changePct: null, date: '', unit: cfg.unit,
        interpretation: '', history: [],
      })
      continue
    }

    const latest   = parseFloat(validObs[0].value)
    const previous = validObs.length > 1 ? parseFloat(validObs[1].value) : null

    // For GDP and M2, convert billions to trillions
    const scale = (cfg.unit === '$T') ? 1 / 1000 : 1

    let displayValue   = latest * scale
    let displayPrev    = previous !== null ? previous * scale : null

    // CPI: compute YoY % change from 12-month reading
    let change:    number | null = null
    let changePct: number | null = null

    if (cfg.id === 'CPIAUCSL' && validObs.length >= 13) {
      // Find the observation closest to 12 months ago by comparing dates
      const latestDate = new Date(validObs[0].date)
      const targetDate = new Date(latestDate)
      targetDate.setMonth(targetDate.getMonth() - 12)

      // Search for the closest observation to 12 months ago
      let yearAgoIdx = 12 // default assumption: monthly data
      let minDiff = Infinity
      for (let i = 1; i < validObs.length; i++) {
        const diff = Math.abs(new Date(validObs[i].date).getTime() - targetDate.getTime())
        if (diff < minDiff) {
          minDiff = diff
          yearAgoIdx = i
        }
      }

      const yearAgo = parseFloat(validObs[yearAgoIdx].value)
      if (yearAgo > 0) {
        changePct = ((latest - yearAgo) / yearAgo) * 100
        change    = changePct
        displayValue = changePct

        // Previous month YoY: find observation ~12 months before validObs[1]
        if (validObs.length > 1) {
          const prevDate = new Date(validObs[1].date)
          const prevTargetDate = new Date(prevDate)
          prevTargetDate.setMonth(prevTargetDate.getMonth() - 12)
          let prevYearAgoIdx = -1
          let prevMinDiff = Infinity
          for (let i = 2; i < validObs.length; i++) {
            const diff = Math.abs(new Date(validObs[i].date).getTime() - prevTargetDate.getTime())
            if (diff < prevMinDiff) {
              prevMinDiff = diff
              prevYearAgoIdx = i
            }
          }
          if (prevYearAgoIdx >= 0) {
            const prevYearAgo = parseFloat(validObs[prevYearAgoIdx].value)
            if (prevYearAgo > 0) {
              displayPrev = ((parseFloat(validObs[1].value) - prevYearAgo) / prevYearAgo) * 100
            }
          } else {
            displayPrev = null
          }
        } else {
          displayPrev = null
        }
      }
    } else if (previous !== null) {
      change    = displayValue - (displayPrev ?? 0)
      changePct = (displayPrev && displayPrev !== 0) ? (change / Math.abs(displayPrev)) * 100 : null
    }

    const history = validObs
      .slice(0, 12)
      .reverse()
      .map((o) => ({ date: o.date, value: parseFloat(o.value) * scale }))

    result.push({
      id:             cfg.id,
      name:           cfg.name,
      value:          Math.round(displayValue * Math.pow(10, cfg.decimals)) / Math.pow(10, cfg.decimals),
      previousValue:  displayPrev !== null ? Math.round(displayPrev * Math.pow(10, cfg.decimals)) / Math.pow(10, cfg.decimals) : null,
      change:         change !== null ? Math.round(change * 100) / 100 : null,
      changePct:      changePct !== null ? Math.round(changePct * 100) / 100 : null,
      date:           validObs[0].date,
      unit:           cfg.unit,
      interpretation: interpret(cfg.id, displayValue, change),
      history,
    })
  }

  // Add derived: 10Y-2Y Yield Spread
  const t10 = result.find((r) => r.id === 'DGS10')
  const t2  = result.find((r) => r.id === 'DGS2')
  if (t10?.value !== null && t2?.value !== null && t10 && t2) {
    const spread      = (t10.value ?? 0) - (t2.value ?? 0)
    const prevSpread  = (t10.previousValue !== null && t2.previousValue !== null)
      ? (t10.previousValue ?? 0) - (t2.previousValue ?? 0)
      : null
    const spreadChange = prevSpread !== null ? spread - prevSpread : null
    // Build aligned spread history from 10Y and 2Y history arrays
    const spreadHistory: Array<{ date: string; value: number }> = []
    if (t10.history.length > 0 && t2.history.length > 0) {
      const t2Map = new Map(t2.history.map(h => [h.date, h.value]))
      for (const h10 of t10.history) {
        const val2 = t2Map.get(h10.date)
        if (val2 !== undefined) {
          spreadHistory.push({ date: h10.date, value: Math.round((h10.value - val2) * 100) / 100 })
        }
      }
    }
    result.push({
      id:             'YIELD_SPREAD',
      name:           'Yield Spread 10Y-2Y',
      value:          Math.round(spread * 100) / 100,
      previousValue:  prevSpread !== null ? Math.round(prevSpread * 100) / 100 : null,
      change:         spreadChange !== null ? Math.round(spreadChange * 100) / 100 : null,
      changePct:      null,
      date:           t10.date,
      unit:           '%',
      interpretation: spread < 0
        ? 'INVERTED — Historical recession signal'
        : spread < 0.5
          ? 'Flat curve — growth slowdown risk'
          : 'Normal curve — expansion signal',
      history: spreadHistory,
    })
  }

  return result
}

// ─── Route handler ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const indicators = await cachedFetch<EconomicIndicator[]>(
      'economics:indicators:v2',
      CACHE_TTL,
      async () => {
        const hasFredKey = !!process.env.FRED_API_KEY

        if (!hasFredKey) {
          console.warn('[economics] No FRED_API_KEY — returning mock data')
          return MOCK_INDICATORS
        }

        const seriesIds = INDICATORS.map((i) => i.id)
        // Fetch 13 obs to support CPI YoY calc (12-month comparison)
        const series = await getMultipleSeries(seriesIds, 14)
        return buildIndicators(series)
      },
    )

    return NextResponse.json(indicators, { headers: EDGE_HEADERS })
  } catch (err) {
    console.error('[economics] route error:', err)
    return NextResponse.json(MOCK_INDICATORS, { headers: EDGE_HEADERS })
  }
}
