export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import AssetCard from '@/components/dashboard/AssetCard'
import GlobalSearch from '@/components/search/GlobalSearch'
import { getQuotesBatched } from '@/lib/api/finnhub'
import { DEFAULT_COMMODITIES } from '@/lib/utils/constants'
import { AssetCardData } from '@/lib/utils/types'

export const metadata: Metadata = {
  title: 'Commodities — MarketLens',
  description: 'Real-time commodity prices including gold, oil, natural gas, and more.',
}

export default async function CommoditiesPage() {
  const symbols = DEFAULT_COMMODITIES.map((c) => c.symbol)
  const quotes  = await getQuotesBatched(symbols, 2, 1_500).catch(() => new Map<string, never>())

  const assets: AssetCardData[] = []
  for (const cfg of DEFAULT_COMMODITIES) {
    const q = quotes.get(cfg.symbol)
    if (!q) continue
    const price = q.price > 0 ? q.price : q.previousClose
    if (price <= 0) continue
    assets.push({
      symbol:        cfg.symbol,
      name:          cfg.name,
      type:          'commodity',
      price,
      change:        q.price > 0 ? q.change        : 0,
      changePercent: q.price > 0 ? q.changePercent : 0,
      currency:      'USD',
      open:  q.open  > 0 ? q.open  : price,
      high:  q.high  > 0 ? q.high  : price,
      low:   q.low   > 0 ? q.low   : price,
    })
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">

        {/* Page header */}
        <div className="mb-6 space-y-4">
          <div>
            <h1 className="font-mono text-[22px] font-bold tracking-tight text-white">
              Commodities
            </h1>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
              Real-time commodity prices — gold, silver, crude oil, natural gas, and more
            </p>
          </div>
          <GlobalSearch
            placeholder="Search commodities, e.g. Gold, Oil..."
            className="w-full max-w-lg"
          />
        </div>

        {/* Grid */}
        {assets.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((asset) => (
              <AssetCard key={`commodity-${asset.symbol}`} asset={asset} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-20 text-center">
            <p className="text-3xl">📭</p>
            <p className="mt-3 text-sm font-medium text-[var(--text)]">No commodity data available</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Check your API connection and try again.</p>
          </div>
        )}
      </div>
    </div>
  )
}
