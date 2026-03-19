export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import AssetCard from '@/components/dashboard/AssetCard'
import GlobalSearch from '@/components/search/GlobalSearch'
import { getCryptoMarkets } from '@/lib/api/coingecko'
import { AssetCardData } from '@/lib/utils/types'

export const metadata: Metadata = {
  title: 'Crypto',
  description: 'Top cryptocurrencies by market cap with live prices, Fear & Greed index, and DeFi analytics on MarketLens.',
}

export default async function CryptoPage() {
  const coins = await getCryptoMarkets(1, 'usd', 20).catch(() => [])

  const assets: AssetCardData[] = coins.map((c) => ({
    symbol:        c.symbol.toUpperCase(),
    name:          c.name,
    type:          'crypto',
    price:         c.currentPrice,
    change:        c.priceChange24h,
    changePercent: c.priceChangePercent24h,
    currency:      'USD',
    open:          c.currentPrice - c.priceChange24h,
    high:          c.high24h,
    low:           c.low24h,
  }))

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">

        {/* Page header */}
        <div className="mb-6 space-y-4">
          <div>
            <h1 className="font-mono text-[22px] font-bold tracking-tight text-[var(--text)]">
              Crypto Market
            </h1>
            <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
              Real-time prices and analysis for top cryptocurrencies by market cap
            </p>
          </div>
          <GlobalSearch
            placeholder="Search crypto by name or symbol..."
            className="w-full max-w-lg"
          />
        </div>

        {/* Grid */}
        {assets.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {assets.map((asset) => (
              <AssetCard key={`crypto-${asset.symbol}`} asset={asset} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded border border-dashed border-[var(--border)] py-20 text-center">
            <p className="text-3xl">📭</p>
            <p className="mt-3 font-mono text-[14px] font-medium text-[var(--text)]">No crypto data available</p>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">Check your API connection and try again.</p>
          </div>
        )}
      </div>
    </div>
  )
}
