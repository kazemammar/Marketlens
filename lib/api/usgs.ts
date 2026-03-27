import { cachedFetch } from '@/lib/cache/redis'

export interface Earthquake {
  id: string
  magnitude: number
  place: string
  time: number      // unix ms
  lat: number
  lng: number
  depth: number     // km
  url: string       // USGS detail page
  tsunami: boolean
}

export async function getRecentEarthquakes(): Promise<Earthquake[]> {
  return cachedFetch<Earthquake[]>(
    'usgs:earthquakes:v1',
    600, // 10 min cache
    async () => {
      // USGS GeoJSON feed — magnitude 4.5+ in the last 7 days, no API key needed
      const res = await fetch(
        'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson',
        { signal: AbortSignal.timeout(8000) }
      )
      if (!res.ok) return []
      const data = await res.json()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data.features ?? []).map((f: any) => ({
        id: f.id,
        magnitude: f.properties.mag,
        place: f.properties.place,
        time: f.properties.time,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
        depth: f.geometry.coordinates[2],
        url: f.properties.url,
        tsunami: f.properties.tsunami === 1,
      })).sort((a: Earthquake, b: Earthquake) => b.magnitude - a.magnitude)
    }
  )
}
