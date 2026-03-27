import { NextResponse }           from 'next/server'
import { getCentralBankRates }   from '@/lib/api/central-banks'
import type { CentralBankRate }  from '@/lib/api/central-banks'
import { cachedFetch }           from '@/lib/cache/redis'
import { cacheHeaders } from '@/lib/utils/cache-headers'
import { withRateLimit } from '@/lib/utils/rate-limit'

const EDGE_HEADERS = cacheHeaders(3600)

export interface CentralBanksPayload {
  rates:       CentralBankRate[]
  generatedAt: number
}

const CACHE_KEY = 'central-banks:rates:v4'  // bumped: fixed BoE date parsing
const CACHE_TTL = 6 * 60 * 60              // 6 hours

export async function GET(req: Request) {
  const limited = withRateLimit(req, 60)
  if (limited) return limited

  const data = await cachedFetch<CentralBanksPayload>(
    CACHE_KEY,
    CACHE_TTL,
    async () => {
      const rates = await getCentralBankRates()
      return { rates, generatedAt: Date.now() } satisfies CentralBanksPayload
    },
  )
  return NextResponse.json(data, { headers: EDGE_HEADERS })
}
