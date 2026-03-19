'use client'

import { useState, useEffect } from 'react'
import AssetCard from '@/components/dashboard/AssetCard'
import type { AssetCardData } from '@/lib/utils/types'
import { useFetch } from '@/lib/hooks/useFetch'

// ─── Sector config ────────────────────────────────────────────────────────

const STOCK_SECTORS: Record<string, string[]> = {
  'Technology':       ['AAPL','MSFT','NVDA','AVGO','ORCL','CRM','ADBE','AMD','CSCO','QCOM','INTC','NOW','PLTR','PANW','SNPS','CDNS','MRVL','KLAC','LRCX','AMAT','MU','ADI','FTNT','WDAY','TEAM','CRWD','DDOG','ZS','HUBS','ANSS'],
  'Finance':          ['JPM','V','MA','BAC','GS','MS','BLK','SCHW','C','AXP','BRK.B','WFC','SPGI','ICE','CME','PGR','USB','MMC','CB','AON','MET','AIG','PRU','TRV','PNC','COF','PYPL','AJG','FITB','FIS'],
  'Healthcare':       ['UNH','LLY','JNJ','ABBV','MRK','TMO','ABT','PFE','AMGN','MDT','ISRG','DHR','BMY','GILD','CVS','CI','ELV','VRTX','REGN','ZTS','BDX','BSX','SYK','HCA','MCK','A','DXCM','IQV','IDXX','EW'],
  'Consumer Disc.':   ['AMZN','TSLA','HD','NKE','MCD','LOW','SBUX','TJX','BKNG','CMG','ABNB','MAR','RCL','ORLY','AZO','ROST','DHI','LEN','YUM','DPZ','LULU','ULTA','DECK','GM','F','EBAY','ETSY','CPRT','BBY','GRMN'],
  'Consumer Staples': ['PG','KO','PEP','COST','WMT','PM','MO','CL','MDLZ','KHC','GIS','STZ','MNST','KR','SYY','HSY','ADM','TAP','CAG','SJM','CLX','CHD','K','TSN','HRL','MKC','BG','LAMB','CPB','WBA'],
  'Industrial':       ['CAT','GE','HON','UPS','BA','RTX','LMT','DE','UNP','FDX','WM','ETN','ITW','EMR','GD','NOC','TDG','CSX','NSC','CARR','JCI','IR','PH','PCAR','CTAS','FAST','GWW','VRSK','ROK','SWK'],
  'Communication':    ['GOOGL','META','NFLX','DIS','CMCSA','T','VZ','TMUS','CHTR','SPOT','RBLX','EA','TTWO','WBD','PARA','LYV','MTCH','PINS','ZM','SNAP','ROKU','OMC','IPG','FOXA','NWSA'],
  'Energy':           ['XOM','CVX','COP','SLB','EOG','MPC','PSX','VLO','OXY','HAL','DVN','FANG','HES','BKR','KMI','WMB','OKE','TRGP','LNG','MRO','CTRA','EQT','APA','WFRD','FTI'],
  'Real Estate':      ['AMT','PLD','CCI','EQIX','PSA','SPG','O','WELL','DLR','AVB','EQR','VICI','IRM','ARE','KIM','ESS','MAA','REG','UDR','HST','CPT','BXP','PEAK','SUI','EXR'],
  'Materials':        ['LIN','APD','SHW','ECL','FCX','NEM','NUE','DOW','DD','VMC','MLM','PPG','IFF','CE','ALB','EMN','FMC','IP','PKG','AVY','SEE','CF','MOS','BALL','AMCR'],
  'Utilities':        ['NEE','DUK','SO','D','AEP','SRE','EXC','XEL','ED','WEC','ES','AWK','ATO','CMS','DTE','PEG','FE','PPL','EIX','ETR','CEG','EVRG','NI','LNT','AES'],
}

// Top 5 by market cap per sector — used for the "All" tab (55 total)
const ALL_TOP_PICKS = [
  'AAPL','MSFT','NVDA','AVGO','ORCL',          // Technology
  'JPM','V','MA','BAC','BRK.B',                 // Finance
  'UNH','LLY','JNJ','ABBV','MRK',              // Healthcare
  'AMZN','TSLA','HD','NKE','MCD',              // Consumer Disc.
  'PG','KO','PEP','COST','WMT',                // Consumer Staples
  'CAT','GE','HON','UPS','RTX',                // Industrial
  'GOOGL','META','NFLX','DIS','CMCSA',         // Communication
  'XOM','CVX','COP','SLB','EOG',               // Energy
  'AMT','PLD','EQIX','PSA','SPG',              // Real Estate
  'LIN','APD','SHW','ECL','FCX',               // Materials
  'NEE','DUK','SO','D','AEP',                  // Utilities
]

