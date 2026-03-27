export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import AssetCard          from '@/components/dashboard/AssetCard'
import GlobalSearch        from '@/components/search/GlobalSearch'
import CryptoIntelPanels   from '@/components/crypto/CryptoIntelPanels'
import { getCryptoMarkets } from '@/lib/api/coingecko'
import { AssetCardData }    from '@/lib/utils/types'

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

        {/* Page header — NOT in a card */}
        <div className="mb-6 space-y-4">
          <div>
            <h1 className="font-mono text-[22px] font-bold tracking-tight text-[var(--text)]">
              Crypto Market
            </h1>
            <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
              Real-time prices and analysis for top cryptocurrencies by market cap
            </p>
          </div>
          <GlobalSearch placeholder="Search crypto by name or symbol..." className="w-full max-w-lg" />
        </div>

        {/* Intel panels — stablecoin peg monitor + BTC ETF flows */}
        <CryptoIntelPanels />

        {/* Crypto Grid — wrap in its own card */}
        <div className="mt-4 overflow-hidden rounded border border-[var(--border)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
            <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M9.5 4.5H7.2c-.7 0-1.2.5-1.2 1.2s.5 1.2 1.2 1.2h1.6c.7 0 1.2.5 1.2 1.2s-.5 1.2-1.2 1.2H6.5M8 3.5v1M8 11.5v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">Top Cryptocurrencies</span>
            <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
          </div>
          <div className="p-3">
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
      </div>
    </div>
  )
}
