import { NextResponse }                    from 'next/server'
import { getAllEiaSeries, type EiaSeries } from '@/lib/api/eia'

export interface EnergyPayload {
  series:      EiaSeries[]
  generatedAt: number
}

export async function GET() {
  try {
    const series = await getAllEiaSeries()
    return NextResponse.json({ series, generatedAt: Date.now() } satisfies EnergyPayload)
  } catch (err) {
    console.error('[api/energy]', err)
    return NextResponse.json({ series: [], generatedAt: Date.now() } satisfies EnergyPayload)
  }
}
