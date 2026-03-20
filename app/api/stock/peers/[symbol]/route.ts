import { NextResponse } from 'next/server'
import { getPeers, getCompanyProfile } from '@/lib/api/finnhub'
import { redis } from '@/lib/cache/redis'

export interface PeerInfo {
  symbol:    string
  name:      string
  logo:      string | null
  industry:  string | null
  marketCap: number | null
}

const CACHE_TTL = 86_400  // 24 hours — peer lists are stable

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params
  const cacheKey = `peers:v1:${symbol.toUpperCase()}`

  try {
    const cached = await redis.get<PeerInfo[]>(cacheKey)
    if (cached) return NextResponse.json(cached)
  } catch { /* fall through */ }

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

    redis.set(cacheKey, peers, { ex: CACHE_TTL }).catch(() => {})
    return NextResponse.json(peers)
  } catch (err) {
    console.error('[api/stock/peers]', err)
    return NextResponse.json([])
  }
}
