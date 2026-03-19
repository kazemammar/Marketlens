'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import AssetCard from './AssetCard'
import { AssetCardData, AssetType } from '@/lib/utils/types'

// ─── Stock sector config ──────────────────────────────────────────────────

const STOCK_SECTOR_MAP: Record<string, string> = {
  AAPL: 'Technology',    MSFT: 'Technology',    NVDA: 'Technology',
  JPM:  'Finance',       V:    'Finance',        MA:   'Finance',
  UNH:  'Healthcare',    LLY:  'Healthcare',     JNJ:  'Healthcare',
  AMZN: 'Consumer Disc.',TSLA: 'Consumer Disc.', HD:   'Consumer Disc.',
  PG:   'Staples',       KO:   'Staples',        PEP:  'Staples',
  CAT:  'Industrial',    GE:   'Industrial',     HON:  'Industrial',
  GOOGL:'Communication', META: 'Communication',  NFLX: 'Communication',
  XOM:  'Energy',        CVX:  'Energy',         COP:  'Energy',
  AMT:  'Real Estate',   PLD:  'Real Estate',    EQIX: 'Real Estate',
  LIN:  'Materials',     APD:  'Materials',      SHW:  'Materials',
  NEE:  'Utilities',     DUK:  'Utilities',      SO:   'Utilities',
}

const SECTOR_ORDER = [
  'Technology','Finance','Healthcare','Consumer Disc.','Staples',
  'Industrial','Communication','Energy','Real Estate','Materials','Utilities',
]

const SECTOR_COLORS: Record<string, string> = {
  'Technology':    '#3b82f6',
  'Finance':       '#f59e0b',
  'Healthcare':    '#22c55e',
  'Consumer Disc.':'#a855f7',
  'Staples':       '#ec4899',
  'Industrial':    '#6366f1',
  'Communication': '#06b6d4',
  'Energy':        '#ef4444',
  'Real Estate':   '#84cc16',
  'Materials':     '#d97706',
  'Utilities':     '#f97316',
}

// ─── Tab config ───────────────────────────────────────────────────────────

interface Tab { id: AssetType; label: string; emoji: string }

const TABS: Tab[] = [
  { id: 'stock',     label: 'Stocks',      emoji: '📈' },
  { id: 'crypto',    label: 'Crypto',      emoji: '₿'  },
  { id: 'forex',     label: 'Forex',       emoji: '💱' },
  { id: 'commodity', label: 'Commodities', emoji: '🪙' },
  { id: 'etf',       label: 'ETFs',        emoji: '📊' },
]

// ─── Per-tab state ────────────────────────────────────────────────────────

type LoadStatus = 'loaded' | 'loading' | 'error' | 'idle'

interface TabState {
  data:   AssetCardData[]
  status: LoadStatus
}

function makeInitial(initialStocks: AssetCardData[]): Record<AssetType, TabState> {
  return {
    stock:     { data: initialStocks, status: 'loaded' },
    crypto:    { data: [],            status: 'idle'   },
    forex:     { data: [],            status: 'idle'   },
    commodity: { data: [],            status: 'idle'   },
    etf:       { data: [],            status: 'idle'   },
  }
}

// ─── Component ────────────────────────────────────────────────────────────

