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

        {/* Card wrapper */}
        <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
          {/* Card header */}
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
              <path d="M1 12l4-5 3 3 7-8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
              Stock Market
            </span>
            <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
          </div>

          {/* Card body */}
          <div className="p-3">
            {/* Search + stock search */}
            <div className="mb-6">
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <p className="font-mono text-[10px] text-[var(--text-muted)]">
                  Real-time prices and AI analysis for 300+ US equities across 11 sectors
                </p>
                <StockSearch />
              </div>
              <GlobalSearch
                placeholder="Search stocks by symbol or name..."
                className="w-full max-w-lg"
              />
            </div>

            {/* Explorer: indices strip + sector tabs + grid */}
            <StockExplorer />

            {/* Earnings Calendar — full week, anchor-linked from dashboard */}
            <div id="earnings" className="mt-8 scroll-mt-20">
              <PanelErrorBoundary fallbackTitle="Earnings Calendar">
                <EarningsCalendar />
              </PanelErrorBoundary>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
