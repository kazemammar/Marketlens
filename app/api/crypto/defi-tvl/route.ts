export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cachedFetch } from '@/lib/cache/redis'

const CACHE_TTL = 60 * 60

interface ChainTvl {
  name: string
  tvl:  number
}

export async function GET(req: Request) {
  const url   = new URL(req.url)
  const chain = url.searchParams.get('chain')

  try {
    const chains = await cachedFetch<ChainTvl[]>(
      'defi:chains:tvl',
      CACHE_TTL,
      async () => {
        const res = await fetch('https://api.llama.fi/v2/chains')
        if (!res.ok) throw new Error(`DefiLlama HTTP ${res.status}`)
        const data = await res.json() as ChainTvl[]
        return data.filter(c => c.tvl > 0).sort((a, b) => b.tvl - a.tvl).slice(0, 20)
      },
    )

    if (chain) {
      const found = chains.find(c => c.name.toLowerCase() === chain.toLowerCase())
      return NextResponse.json(found ?? null)
    }
    return NextResponse.json(chains)
  } catch (err) {
    console.error('[defi-tvl]', err)
    return NextResponse.json(chain ? null : [])
  }
}
