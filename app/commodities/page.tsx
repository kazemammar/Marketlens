export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import AssetCard from '@/components/dashboard/AssetCard'
import GlobalSearch from '@/components/search/GlobalSearch'
import OilEnergyPanel from '@/components/warroom/OilEnergyPanel'
import { getYahooQuotesBatch, getYahooSparkline } from '@/lib/api/yahoo'
import { DEFAULT_COMMODITIES } from '@/lib/utils/constants'
import { AssetCardData } from '@/lib/utils/types'

export const metadata: Metadata = {
  title: 'Commodities',
  description: 'Track gold, oil, natural gas, and more with geopolitical risk monitoring and supply chain intelligence on MarketLens.',
}

export default async function CommoditiesPage() {
  const symbols = DEFAULT_COMMODITIES.map((c) => c.symbol)
  const [quotes, ...sparklines] = await Promise.all([
    getYahooQuotesBatch(symbols).catch(() => [] as Awaited<ReturnType<typeof getYahooQuotesBatch>>),
    ...symbols.map((s) => getYahooSparkline(s).catch(() => [] as number[])),
  ])

  const assets: AssetCardData[] = []
  for (let i = 0; i < DEFAULT_COMMODITIES.length; i++) {
    const cfg = DEFAULT_COMMODITIES[i]
    const q   = quotes.find((qq) => qq.symbol === cfg.symbol)
    if (!q || q.price <= 0) continue
    assets.push({
      symbol:        cfg.symbol,
      name:          cfg.name,
      type:          'commodity',
      price:         q.price,
      change:        q.change,
      changePercent: q.changePercent,
      currency:      'USD',
      open:          q.price,
      high:          q.price,
      low:           q.price,
      sparkline:     sparklines[i] ?? [],
    })
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">

        {/* Page header */}
        <div className="mb-6 space-y-4">
          <div>
            <h1 className="font-mono text-[22px] font-bold tracking-tight text-[var(--text)]">
              Commodities
            </h1>
            <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
              Real-time commodity prices — gold, silver, crude oil, natural gas, and more
            </p>
          </div>
          <GlobalSearch
            placeholder="Search commodities, e.g. Gold, Oil..."
            className="w-full max-w-lg"
          />
        </div>

        {/* EIA Energy Intelligence */}
        <div className="mb-6">
          <OilEnergyPanel />
        </div>

        {/* Grid */}
        {assets.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((asset) => (
              <AssetCard key={`commodity-${asset.symbol}`} asset={asset} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded border border-dashed border-[var(--border)] py-20 text-center">
            <p className="text-3xl">📭</p>
            <p className="mt-3 font-mono text-[14px] font-medium text-[var(--text)]">No commodity data available</p>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">Check your API connection and try again.</p>
          </div>
        )}
      </div>
    </div>
  )
}
