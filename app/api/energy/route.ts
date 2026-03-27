import { NextResponse }                    from 'next/server'
import { getAllEiaSeries, type EiaSeries } from '@/lib/api/eia'
import { cacheHeaders } from '@/lib/utils/cache-headers'

const EDGE_HEADERS = cacheHeaders(3600)

export interface EnergyPayload {
  series:      EiaSeries[]
  generatedAt: number
}

export async function GET() {
  try {
    const series = await getAllEiaSeries()
    return NextResponse.json({ series, generatedAt: Date.now() } satisfies EnergyPayload, { headers: EDGE_HEADERS })
  } catch (err) {
    console.error('[api/energy]', err)
    return NextResponse.json({ series: [], generatedAt: Date.now() } satisfies EnergyPayload, { headers: EDGE_HEADERS })
  }
}
