export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getPeers, getQuote, getCompanyProfile } from '@/lib/api/finnhub'

interface PeerData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  marketCap: number | null
  industry: string | null
  logo: string | null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params
  try {
    const peerSymbols = await getPeers(symbol)
    const peerData = await Promise.allSettled(
      peerSymbols.map(async (s): Promise<PeerData> => {
        const [quote, profile] = await Promise.allSettled([getQuote(s), getCompanyProfile(s)])
        const q = quote.status === 'fulfilled' ? quote.value : null
        const p = profile.status === 'fulfilled' ? profile.value : null
        return {
          symbol: s,
          name: p?.name ?? s,
          price: q?.price ?? 0,
          change: q?.change ?? 0,
          changePercent: q?.changePercent ?? 0,
          marketCap: p?.marketCapitalization ?? null,
          industry: p?.finnhubIndustry ?? null,
          logo: p?.logo ?? null,
        }
      })
    )
    const peers = peerData
      .filter((r): r is PromiseFulfilledResult<PeerData> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter(p => p.price > 0)
    return NextResponse.json(peers)
  } catch (err) {
    console.error('[api/stock/peers]', err)
    return NextResponse.json([])
  }
}
