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
import HeatmapPanel      from '@/components/warroom/HeatmapPanel'
import EconomicIndicators   from '@/components/warroom/EconomicIndicators'
import PredictionMarkets    from '@/components/warroom/PredictionMarkets'
import MoversStrip         from '@/components/warroom/MoversStrip'
import NewsBriefing         from '@/components/warroom/NewsBriefing'
import MaritimePanel        from '@/components/warroom/MaritimePanel'
import StatusBar            from '@/components/layout/StatusBar'
import GlobalSearch         from '@/components/search/GlobalSearch'
import SectionReveal        from '@/components/layout/SectionReveal'
import { AssetType }           from '@/lib/utils/types'
import { getHomepageData }     from '@/lib/api/homepage'
import PortfolioIntroModal     from '@/components/ui/PortfolioIntroModal'

const VALID_TABS: AssetType[] = ['stock', 'crypto', 'forex', 'commodity', 'etf']

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: tabParam } = await searchParams
  const initialTab = VALID_TABS.includes(tabParam as AssetType)
    ? (tabParam as AssetType)
    : 'stock'

  let homepage = await getHomepageData().catch(() => null)

  return (
    <div className="min-h-screen">

      {/* ══ AI BRIEF BAR — full width slim ══════════════════════════════ */}
      <Suspense fallback={
        <div className="ai-brief-bar flex h-10 items-center gap-3 border-b border-[var(--border)] px-4">
          <div className="skeleton h-2 w-2 rounded-full" />
          <div className="skeleton h-2.5 flex-1 max-w-2xl rounded" />
        </div>
      }>
        <MarketBrief />
      </Suspense>

      {/* ══ COMMODITY STRIP — 40px ══════════════════════════════════════ */}
      <CommodityStrip initialData={homepage?.commodityStrip} />

      {/* ══ MAP + INTEL PANEL — 65/35 grid (stacked on mobile) ══════════ */}
      <div className="grid grid-cols-1 border-b border-[var(--border)] lg:grid-cols-[65fr_35fr] lg:h-[532px] xl:h-[632px]">
        {/* GeoMap — left */}
        <div className="flex flex-col overflow-hidden lg:border-r border-[var(--border)]">
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-red-500" />
            <span className="truncate font-mono font-semibold uppercase text-[var(--text)]" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>
              Geopolitical Intelligence Map
            </span>
          </div>
          <div className="h-[240px] sm:h-[320px] lg:flex-1" style={{ isolation: 'isolate' }}>
            <GeoMap />
          </div>
        </div>

        {/* IntelPanel — right, fixed height = grid row height */}
        <div className="h-[300px] sm:h-[350px] lg:h-full flex flex-col overflow-hidden bg-[var(--surface)]">
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
            <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            <span className="font-mono font-semibold uppercase text-[var(--text)]" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>
              Intelligence Feed
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <IntelPanel />
          </div>
        </div>
      </div>

      {/* ══ MARKET INTELLIGENCE SECTION HEADER ════════════════════════════ */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          {/* animated radar icon */}
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" style={{ color: 'var(--accent)' }} aria-hidden>
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1"/>
            <circle cx="8" cy="8" r="1" fill="currentColor"/>
          </svg>
          <span className="truncate font-mono font-semibold uppercase text-[var(--text)]" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>
            Market Intelligence
          </span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-[var(--border)] to-transparent" />
        <div className="hidden sm:flex items-center gap-1">
          <span className="live-dot h-1 w-1 rounded-full" style={{ background: 'var(--accent)' }} />
          <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">LIVE</span>
        </div>
      </div>

      {/* ══ DATA PANELS — Row 1: Market Radar | Risk Gauge ══════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-[var(--border)] bg-[var(--surface)] sm:h-[300px]">
        <div className="war-panel min-w-0 overflow-hidden flex flex-col border-b sm:border-b-0 sm:h-full max-h-[350px] sm:max-h-none">
          <MarketRadar initialData={homepage?.marketRadar ?? null} stocks={[]} showHeatmap={false} />
        </div>
        <div className="min-w-0 overflow-hidden flex flex-col border-b sm:border-b-0 sm:h-full max-h-[350px] sm:max-h-none">
          <RiskGauge />
        </div>
      </div>

      {/* ══ DATA PANELS — Row 2: FX Monitor | S&P Heatmap ═══════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-[var(--border)] bg-[var(--surface)] sm:h-[300px]">
        <div className="war-panel min-w-0 overflow-hidden h-full flex flex-col border-b sm:border-b-0 max-h-[350px] sm:max-h-none">
          <FXMonitor />
        </div>
        <div className="min-w-0 overflow-hidden h-full flex flex-col">
          <HeatmapPanel stocks={homepage?.stocks ?? []} />
        </div>
      </div>

      {/* ══ DATA PANELS — Row 3: Live Signals horizontal strip ══════════ */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)]">
        <SignalsPanel layout="horizontal" />
      </div>

      {/* ══ TOP MOVERS STRIP ══════════════════════════════════════════════ */}
      <MoversStrip />

      {/* ══ PREDICTION MARKETS ════════════════════════════════════════════ */}
      <SectionReveal delay={0}><PredictionMarkets /></SectionReveal>

      {/* ══ NEWS BRIEFING — top stories by category ═══════════════════════ */}
      <SectionReveal delay={50}><NewsBriefing /></SectionReveal>

      {/* ══ ECONOMIC INDICATORS ═══════════════════════════════════════════ */}
      <SectionReveal delay={0}><EconomicIndicators /></SectionReveal>

      {/* ══ MARITIME PANEL ════════════════════════════════════════════════ */}
      <SectionReveal delay={0}><MaritimePanel /></SectionReveal>

      {/* ══ DIVIDER — gradient ════════════════════════════════════════════ */}
      <div className="h-px bg-gradient-to-r from-transparent via-[var(--accent)]/20 to-transparent" />

      {/* ══ MARKET DASHBOARD ══════════════════════════════════════════════ */}
      <div id="market-overview">
        <TickerTape initialData={homepage?.tickerQuotes} />
      </div>

      <main className="px-3 py-4 sm:px-4">
        {/* Dashboard header */}
        <div className="mb-3 flex items-center gap-2">
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} aria-hidden>
            <polyline points="1,12 5,7 8,9 11,4 15,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-mono font-semibold uppercase text-[var(--text)]" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>
            Market Overview
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
          <span className="hidden sm:block font-mono text-[9px] text-[var(--text-muted)] opacity-50">
            Stocks · Crypto · Forex · Commodities · ETFs
          </span>
        </div>

        {/* Search bar */}
        <div className="mb-4">
          <GlobalSearch
            placeholder="Search stocks, crypto, forex, commodities..."
            className="w-full max-w-lg"
          />
        </div>

        <MarketTabs initialStocks={homepage?.stocks ?? []} initialTab={initialTab} />
      </main>

      {/* ══ STATUS BAR — data freshness ══════════════════════════════════════ */}
      <StatusBar />

      {/* ══ PORTFOLIO INTRO — shown once on first visit ════════════════════ */}
      <PortfolioIntroModal />
    </div>
  )
}
