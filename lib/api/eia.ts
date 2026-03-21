/**
 * lib/api/eia.ts
 * ──────────────
 * EIA (Energy Information Administration) API v2 client
 * Base URL: https://api.eia.gov/v2
 * Free API key: https://www.eia.gov/opendata/register.php
 */

import { cachedFetch } from '@/lib/cache/redis'

const EIA_BASE  = 'https://api.eia.gov/v2'
const CACHE_TTL = 6 * 60 * 60  // 6 hours — EIA publishes weekly

// ─── Types ────────────────────────────────────────────────────────────────

export interface EiaDataPoint {
  period: string   // "2026-03-14"
  value:  number
}

export interface EiaSeries {
  id:            string
  name:          string
  unit:          string
  frequency:     string
  data:          EiaDataPoint[]
  latest:        number | null
  previous:      number | null
  change:        number | null
  changePercent: number | null
}

// ─── Series configuration ─────────────────────────────────────────────────

interface SeriesConfig {
  id:      string
  name:    string
  unit:    string
  route:   string
  facets:  Record<string, string>
  // EIA reports raw values in thousands; divisor converts to the display unit
  // e.g. production in "Thousand Barrels/Day" → divide by 1000 → "Mbbl/d"
  divisor: number
}

const SERIES_CONFIG: SeriesConfig[] = [
  {
    id:      'wti_price',
    name:    'WTI Crude',
    unit:    '$/bbl',
    route:   '/petroleum/pri/spt/data/',
    facets:  { product: 'EPCWTI' },
    divisor: 1,
  },
  {
    id:      'brent_price',
    name:    'Brent Crude',
    unit:    '$/bbl',
    route:   '/petroleum/pri/spt/data/',
    facets:  { product: 'EPCBRENT' },
    divisor: 1,
  },
  {
    id:      'us_production',
    name:    'US Production',
    unit:    'Mbbl/d',
    // WCRFPUS2 = US Field Production of Crude Oil (Thousand Barrels per Day)
    route:   '/petroleum/sum/sndw/data/',
    facets:  { series: 'WCRFPUS2' },
    divisor: 1000,
  },
  {
    id:      'us_crude_stocks',
    name:    'US Crude Inventory',
    unit:    'Mbbl',
    // WCESTUS1 = US Ending Stocks of Crude Oil excl. SPR (Thousand Barrels)
    route:   '/petroleum/sum/sndw/data/',
    facets:  { series: 'WCESTUS1' },
    divisor: 1000,
  },
  {
    id:      'us_gasoline_stocks',
    name:    'US Gasoline Inventory',
    unit:    'Mbbl',
    // WGTSTUS1 = US Ending Stocks of Total Gasoline (Thousand Barrels)
    route:   '/petroleum/sum/sndw/data/',
    facets:  { series: 'WGTSTUS1' },
    divisor: 1000,
  },
]

// ─── Empty series helper ──────────────────────────────────────────────────

function emptySeries(cfg: SeriesConfig): EiaSeries {
  return {
    id:            cfg.id,
    name:          cfg.name,
    unit:          cfg.unit,
    frequency:     'weekly',
    data:          [],
    latest:        null,
    previous:      null,
    change:        null,
    changePercent: null,
  }
}

// ─── Fetch a single series ────────────────────────────────────────────────

async function fetchEiaSeries(cfg: SeriesConfig): Promise<EiaSeries> {
  const apiKey = process.env.EIA_API_KEY
  if (!apiKey) {
    console.warn('[eia] EIA_API_KEY not set — skipping', cfg.id)
    return emptySeries(cfg)
  }

  return cachedFetch<EiaSeries>(
    `eia:${cfg.id}:v3`,
    CACHE_TTL,
    async () => {
      // Build GET query string with array-style params
      const p = new URLSearchParams()
      p.append('api_key',           apiKey)
      p.append('frequency',         'weekly')
      p.append('data[0]',           'value')
      for (const [key, val] of Object.entries(cfg.facets)) {
        p.append(`facets[${key}][]`, val)
      }
      p.append('sort[0][column]',    'period')
      p.append('sort[0][direction]', 'desc')
      p.append('length',             '13')

      const url = `${EIA_BASE}${cfg.route}?${p.toString()}`
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })

      if (!res.ok) throw new Error(`[eia] HTTP ${res.status} for ${cfg.id}`)

      const json    = await res.json()
      const rawData = (json?.response?.data ?? []) as Array<{ period?: string; value?: string | number }>

      const data: EiaDataPoint[] = rawData
        .filter(d => d.period && d.value != null)
        .map(d => ({
          period: d.period as string,
          value:  Number(d.value) / cfg.divisor,
        }))
        .filter(d => !isNaN(d.value))
        .sort((a, b) => b.period.localeCompare(a.period))  // newest first

      const latest   = data[0]?.value ?? null
      const previous = data[1]?.value ?? null
      const change   = latest != null && previous != null ? latest - previous : null
      const changePct = change != null && previous != null && previous !== 0
        ? (change / previous) * 100
        : null

      return {
        id:            cfg.id,
        name:          cfg.name,
        unit:          cfg.unit,
        frequency:     'weekly',
        data,
        latest,
        previous,
        change,
        changePercent: changePct != null ? Math.round(changePct * 100) / 100 : null,
      }
    },
  )
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function getAllEiaSeries(): Promise<EiaSeries[]> {
  const results = await Promise.allSettled(
    SERIES_CONFIG.map(cfg => fetchEiaSeries(cfg)),
  )
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : emptySeries(SERIES_CONFIG[i]),
  )
}
