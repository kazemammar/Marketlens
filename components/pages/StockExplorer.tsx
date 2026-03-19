'use client'

import { useState } from 'react'
import AssetCard from '@/components/dashboard/AssetCard'
import type { AssetCardData } from '@/lib/utils/types'
import { useFetch } from '@/lib/hooks/useFetch'

// ─── Sector config ────────────────────────────────────────────────────────

const STOCK_SECTORS: Record<string, string[]> = {
  'Technology':       ['AAPL','MSFT','GOOGL','NVDA','META','TSLA','AVGO','CRM','AMD','INTC','ORCL','ADBE','CSCO','NFLX','QCOM','PLTR','PANW','SNOW','NOW','SHOP','UBER','SQ','COIN','MSTR','MU'],
  'Finance':          ['JPM','V','MA','BAC','GS','MS','BLK','AXP','SCHW','C','WFC','USB','PNC','COF','AIG','MET','PRU','ICE','CME','PYPL'],
  'Healthcare':       ['UNH','JNJ','LLY','PFE','ABBV','MRK','TMO','ABT','AMGN','MDT','ISRG','DHR','BMY','GILD','CVS','CI','ELV','ZTS','REGN','VRTX'],
  'Energy':           ['XOM','CVX','COP','SLB','EOG','MPC','PSX','VLO','OXY','HAL','DVN','FANG','HES','BKR','KMI','WMB','OKE','TRGP','LNG','MRO'],
  'Consumer Disc.':   ['AMZN','HD','NKE','SBUX','MCD','LOW','TJX','BKNG','CMG','YUM','ABNB','MAR','RCL','LULU','DPZ'],
  'Consumer Staples': ['PG','KO','PEP','COST','WMT','PM','MO','CL','KHC','GIS','STZ','MNST','KR','SYY','HSY'],
  'Industrial':       ['CAT','DE','GE','BA','HON','UPS','LMT','RTX','MMM','UNP','FDX','WM','EMR','ITW','GD','NOC','TDG','CARR','JCI','IR'],
  'Communication':    ['DIS','CMCSA','T','VZ','TMUS','CHTR','SPOT','RBLX','EA','TTWO','WBD','PARA','LYV','MTCH','PINS'],
  'Real Estate':      ['AMT','PLD','CCI','EQIX','PSA','SPG','O','WELL','DLR','AVB','EQR','VICI','IRM','ARE','KIM'],
  'Utilities':        ['NEE','DUK','SO','D','AEP','SRE','EXC','XEL','ED','WEC','ES','AWK','ATO','CMS','DTE'],
}

// Top 3 by market cap per sector — used for the "All" tab
const ALL_TOP_PICKS = [
  'AAPL','MSFT','NVDA',   // Technology
  'JPM','V','MA',          // Finance
  'UNH','LLY','JNJ',       // Healthcare
  'XOM','CVX','COP',       // Energy
  'AMZN','HD','NKE',       // Consumer Disc.
  'PG','KO','COST',        // Consumer Staples
  'CAT','GE','HON',        // Industrial
  'DIS','CMCSA','T',       // Communication
  'AMT','PLD','CCI',       // Real Estate
  'NEE','DUK','SO',        // Utilities
]

const SECTOR_KEYS = Object.keys(STOCK_SECTORS)
const TABS        = ['All', ...SECTOR_KEYS]

function sectorUrl(sector: string) {
  return `/api/stocks/batch?symbols=${STOCK_SECTORS[sector].join(',')}`
}

const SECTOR_COLORS: Record<string, string> = {
  'All':              '#10b981',
  'Technology':       '#3b82f6',
  'Finance':          '#f59e0b',
  'Healthcare':       '#22c55e',
  'Energy':           '#ef4444',
  'Consumer Disc.':   '#a855f7',
  'Consumer Staples': '#ec4899',
  'Industrial':       '#6366f1',
  'Communication':    '#06b6d4',
  'Real Estate':      '#84cc16',
  'Utilities':        '#f97316',
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
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Market Indices
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">live</span>
      </div>
      <div className="flex gap-px bg-[var(--border)] overflow-x-auto">
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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5"
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

  const allFetch      = useFetch<AssetCardData[]>(`/api/stocks/batch?symbols=${ALL_TOP_PICKS.join(',')}`, { enabled: activeTab === 'All',              refreshInterval: 5 * 60_000 })
  const techFetch     = useFetch<AssetCardData[]>(sectorUrl('Technology'),       { enabled: activeTab === 'Technology',       refreshInterval: 5 * 60_000 })
  const finFetch      = useFetch<AssetCardData[]>(sectorUrl('Finance'),          { enabled: activeTab === 'Finance',          refreshInterval: 5 * 60_000 })
  const hlthFetch     = useFetch<AssetCardData[]>(sectorUrl('Healthcare'),       { enabled: activeTab === 'Healthcare',       refreshInterval: 5 * 60_000 })
  const nrgFetch      = useFetch<AssetCardData[]>(sectorUrl('Energy'),           { enabled: activeTab === 'Energy',           refreshInterval: 5 * 60_000 })
  const consDiscFetch = useFetch<AssetCardData[]>(sectorUrl('Consumer Disc.'),   { enabled: activeTab === 'Consumer Disc.',   refreshInterval: 5 * 60_000 })
  const consStapFetch = useFetch<AssetCardData[]>(sectorUrl('Consumer Staples'), { enabled: activeTab === 'Consumer Staples', refreshInterval: 5 * 60_000 })
  const indFetch      = useFetch<AssetCardData[]>(sectorUrl('Industrial'),       { enabled: activeTab === 'Industrial',       refreshInterval: 5 * 60_000 })
  const commFetch     = useFetch<AssetCardData[]>(sectorUrl('Communication'),    { enabled: activeTab === 'Communication',    refreshInterval: 5 * 60_000 })
  const realEstFetch  = useFetch<AssetCardData[]>(sectorUrl('Real Estate'),      { enabled: activeTab === 'Real Estate',      refreshInterval: 5 * 60_000 })
  const utilFetch     = useFetch<AssetCardData[]>(sectorUrl('Utilities'),        { enabled: activeTab === 'Utilities',        refreshInterval: 5 * 60_000 })

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
    'Utilities':        utilFetch,
  }

  const current = fetchMap[activeTab]
  const stocks  = current.data ?? []
  const loading = current.loading && stocks.length === 0

  const totalStocks = SECTOR_KEYS.reduce((acc, s) => acc + STOCK_SECTORS[s].length, 0)

  return (
    <div className="space-y-4">
      {/* Market indices strip */}
      <MarketIndices />

      {/* Sector tabs + grid */}
      <div className="overflow-hidden rounded border border-[var(--border)]">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2">
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
            <path d="M2 14h12M4 10v4M8 7v7M12 4v10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
            Stock Explorer
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
          <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
            {totalStocks}+ stocks
          </span>
        </div>

        {/* Sector tab bar */}
        <div className="flex items-center gap-0 overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)] px-1">
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
        <div className="bg-[var(--surface)] p-4">
          {loading ? (
            <GridSkeleton count={activeTab === 'All' ? ALL_TOP_PICKS.length : STOCK_SECTORS[activeTab]?.length ?? 10} />
          ) : stocks.length === 0 ? (
            <p className="py-12 text-center font-mono text-[10px] text-[var(--text-muted)]">
              No data available for this sector
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
