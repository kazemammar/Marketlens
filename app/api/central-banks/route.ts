import { NextResponse }           from 'next/server'
import { getCentralBankRates }   from '@/lib/api/central-banks'
import type { CentralBankRate }  from '@/lib/api/central-banks'
import { cachedFetch }           from '@/lib/cache/redis'

export interface CentralBanksPayload {
  rates:       CentralBankRate[]
  generatedAt: number
}

const CACHE_KEY = 'central-banks:rates:v4'  // bumped: fixed BoE date parsing
const CACHE_TTL = 6 * 60 * 60              // 6 hours

export async function GET() {
  const data = await cachedFetch<CentralBanksPayload>(
    CACHE_KEY,
    CACHE_TTL,
    async () => {
      const rates = await getCentralBankRates()
      return { rates, generatedAt: Date.now() } satisfies CentralBanksPayload
    },
  )
  return NextResponse.json(data)
}