const SECTOR_KEYS = Object.keys(STOCK_SECTORS)
const TABS        = ['All', ...SECTOR_KEYS]

function sectorUrl(sector: string, tick = 0) {
  const base = `/api/stocks/batch?symbols=${STOCK_SECTORS[sector].join(',')}`
  return tick > 0 ? `${base}&_t=${tick}` : base
}

const SECTOR_COLORS: Record<string, string> = {
  'All':              '#10b981',
  'Technology':       '#60a5fa',
  'Finance':          '#818cf8',
  'Healthcare':       '#2dd4bf',
  'Energy':           '#f59e0b',
  'Consumer Disc.':   '#fb7185',
  'Consumer Staples': '#fb7185',
  'Industrial':       '#94a3b8',
  'Communication':    '#22d3ee',
  'Real Estate':      '#a78bfa',
  'Materials':        '#6b7280',
  'Utilities':        '#fdba74',
}

// ─── Market Indices strip ──────────────────────────────────────────────────

const INDEX_CONFIG = [
  { symbol: 'SPY', name: 'S&P 500',    href: '/asset/etf/SPY' },
  { symbol: 'DIA', name: 'Dow Jones',  href: '/asset/etf/DIA' },
  { symbol: 'QQQ', name: 'Nasdaq 100', href: '/asset/etf/QQQ' },
  { symbol: 'IWM', name: 'Russell 2K', href: '/asset/etf/IWM' },
]

function IndexCard({ symbol, name, href, data }: { symbol: string; name: string; href: string; data: AssetCardData | undefined }) {
  const positive = (data?.changePercent ?? 0) >= 0
  const color    = !data ? '#64748b' : positive ? '#22c55e' : '#ef4444'

  return (
    <a
      href={href}
      className="group flex flex-1 flex-col gap-1 bg-[var(--surface)] px-4 py-3 transition hover:bg-[var(--surface-2)] min-w-[140px]"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">{symbol}</span>
        {data && (
          <span className="font-mono text-[9px] font-bold" style={{ color }}>
            {positive ? '+' : ''}{data.changePercent.toFixed(2)}%
          </span>
        )}
      </div>
      <span className="font-mono text-[11px] text-[var(--text-muted)]">{name}</span>
      {data ? (
        <span className="font-mono text-[18px] font-bold tabular-nums text-[var(--text)]">
          {data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ) : (
        <div className="skeleton h-5 w-24 rounded" />
      )}
      {data && (
        <div className="h-0.5 w-full rounded-full bg-[var(--surface-3)]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, Math.abs(data.changePercent) * 20)}%`,
              background: color,
            }}
          />
        </div>
      )}
    </a>
  )
}

function MarketIndices() {
  const { data } = useFetch<AssetCardData[]>(
    `/api/stocks/batch?symbols=${INDEX_CONFIG.map(i => i.symbol).join(',')}`,
    { refreshInterval: 60_000 },
  )
  const bySymbol = data ? Object.fromEntries(data.map(d => [d.symbol, d])) : {}

  return (
    <div className="overflow-hidden rounded border border-[var(--border)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Market Indices
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        <div className="flex items-center gap-1">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--accent)' }}>LIVE</span>
        </div>
      </div>
      <div className="flex gap-px overflow-x-auto">
        {INDEX_CONFIG.map((idx) => (
          <IndexCard key={idx.symbol} {...idx} data={bySymbol[idx.symbol]} />
        ))}
      </div>
    </div>
  )
}

// ─── Stock grid skeleton ───────────────────────────────────────────────────

function GridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2.5 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1.5">
              <div className="h-3.5 w-16 animate-pulse rounded bg-[var(--surface-2)]" />
              <div className="h-3 w-24 animate-pulse rounded bg-[var(--surface-2)]" />
            </div>
            <div className="h-7 w-18 animate-pulse rounded bg-[var(--surface-2)]" />
          </div>
          <div className="flex items-end justify-between">
            <div className="h-5 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
            <div className="h-3 w-12 animate-pulse rounded bg-[var(--surface-2)]" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main StockExplorer ───────────────────────────────────────────────────

