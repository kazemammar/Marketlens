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
            <h1 className="font-mono text-[22px] font-bold tracking-tight text-[var(--text)]">
              Forex Market
            </h1>
            <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
              Real-time foreign exchange rates and currency pair analysis
            </p>
          </div>
          <GlobalSearch
            placeholder="Search currency pairs, e.g. EUR/USD..."
            className="w-full max-w-lg"
          />
        </div>

        {/* Currency Strength Meter — top panel */}
        <div className="mb-1.5">
          <CurrencyStrengthMeter />
        </div>

        {/* Currency Pairs panel */}
        <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
          {/* Panel header */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2">
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
              <path d="M2 14h12M4 10v4M8 7v7M12 4v10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
              Currency Pairs
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
            <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">{pairs.length} pairs</span>
          </div>

          {/* Grid */}
          {pairs.length > 0 ? (
            <div className="p-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {pairs.map((asset) => (
                <AssetCard key={`forex-${asset.symbol}`} asset={asset} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-3xl">📭</p>
              <p className="mt-3 font-mono text-[14px] font-medium text-[var(--text)]">No forex data available</p>
              <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">Check your API connection and try again.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
