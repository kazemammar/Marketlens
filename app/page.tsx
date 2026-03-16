export const dynamic = 'force-dynamic'

import { Suspense }      from 'react'
import TickerTape        from '@/components/layout/TickerTape'
import MarketTabs        from '@/components/dashboard/MarketTabs'
import MarketBrief       from '@/components/warroom/MarketBrief'
import CommodityStrip    from '@/components/warroom/CommodityStrip'
import GeoMap            from '@/components/warroom/GeoMap'
import IntelPanel        from '@/components/warroom/IntelPanel'
import MarketRadar       from '@/components/warroom/MarketRadar'
import FXMonitor         from '@/components/warroom/FXMonitor'
import RiskGauge         from '@/components/warroom/RiskGauge'
import SignalsPanel      from '@/components/warroom/SignalsPanel'
import { AssetCardData, AssetType } from '@/lib/utils/types'
import { getQuotesBatched }   from '@/lib/api/finnhub'
import { DEFAULT_STOCKS }     from '@/lib/utils/constants'

const VALID_TABS: AssetType[] = ['stock', 'crypto', 'forex', 'commodity', 'etf']

const STOCK_NAMES: Record<string, string> = {
  AAPL: 'Apple Inc.',        MSFT: 'Microsoft Corp.',
  GOOGL:'Alphabet Inc.',     AMZN: 'Amazon.com',
  NVDA: 'NVIDIA Corp.',      META: 'Meta Platforms',
  TSLA: 'Tesla Inc.',     'BRK.B': 'Berkshire Hathaway',
  JPM:  'JPMorgan Chase',    V:    'Visa Inc.',
  UNH:  'UnitedHealth',      XOM:  'Exxon Mobil',
  JNJ:  'Johnson & Johnson', PG:   'Procter & Gamble',
  MA:   'Mastercard',
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: tabParam } = await searchParams
  const initialTab = VALID_TABS.includes(tabParam as AssetType)
    ? (tabParam as AssetType)
    : 'stock'

  let initialStocks: AssetCardData[] = []
  try {
    const map = await getQuotesBatched(DEFAULT_STOCKS)
    initialStocks = DEFAULT_STOCKS.flatMap((sym): AssetCardData[] => {
      const q = map.get(sym)
      if (!q) return []
      const price = q.price > 0 ? q.price : q.previousClose
      if (price <= 0) return []
      return [{
        symbol:        sym,
        name:          STOCK_NAMES[sym] ?? sym,
        type:          'stock',
        price,
        change:        q.price > 0 ? q.change        : 0,
        changePercent: q.price > 0 ? q.changePercent : 0,
        currency:      'USD',
        open:  q.open  > 0 ? q.open  : price,
        high:  q.high  > 0 ? q.high  : price,
        low:   q.low   > 0 ? q.low   : price,
      }]
    })
  } catch { /* non-fatal */ }

  return (
    <div className="min-h-screen">

      {/* ══ AI BRIEF BAR — full width slim ══════════════════════════════ */}
      <Suspense fallback={<div className="h-10 border-b border-[var(--border)] bg-[var(--surface)]" />}>
        <MarketBrief />
      </Suspense>

      {/* ══ COMMODITY STRIP — 40px ══════════════════════════════════════ */}
      <CommodityStrip />

      {/* ══ MAP + INTEL PANEL — 65/35 grid (stacked on mobile) ══════════ */}
      <div
        className="grid border-b border-[var(--border)]"
        style={{ gridTemplateColumns: 'minmax(0,65fr) minmax(0,35fr)' }}
      >
        {/* GeoMap — left */}
        <div className="border-r border-[var(--border)]">
          <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
            <span className="h-1 w-1 animate-pulse rounded-full bg-red-500" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
              Geopolitical Intelligence Map
            </span>
          </div>
          <GeoMap />
        </div>

        {/* IntelPanel — right, scrollable */}
        <div
          className="flex flex-col overflow-hidden bg-[var(--surface)]"
          style={{ height: 'clamp(400px, 55vw, 600px)' }}
        >
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
            <span className="h-1 w-1 animate-pulse rounded-full bg-purple-400" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
              Intelligence Feed
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <IntelPanel />
          </div>
        </div>
      </div>

      {/* ══ DATA PANELS — 4-column row (2x2 on mobile) ══════════════════ */}
      <div className="grid grid-cols-2 border-b border-[var(--border)] bg-[var(--surface)] lg:grid-cols-4">
        <div className="war-panel min-w-0 overflow-hidden"><MarketRadar /></div>
        <div className="war-panel min-w-0 overflow-hidden"><FXMonitor /></div>
        <div className="war-panel min-w-0 overflow-hidden"><RiskGauge /></div>
        <div className="min-w-0 overflow-hidden"><SignalsPanel /></div>
      </div>

      {/* ══ SECTION DIVIDER ══════════════════════════════════════════════ */}
      <div className="h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

      {/* ══ MARKET DASHBOARD ══════════════════════════════════════════════ */}
      <TickerTape />

      <main className="px-3 py-4 sm:px-4">
        {/* Dashboard header */}
        <div className="mb-3 flex items-center gap-2">
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-blue-400" aria-hidden>
            <polyline points="1,12 5,7 8,9 11,4 15,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Market Overview
          </span>
          <span className="text-[11px] text-[var(--text-muted)] opacity-60">
            Stocks · Crypto · Forex · Commodities · ETFs
          </span>
        </div>

        <MarketTabs initialStocks={initialStocks} initialTab={initialTab} />
      </main>
    </div>
  )
}
