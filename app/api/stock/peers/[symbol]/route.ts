export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getPeers, getCompanyProfile } from '@/lib/api/finnhub'

export interface PeerInfo {
  symbol:    string
  name:      string
  logo:      string | null
  industry:  string | null
  marketCap: number | null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params
  try {
    const peerSymbols = await getPeers(symbol)
    const peerData = await Promise.allSettled(
      peerSymbols.slice(0, 6).map(async (s): Promise<PeerInfo> => {
        try {
          const p = await getCompanyProfile(s)
          return {
            symbol:    s,
            name:      p?.name       ?? s,
            logo:      p?.logo       ?? null,
            industry:  p?.finnhubIndustry       ?? null,
            marketCap: p?.marketCapitalization  ?? null,
          }
        } catch {
          return { symbol: s, name: s, logo: null, industry: null, marketCap: null }
        }
      })
    )
    const peers = peerData
      .map(r => r.status === 'fulfilled' ? r.value : null)
      .filter((p): p is PeerInfo => p !== null)
    return NextResponse.json(peers)
  } catch (err) {
    console.error('[api/stock/peers]', err)
    return NextResponse.json([])
  }
}
