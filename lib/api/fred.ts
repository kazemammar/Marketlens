/**
 * lib/api/fred.ts
 * ───────────────
 * FRED (Federal Reserve Economic Data) API client
 * Base URL: https://api.stlouisfed.org/fred
 * Requires FRED_API_KEY in environment variables
 */

import { cachedFetch } from '@/lib/cache/redis'

const FRED_BASE = 'https://api.stlouisfed.org/fred'
const CACHE_TTL = 6 * 60 * 60 // 6 hours in seconds

export interface FredObservation {
  date:  string
  value: string
}

export interface FredSeriesResponse {
  observations: FredObservation[]
}

// ─── Fetch latest N observations for a series ─────────────────────────────

export async function getSeriesObservations(
  seriesId: string,
  limit = 2,
): Promise<FredObservation[]> {
  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) {
    console.warn('[fred] FRED_API_KEY missing — skipping series fetch')
    return []
  }

  return cachedFetch<FredObservation[]>(
    `fred:series:${seriesId}:${limit}`,
    CACHE_TTL,
    async () => {
      const url = new URL(`${FRED_BASE}/series/observations`)
      url.searchParams.set('series_id', seriesId)
      url.searchParams.set('api_key', apiKey)
      url.searchParams.set('file_type', 'json')
      url.searchParams.set('sort_order', 'desc')
      url.searchParams.set('limit', String(limit))

      const res = await fetch(url.toString(), {
        next:    { revalidate: CACHE_TTL },
        headers: { 'Accept': 'application/json' },
      })

      if (!res.ok) {
        throw new Error(`[fred] HTTP ${res.status} for series ${seriesId}`)
      }

      const json = await res.json() as FredSeriesResponse
      return json.observations ?? []
    },
  )
}

// ─── Fetch multiple series in parallel ────────────────────────────────────

export async function getMultipleSeries(
  seriesIds: string[],
  limitPerSeries = 13, // 13 lets us compute 12-month YoY for monthly series
): Promise<Record<string, FredObservation[]>> {
  const results = await Promise.allSettled(
    seriesIds.map((id) => getSeriesObservations(id, limitPerSeries)),
  )

  return Object.fromEntries(
    seriesIds.map((id, i) => {
      const r = results[i]
      return [id, r.status === 'fulfilled' ? r.value : []]
    }),
  )
}
