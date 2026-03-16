export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cachedFetch } from '@/lib/cache/redis'

// Map of uppercase symbol to CoinGecko ID
// (extends CRYPTO_SYMBOL_TO_CG_ID from constants.ts)
const CG_IDS: Record<string, string> = {
  BTC:  'bitcoin',
  ETH:  'ethereum',
  SOL:  'solana',
  BNB:  'binancecoin',
  XRP:  'ripple',
  ADA:  'cardano',
  AVAX: 'avalanche-2',
  DOT:  'polkadot',
  MATIC:'matic-network',
  LINK: 'chainlink',
  UNI:  'uniswap',
  DOGE: 'dogecoin',
  LTC:  'litecoin',
  ATOM: 'cosmos',
}

interface CryptoStatsResponse {
  name:              string
  symbol:            string
  rank:              number
  price:             number
  marketCap:         number
  volume24h:         number
  high24h:           number
  low24h:            number
  priceChange24h:    number
  circulatingSupply: number
  totalSupply:       number | null
  maxSupply:         number | null
  ath:               number
  athChangePercent:  number
  atl:               number
  atlChangePercent:  number
  description:       string
  links: {
    website:    string
    twitter:    string
    reddit:     string
    blockchain: string
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const { symbol } = await params
  const cgId = CG_IDS[symbol.toUpperCase()]
  if (!cgId) return NextResponse.json(null)

  try {
    const stats = await cachedFetch<CryptoStatsResponse>(
      `crypto:stats:${cgId}`,
      15 * 60, // 15 minutes
      async () => {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${cgId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
          { headers: { Accept: 'application/json' } }
        )
        if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = await res.json() as Record<string, any>
        const md = d.market_data ?? {}
        return {
          name:              d.name ?? symbol,
          symbol:            (d.symbol ?? symbol).toUpperCase(),
          rank:              d.market_cap_rank ?? 0,
          price:             md.current_price?.usd ?? 0,
          marketCap:         md.market_cap?.usd ?? 0,
          volume24h:         md.total_volume?.usd ?? 0,
          high24h:           md.high_24h?.usd ?? 0,
          low24h:            md.low_24h?.usd ?? 0,
          priceChange24h:    md.price_change_percentage_24h ?? 0,
          circulatingSupply: md.circulating_supply ?? 0,
          totalSupply:       md.total_supply ?? null,
          maxSupply:         md.max_supply ?? null,
          ath:               md.ath?.usd ?? 0,
          athChangePercent:  md.ath_change_percentage?.usd ?? 0,
          atl:               md.atl?.usd ?? 0,
          atlChangePercent:  md.atl_change_percentage?.usd ?? 0,
          description:       (d.description?.en ?? '').slice(0, 300),
          links: {
            website:    d.links?.homepage?.[0] ?? '',
            twitter:    d.links?.twitter_screen_name ?? '',
            reddit:     d.links?.subreddit_url ?? '',
            blockchain: d.links?.blockchain_site?.[0] ?? '',
          },
        }
      },
    )
    return NextResponse.json(stats)
  } catch (err) {
    console.error(`[crypto/stats/${symbol}]`, err)
    return NextResponse.json(null)
  }
}
