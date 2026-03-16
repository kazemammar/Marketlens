export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import AssetCard from '@/components/dashboard/AssetCard'
import { getQuotesBatched } from '@/lib/api/finnhub'
import { DEFAULT_ETFS } from '@/lib/utils/constants'
import { AssetCardData } from '@/lib/utils/types'

const ETF_NAMES: Record<string, string> = {
  SPY:  'SPDR S&P 500',          QQQ:  'Invesco Nasdaq 100',
  DIA:  'SPDR Dow Jones',        IWM:  'iShares Russell 2000',
  VTI:  'Vanguard Total Mkt',    GLD:  'SPDR Gold Shares',
  SLV:  'iShares Silver',        TLT:  'iShares 20Y+ Treasury',
  VNQ:  'Vanguard Real Est.',    ARKK: 'ARK Innovation',
}

export const metadata: Metadata = {
  title: 'ETFs — MarketLens',
  description: 'Real-time prices and analysis for major exchange-traded funds.',
}

export default async function ETFPage() {
  const quotes = await getQuotesBatched(DEFAULT_ETFS, 2, 1_500).catch(() => new Map<string, never>())

  const assets: AssetCardData[] = []
  for (const sym of DEFAULT_ETFS) {
    const q = quotes.get(sym)
    if (!q) continue
    const price = q.price > 0 ? q.price : q.previousClose
    if (price <= 0) continue
    assets.push({
      symbol:        sym,
      name:          ETF_NAMES[sym] ?? sym,
      type:          'etf',
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
        <div className="mb-6">
          <h1 className="font-mono text-[22px] font-bold tracking-tight text-white">
            ETFs
          </h1>
          <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
            Real-time prices and analysis for major exchange-traded funds
          </p>
        </div>

        {/* Grid */}
        {assets.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {assets.map((asset) => (
              <AssetCard key={`etf-${asset.symbol}`} asset={asset} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-20 text-center">
            <p className="text-3xl">📭</p>
            <p className="mt-3 text-sm font-medium text-[var(--text)]">No ETF data available</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Check your API connection and try again.</p>
          </div>
        )}
      </div>
    </div>
  )
}