export default function StockExplorer() {
  const [activeTab, setActiveTab] = useState('All')
  const [tick, setTick]           = useState(0)

  const allUrl = tick > 0
    ? `/api/stocks/batch?symbols=${ALL_TOP_PICKS.join(',')}&_t=${tick}`
    : `/api/stocks/batch?symbols=${ALL_TOP_PICKS.join(',')}`

  const allFetch      = useFetch<AssetCardData[]>(allUrl,                         { enabled: activeTab === 'All',              refreshInterval: 5 * 60_000 })
  const techFetch     = useFetch<AssetCardData[]>(sectorUrl('Technology',    tick), { enabled: activeTab === 'Technology',       refreshInterval: 5 * 60_000 })
  const finFetch      = useFetch<AssetCardData[]>(sectorUrl('Finance',       tick), { enabled: activeTab === 'Finance',          refreshInterval: 5 * 60_000 })
  const hlthFetch     = useFetch<AssetCardData[]>(sectorUrl('Healthcare',    tick), { enabled: activeTab === 'Healthcare',       refreshInterval: 5 * 60_000 })
  const nrgFetch      = useFetch<AssetCardData[]>(sectorUrl('Energy',        tick), { enabled: activeTab === 'Energy',           refreshInterval: 5 * 60_000 })
  const consDiscFetch = useFetch<AssetCardData[]>(sectorUrl('Consumer Disc.',tick), { enabled: activeTab === 'Consumer Disc.',   refreshInterval: 5 * 60_000 })
  const consStapFetch = useFetch<AssetCardData[]>(sectorUrl('Consumer Staples',tick),{ enabled: activeTab === 'Consumer Staples', refreshInterval: 5 * 60_000 })
  const indFetch      = useFetch<AssetCardData[]>(sectorUrl('Industrial',    tick), { enabled: activeTab === 'Industrial',       refreshInterval: 5 * 60_000 })
  const commFetch     = useFetch<AssetCardData[]>(sectorUrl('Communication', tick), { enabled: activeTab === 'Communication',    refreshInterval: 5 * 60_000 })
  const realEstFetch  = useFetch<AssetCardData[]>(sectorUrl('Real Estate',   tick), { enabled: activeTab === 'Real Estate',      refreshInterval: 5 * 60_000 })
  const matFetch      = useFetch<AssetCardData[]>(sectorUrl('Materials',     tick), { enabled: activeTab === 'Materials',        refreshInterval: 5 * 60_000 })
  const utilFetch     = useFetch<AssetCardData[]>(sectorUrl('Utilities',     tick), { enabled: activeTab === 'Utilities',        refreshInterval: 5 * 60_000 })

  const fetchMap: Record<string, ReturnType<typeof useFetch<AssetCardData[]>>> = {
    'All':              allFetch,
    'Technology':       techFetch,
    'Finance':          finFetch,
    'Healthcare':       hlthFetch,
    'Energy':           nrgFetch,
    'Consumer Disc.':   consDiscFetch,
    'Consumer Staples': consStapFetch,
    'Industrial':       indFetch,
    'Communication':    commFetch,
    'Real Estate':      realEstFetch,
    'Materials':        matFetch,
    'Utilities':        utilFetch,
  }

  const current = fetchMap[activeTab]
  const stocks  = current.data ?? []
  const loading = current.loading && stocks.length === 0

  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  useEffect(() => {
    if (current.lastUpdated) setLastUpdated(current.lastUpdated)
  }, [current.lastUpdated])

  const totalStocks = SECTOR_KEYS.reduce((acc, s) => acc + STOCK_SECTORS[s].length, 0)

  return (
    <div className="space-y-4">
      {/* Market indices strip */}
      <MarketIndices />

      {/* Sector tabs + grid */}
      <div className="overflow-hidden rounded border border-[var(--border)]">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2">
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
            <path d="M2 14h12M4 10v4M8 7v7M12 4v10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
            Stock Explorer
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
          <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
            {totalStocks}+ stocks
            {lastUpdated && (
              <> · Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
            )}
          </span>
          <button
            onClick={() => setTick(t => t + 1)}
            className="ml-1 font-mono text-[8px] text-[var(--accent)] opacity-60 hover:opacity-100 hover:underline"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Sector tab bar */}
        <div className="flex items-center gap-0 overflow-x-auto border-b border-[var(--border)] px-1">
          {TABS.map((tab) => {
            const isActive = tab === activeTab
            const color    = SECTOR_COLORS[tab] ?? 'var(--accent)'
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative shrink-0 px-3 py-2.5 font-mono text-[10px] font-semibold tracking-[0.06em] transition-colors"
                style={{ color: isActive ? color : 'var(--text-muted)' }}
              >
                {tab}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: color }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Stock grid */}
        <div className="p-2.5">
          {loading ? (
            <GridSkeleton count={activeTab === 'All' ? ALL_TOP_PICKS.length : STOCK_SECTORS[activeTab]?.length ?? 10} />
          ) : stocks.length === 0 ? (
            <p className="py-12 text-center font-mono text-[10px] text-[var(--text-muted)]">
              No data available for this sector
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {stocks.map((asset) => (
                <AssetCard key={`${asset.type}-${asset.symbol}`} asset={asset} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
