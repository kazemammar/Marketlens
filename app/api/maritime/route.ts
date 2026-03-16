export const dynamic = 'force-dynamic'

import { NextResponse }      from 'next/server'
import { getMaritimeTraffic } from '@/lib/api/maritime'
import type { Ship, MaritimeData } from '@/lib/api/maritime'
import { cachedFetch }       from '@/lib/cache/redis'

const CACHE_TTL = 5 * 60 // 5 minutes

// ─── Add slight random position variation to simulate movement ────────────

function animateShips(ships: Ship[]): Ship[] {
  return ships.map((ship) => ({
    ...ship,
    lat: ship.lat + (Math.random() - 0.5) * 0.016,  // ±0.008 degrees
    lng: ship.lng + (Math.random() - 0.5) * 0.016,
  }))
}

export async function GET() {
  try {
    // We use a short cache but still simulate movement by busting cache keys
    // based on the current 5-minute window
    const windowKey = Math.floor(Date.now() / (CACHE_TTL * 1000))

    const data = await cachedFetch<MaritimeData>(
      `maritime:traffic:${windowKey}`,
      CACHE_TTL,
      async () => {
        const base    = getMaritimeTraffic()
        const animated = animateShips(base.ships)
        return {
          ships:       animated,
          chokepoints: base.chokepoints,  // counts use original static data
        }
      },
    )

    return NextResponse.json(data)
  } catch (err) {
    console.error('[maritime] route error:', err)
    return NextResponse.json({ ships: [], chokepoints: { hormuz: 0, suez: 0, malacca: 0, babelMandeb: 0 } })
  }
}
