export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import AssetCard from '@/components/dashboard/AssetCard'
import GlobalSearch from '@/components/search/GlobalSearch'
import CurrencyStrengthMeter from '@/components/forex/CurrencyStrengthMeter'
import { getForexCards } from '@/lib/api/forex'

export const metadata: Metadata = {
  title: 'Forex',
  description: 'Major currency pairs with live rates, central bank analysis, and AI-powered forex intelligence on MarketLens.',
}

export default async function ForexPage() {
  const pairs = await getForexCards().catch(() => [])

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">

        {/* Page header */}
        <div className="mb-6 space-y-4">
          <div>
            <h1 className="font-mono text-[22px] font-bold tracking-tight text-white">
              Forex Market
            </h1>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
              Real-time foreign exchange rates and currency pair analysis
            </p>
          </div>
          <GlobalSearch
            placeholder="Search currency pairs, e.g. EUR/USD..."
            className="w-full max-w-lg"
          />
        </div>

        {/* Currency Strength Meter */}
        <div className="mb-6">
          <CurrencyStrengthMeter />
        </div>

        {/* Grid */}
        {pairs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pairs.map((asset) => (
              <AssetCard key={`forex-${asset.symbol}`} asset={asset} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-20 text-center">
            <p className="text-3xl">📭</p>
            <p className="mt-3 text-sm font-medium text-[var(--text)]">No forex data available</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Check your API connection and try again.</p>
          </div>
        )}
      </div>
    </div>
  )
}
