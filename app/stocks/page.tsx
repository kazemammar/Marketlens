import type { Metadata } from 'next'
import StockExplorer from '@/components/pages/StockExplorer'
import StockSearch from '@/components/pages/StockSearch'

export const metadata: Metadata = {
  title: 'Stock Market — MarketLens',
  description: 'Real-time prices, analysis, and AI-powered intelligence for US equities.',
}

export default function StocksPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">

        {/* Page header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-mono text-[22px] font-bold tracking-tight text-white">
              Stock Market
            </h1>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
              Real-time prices, analysis, and AI-powered intelligence for US equities
            </p>
          </div>
          <StockSearch />
        </div>

        {/* Explorer: indices strip + sector tabs + grid */}
        <StockExplorer />

      </div>
    </div>
  )
}
