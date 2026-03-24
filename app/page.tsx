export const dynamic = 'force-dynamic'

import { Suspense }      from 'react'
import TickerTape        from '@/components/layout/TickerTape'
import MarketTabs        from '@/components/dashboard/MarketTabs'
import MarketBrief       from '@/components/warroom/MarketBrief'
import MarketPulse       from '@/components/warroom/MarketPulse'
import CommodityStrip    from '@/components/warroom/CommodityStrip'
import GeoMap            from '@/components/warroom/GeoMap'
import IntelPanel        from '@/components/warroom/IntelPanel'
import MarketRadar       from '@/components/warroom/MarketRadar'
import FXMonitor         from '@/components/warroom/FXMonitor'
import RiskGauge         from '@/components/warroom/RiskGauge'
import SignalsPanel      from '@/components/warroom/SignalsPanel'
import TrendingKeywords from '@/components/warroom/TrendingKeywords'
import HeatmapPanel      from '@/components/warroom/HeatmapPanel'
import EconomicIndicators   from '@/components/warroom/EconomicIndicators'
import EconomicCalendar     from '@/components/warroom/EconomicCalendar'
import EarningsCalendar     from '@/components/warroom/EarningsCalendar'
import IpoCalendar          from '@/components/warroom/IpoCalendar'
import MarketHours          from '@/components/warroom/MarketHours'
import SectorRotation       from '@/components/warroom/SectorRotation'
import FearGreedIndex        from '@/components/warroom/FearGreedIndex'
import OilEnergyPanel      from '@/components/warroom/OilEnergyPanel'
import PredictionMarkets    from '@/components/warroom/PredictionMarkets'
import MoversStrip         from '@/components/warroom/MoversStrip'
import NewsBriefing         from '@/components/warroom/NewsBriefing'
import ChokepointIntel      from '@/components/warroom/ChokepointIntel'
import StatusBar            from '@/components/layout/StatusBar'
import GlobalSearch         from '@/components/search/GlobalSearch'
import SectionReveal        from '@/components/layout/SectionReveal'
import { AssetType }           from '@/lib/utils/types'
import { getHomepageData }     from '@/lib/api/homepage'
import PortfolioIntroModal     from '@/components/ui/PortfolioIntroModal'
import PanelErrorBoundary      from '@/components/ui/PanelErrorBoundary'

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

      {/* ══ LIVE PULSE — news-driven, refreshes every 5 min ════════════ */}
      <PanelErrorBoundary fallbackTitle="Market Pulse">
        <MarketPulse />
      </PanelErrorBoundary>

      {/* ══ TICKER TAPE — scrolling prices ══════════════════════════════ */}
      <PanelErrorBoundary fallbackTitle="Ticker Tape">
        <TickerTape initialData={homepage?.tickerQuotes} />
      </PanelErrorBoundary>

      {/* ══ MARKET HOURS — global exchange status ═════════════════════ */}
      <PanelErrorBoundary fallbackTitle="Market Hours">
        <MarketHours />
      </PanelErrorBoundary>

      {/* ══ AI MARKET BRIEF — full structured panel ═══════════════════════ */}
      <div className="px-3 sm:px-4 py-2">
        <PanelErrorBoundary fallbackTitle="AI Market Brief">
          <MarketBrief />
        </PanelErrorBoundary>
      </div>

      {/* ══ MAP + INTEL PANEL — 65/35 grid (stacked on mobile) ══════════ */}
      <div className="grid grid-cols-1 gap-1.5 px-3 sm:px-4 py-2 lg:grid-cols-[65fr_35fr]">
        {/* GeoMap — left */}
        <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-red-500" />
            <span className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
              Geopolitical Intelligence Map
            </span>
          </div>
          <div className="h-[240px] sm:h-[320px] lg:h-[500px] xl:h-[600px]" style={{ isolation: 'isolate' }}>
            <PanelErrorBoundary fallbackTitle="Geo Map">
              <GeoMap />
            </PanelErrorBoundary>
          </div>
        </div>

        {/* IntelPanel — right */}
        <div className="h-[300px] sm:h-[350px] lg:h-[540px] xl:h-[640px] flex flex-col overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
            <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
              Intelligence Feed
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <PanelErrorBoundary fallbackTitle="Intelligence Feed">
              <IntelPanel />
            </PanelErrorBoundary>
          </div>
        </div>
      </div>

      {/* ══ MARKET INTELLIGENCE SECTION HEADER ════════════════════════════ */}
      <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
        <div className="flex items-center gap-2">
          {/* animated radar icon */}
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" style={{ color: 'var(--accent)' }} aria-hidden>
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1"/>
            <circle cx="8" cy="8" r="1" fill="currentColor"/>
          </svg>
          <span className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
            Market Intelligence
          </span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-[var(--border)] to-transparent" />
        <div className="hidden sm:flex items-center gap-1">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--accent)' }}>LIVE</span>
        </div>
      </div>

      {/* ══ DATA PANELS — Row 1: Market Radar | Risk Gauge ══════════════ */}
      <div className="grid grid-cols-1 gap-1.5 px-3 sm:grid-cols-2 sm:px-4 py-2">
        <div className="min-w-0 overflow-hidden flex flex-col max-h-[350px] sm:max-h-none">
          <PanelErrorBoundary fallbackTitle="Market Radar">
            <MarketRadar initialData={homepage?.marketRadar ?? null} stocks={[]} showHeatmap={false} />
          </PanelErrorBoundary>
        </div>
        <div className="min-w-0 overflow-hidden flex flex-col max-h-[350px] sm:max-h-none">
          <PanelErrorBoundary fallbackTitle="Risk Gauge">
            <RiskGauge />
          </PanelErrorBoundary>
        </div>
      </div>

      {/* ══ DATA PANELS — Fear & Greed Index ════════════════════════════ */}
      <div className="px-3 sm:px-4 py-2">
        <PanelErrorBoundary fallbackTitle="Fear & Greed Index">
          <FearGreedIndex />
        </PanelErrorBoundary>
      </div>

      {/* ══ DATA PANELS — Row 2: FX Monitor | S&P Heatmap ═══════════════ */}
      <div className="grid grid-cols-1 gap-1.5 px-3 sm:grid-cols-2 sm:px-4 py-2">
        <div className="min-w-0 overflow-hidden flex flex-col max-h-[350px] sm:max-h-none">
          <PanelErrorBoundary fallbackTitle="FX Monitor">
            <FXMonitor />
          </PanelErrorBoundary>
        </div>
        <div className="min-w-0 overflow-hidden flex flex-col">
          <PanelErrorBoundary fallbackTitle="S&P Heatmap">
            <HeatmapPanel initialStocks={homepage?.stocks ?? []} />
          </PanelErrorBoundary>
        </div>
      </div>

      {/* ══ SECTOR ROTATION — daily sector performance bars ══════════ */}
      <div className="px-3 sm:px-4 py-2">
        <PanelErrorBoundary fallbackTitle="Sector Rotation">
          <SectorRotation />
        </PanelErrorBoundary>
      </div>

      {/* ══ DATA PANELS — Row 3: Live Signals horizontal strip ══════════ */}
      <div className="px-3 sm:px-4 py-2">
        <PanelErrorBoundary fallbackTitle="Signals">
          <SignalsPanel layout="horizontal" />
        </PanelErrorBoundary>
      </div>

      {/* ══ DATA PANELS — Row 4: Trending Keywords ════════════════════════ */}
      <div className="px-3 sm:px-4 py-2">
        <PanelErrorBoundary fallbackTitle="Trending Keywords">
          <TrendingKeywords />
        </PanelErrorBoundary>
      </div>

      {/* ══ DATA PANELS — Row 5: Economic Indicators ═════════════════════ */}
      <div className="px-3 sm:px-4 py-2">
        <PanelErrorBoundary fallbackTitle="Economic Indicators">
          <EconomicIndicators />
        </PanelErrorBoundary>
      </div>

      {/* Economic Calendar */}
      <div className="px-3 sm:px-4 py-2">
        <PanelErrorBoundary fallbackTitle="Economic Calendar">
          <EconomicCalendar />
        </PanelErrorBoundary>
      </div>

      {/* Earnings Calendar — top 8 on dashboard; full list on /stocks#earnings */}
      <div className="px-3 sm:px-4 py-2">
        <PanelErrorBoundary fallbackTitle="Earnings Calendar">
          <EarningsCalendar limit={8} />
        </PanelErrorBoundary>
      </div>

      {/* IPO Calendar — upcoming IPOs next 30 days */}
      <div className="px-3 sm:px-4 py-2">
        <PanelErrorBoundary fallbackTitle="IPO Calendar">
          <IpoCalendar limit={6} />
        </PanelErrorBoundary>
      </div>

      {/* ══ OIL & ENERGY ANALYTICS — EIA weekly data ══════════════════════ */}
      <div className="px-3 sm:px-4 py-2">
        <PanelErrorBoundary fallbackTitle="Oil & Energy">
          <OilEnergyPanel />
        </PanelErrorBoundary>
      </div>

      {/* ══ DATA PANELS — Row 6: Chokepoint Intelligence ════════════════ */}
      <div className="px-3 sm:px-4 py-2">
        <PanelErrorBoundary fallbackTitle="Chokepoint Intelligence">
          <ChokepointIntel />
        </PanelErrorBoundary>
      </div>

      {/* ══ TOP MOVERS STRIP ══════════════════════════════════════════════ */}
      <div className="px-3 sm:px-4 py-2">
        <PanelErrorBoundary fallbackTitle="Top Movers">
          <MoversStrip />
        </PanelErrorBoundary>
      </div>

      {/* ══ PREDICTION MARKETS ════════════════════════════════════════════ */}
      <div className="px-3 sm:px-4 py-2">
        <PanelErrorBoundary fallbackTitle="Prediction Markets">
          <SectionReveal delay={0}><PredictionMarkets /></SectionReveal>
        </PanelErrorBoundary>
      </div>

      {/* ══ NEWS BRIEFING — top stories by category ═══════════════════════ */}
      <div className="px-3 sm:px-4 py-2">
        <PanelErrorBoundary fallbackTitle="News Briefing">
          <SectionReveal delay={50}><NewsBriefing /></SectionReveal>
        </PanelErrorBoundary>
      </div>

      {/* ══ DIVIDER — gradient ════════════════════════════════════════════ */}
      <div className="mx-3 sm:mx-4 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/20 to-transparent" />

      {/* ══ MARKET DASHBOARD ══════════════════════════════════════════════ */}
      <div id="market-overview"></div>

      <main className="px-3 py-2 sm:px-4">
        {/* Dashboard header */}
        <div className="mb-3 flex items-center gap-2">
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} aria-hidden>
            <polyline points="1,12 5,7 8,9 11,4 15,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
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

        <PanelErrorBoundary fallbackTitle="Market Overview">
          <MarketTabs initialStocks={homepage?.stocks ?? []} initialTab={initialTab} />
        </PanelErrorBoundary>
      </main>

      {/* ══ STATUS BAR — data freshness ══════════════════════════════════════ */}
      <StatusBar />

      {/* ══ PORTFOLIO INTRO — shown once on first visit ════════════════════ */}
      <PortfolioIntroModal />
    </div>
  )
}