// Inner component that reads searchParams — must be inside Suspense
function TabParamSync({
  onTabChange,
}: {
  onTabChange: (tab: AssetType) => void
}) {
  const searchParams = useSearchParams()
  useEffect(() => {
    const urlTab = (searchParams.get('tab') ?? 'stock') as AssetType
    if (!TABS.some((t) => t.id === urlTab)) return
    onTabChange(urlTab)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
  return null
}

export default function MarketTabs({
  initialStocks,
  initialTab = 'stock',
}: {
  initialStocks: AssetCardData[]
  initialTab?:   AssetType
}) {
  const [tabs,         setTabs]        = useState<Record<AssetType, TabState>>(() => makeInitial(initialStocks))
  const [activeTab,    setActiveTab]   = useState<AssetType>(initialTab)
  const [activeSector, setActiveSector] = useState<string>('All')

  const loadTab = useCallback(async (tab: AssetType) => {
    // Already loaded or in-flight — skip
    if (tabs[tab].status !== 'idle') return

    setTabs((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], status: 'loading' },
    }))

    try {
      const res = await fetch(`/api/market?tab=${tab}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as AssetCardData[]
      setTabs((prev) => ({
        ...prev,
        [tab]: { data, status: 'loaded' },
      }))
    } catch (err) {
      console.error(`[MarketTabs] failed to load tab "${tab}":`, err)
      setTabs((prev) => ({
        ...prev,
        [tab]: { ...prev[tab], status: 'error' },
      }))
    }
  }, [tabs])

  function handleTabClick(tab: AssetType) {
    setActiveTab(tab)
    loadTab(tab)
  }

  function handleParamChange(tab: AssetType) {
    setActiveTab(tab)
    loadTab(tab)
  }

  const current = tabs[activeTab]
  const displayData = activeTab === 'stock' && activeSector !== 'All'
    ? current.data.filter((a) => STOCK_SECTOR_MAP[a.symbol] === activeSector)
    : current.data

  return (
    <section>
      <Suspense fallback={null}>
        <TabParamSync onTabChange={handleParamChange} />
      </Suspense>
      {/* ── Tab bar ── */}
      <div className="mb-0 flex items-center gap-1 overflow-x-auto border-b border-[var(--border)]">
        {TABS.map((tab) => {
          const state    = tabs[tab.id]
          const isActive = tab.id === activeTab

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                flex shrink-0 items-center gap-1.5 border-b-2 px-4 pb-3 pt-1
                text-sm font-medium transition-colors
                ${isActive
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
                }
              `}
            >
              <span aria-hidden>{tab.emoji}</span>
              {tab.label}
              <TabBadge status={state.status} count={state.data.length} isActive={isActive} />
            </button>
          )
        })}
      </div>

      {/* ── Sector filter pills (stocks only) ── */}
      {activeTab === 'stock' && current.status === 'loaded' && current.data.length > 0 && (
        <div className="flex items-center gap-px overflow-x-auto border-b border-[var(--border)] bg-[var(--surface)] px-1 py-0">
          {['All', ...SECTOR_ORDER].map((sector) => {
            const isActive = sector === activeSector
            const color    = sector === 'All' ? 'var(--accent)' : (SECTOR_COLORS[sector] ?? 'var(--accent)')
            return (
              <button
                key={sector}
                onClick={() => setActiveSector(sector)}
                className="relative shrink-0 px-3 py-2 font-mono text-[10px] font-semibold tracking-[0.04em] transition-colors"
                style={{ color: isActive ? color : 'var(--text-muted)' }}
              >
                {sector}
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
      )}

      {/* ── View All link ── */}
      {(() => {
        const TAB_TO_PAGE: Record<string, string> = {
          stock: '/stocks', crypto: '/crypto', forex: '/forex', commodity: '/commodities', etf: '/etf',
        }
        const activeLabel = TABS.find(t => t.id === activeTab)?.label ?? ''
        return (
          <div className="mb-4 mt-3 flex justify-end">
            <Link
              href={TAB_TO_PAGE[activeTab] ?? '/'}
              className="font-mono text-[9px] text-[var(--accent)] hover:underline"
            >
              View All {activeLabel} →
            </Link>
          </div>
        )
      })()}

      {/* ── Content ── */}
      {current.status === 'loading' && <SkeletonGrid />}

      {current.status === 'error' && (
        <ErrorState tab={activeTab} onRetry={() => {
          setTabs((prev) => ({ ...prev, [activeTab]: { data: [], status: 'idle' } }))
          loadTab(activeTab)
        }} />
      )}

      {current.status === 'loaded' && displayData.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {displayData.map((asset) => (
            <AssetCard key={`${asset.type}-${asset.symbol}`} asset={asset} />
          ))}
        </div>
      )}

      {current.status === 'loaded' && displayData.length === 0 && (
        <EmptyState tab={activeTab} />
      )}
    </section>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────

function TabBadge({
  status, count, isActive,
}: {
  status: LoadStatus; count: number; isActive: boolean
}) {
  const base = `ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold`
  const activeColor   = 'bg-[var(--accent-dim)] text-[var(--accent)]'
  const inactiveColor = 'bg-[var(--surface-2)] text-[var(--text-muted)]'
  const color = isActive ? activeColor : inactiveColor

  if (status === 'loading') {
    return (
      <span className={`${base} ${color}`}>
        <span className="inline-block h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
      </span>
    )
  }
  if (status === 'idle') return null
  if (status === 'error') return <span className={`${base} bg-red-500/10 text-red-500`}>!</span>
  return <span className={`${base} ${color}`}>{count}</span>
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1.5">
              <div className="h-3.5 w-16 animate-pulse rounded bg-[var(--surface-2)]" />
              <div className="h-3 w-24 animate-pulse rounded bg-[var(--surface-2)]" />
            </div>
            <div className="h-8 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
          </div>
          <div className="flex items-end justify-between">
            <div className="h-5 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
            <div className="flex flex-col items-end gap-1">
              <div className="h-3 w-12 animate-pulse rounded bg-[var(--surface-2)]" />
              <div className="h-3 w-10 animate-pulse rounded bg-[var(--surface-2)]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ tab }: { tab: AssetType }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-20 text-center">
      <p className="text-3xl">📭</p>
      <p className="mt-3 text-sm font-medium text-[var(--text)]">No {tab} data available</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">Check your API keys or try again.</p>
    </div>
  )
}

function ErrorState({ tab, onRetry }: { tab: AssetType; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-red-500/30 py-20 text-center">
      <p className="text-3xl">⚠️</p>
      <p className="mt-3 text-sm font-medium text-[var(--text)]">Failed to load {tab} data</p>
      <button
        onClick={onRetry}
        className="mt-3 rounded-lg bg-[var(--surface-2)] px-4 py-1.5 text-xs text-[var(--text)] transition hover:bg-[var(--accent-dim)] hover:text-[var(--accent)]"
      >
        Retry
      </button>
    </div>
  )
}
