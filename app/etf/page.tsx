export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import AssetCard from '@/components/dashboard/AssetCard'
import GlobalSearch from '@/components/search/GlobalSearch'
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
  title: 'ETFs',
  description: 'Top ETFs with holdings analysis, sector allocation, and AI-powered insights on MarketLens.',
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
      <div className="mx-auto max-w-screen-xl px-3 sm:px-4 py-4">
        {/* Page header — NOT in a card */}
        <div className="mb-6 space-y-4">
          <div>
            <h1 className="font-mono text-[22px] font-bold tracking-tight text-[var(--text)]">
              ETFs
            </h1>
            <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
              Top ETFs — SPY, QQQ, and more — with real-time quotes
            </p>
          </div>
          <GlobalSearch placeholder="Search ETFs by symbol or name..." className="w-full max-w-lg" />
        </div>

        {/* Asset grid — wrapped in its own card */}
        <div className="overflow-hidden rounded border border-[var(--border)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
              <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
              <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">ETF Overview</span>
            <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
          </div>
          <div className="p-3">
            {assets.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {assets.map((asset) => (
                  <AssetCard key={`etf-${asset.symbol}`} asset={asset} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded border border-dashed border-[var(--border)] py-20 text-center">
                <p className="text-3xl">📭</p>
                <p className="mt-3 font-mono text-[14px] font-medium text-[var(--text)]">No ETF data available</p>
                <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">Check your API connection and try again.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
