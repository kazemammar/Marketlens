import type { Metadata } from 'next'
import StockExplorer from '@/components/pages/StockExplorer'
import StockSearch from '@/components/pages/StockSearch'
import GlobalSearch from '@/components/search/GlobalSearch'
import EarningsCalendar from '@/components/warroom/EarningsCalendar'
import PanelErrorBoundary from '@/components/ui/PanelErrorBoundary'

export const metadata: Metadata = {
  title: 'Stocks',
  description: 'Browse and track US stocks with real-time prices, AI analysis, and sector breakdowns on MarketLens.',
}

export default function StocksPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">

        {/* Page header — NOT in a card */}
        <div className="mb-6">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-mono text-[22px] font-bold tracking-tight text-[var(--text)]">
                Stock Market
              </h1>
              <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
                Real-time prices and AI analysis for 300+ US equities across 11 sectors
              </p>
            </div>
            <StockSearch />
          </div>
          <GlobalSearch placeholder="Search stocks by symbol or name..." className="w-full max-w-lg" />
        </div>

        {/* Market Indices + Stock Explorer — each in its own card */}
        <StockExplorer />

        {/* Earnings Calendar — full week, anchor-linked from dashboard */}
        <div id="earnings" className="mt-4 scroll-mt-20">
          <PanelErrorBoundary fallbackTitle="Earnings Calendar">
            <EarningsCalendar />
          </PanelErrorBoundary>
        </div>

      </div>
    </div>
  )
}
