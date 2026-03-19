'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth }      from '@/lib/hooks/useAuth'
import { usePortfolio } from '@/lib/hooks/usePortfolio'

import AuthModal        from '@/components/auth/AuthModal'
import AddPositionModal from '@/components/portfolio/AddPositionModal'
import PortfolioSummary from '@/components/portfolio/PortfolioSummary'
import PortfolioBrief   from '@/components/portfolio/PortfolioBrief'
import PositionsTable, { type QuoteData } from '@/components/portfolio/PositionsTable'
import PortfolioNewsFeed from '@/components/portfolio/PortfolioNewsFeed'
import DayMovers        from '@/components/portfolio/DayMovers'
import AllocationPanel  from '@/components/portfolio/AllocationPanel'
import RiskAlerts       from '@/components/portfolio/RiskAlerts'
import ExposurePanel    from '@/components/portfolio/ExposurePanel'
import EarningsCalendar  from '@/components/portfolio/EarningsCalendar'
import BenchmarkChart   from '@/components/portfolio/BenchmarkChart'
import PerformanceChart from '@/components/portfolio/PerformanceChart'

// ─── Demo mode data ────────────────────────────────────────────────────────

import type { PortfolioPosition } from '@/lib/hooks/usePortfolio'
import type { QuoteData as QD } from '@/components/portfolio/PositionsTable'

const DEMO_POSITIONS: PortfolioPosition[] = [
  { id: 'd1',  symbol: 'AAPL',  asset_type: 'stock',     direction: 'long',  quantity: 50,  avg_cost: 178.50, notes: 'core holding', lots: [{ id: 'l1', date: '2024-06-15', quantity: 30, price: 172.00, amount: 5160, createdAt: '2024-06-15T00:00:00Z' }, { id: 'l2', date: '2024-11-20', quantity: 20, price: 188.25, amount: 3765, createdAt: '2024-11-20T00:00:00Z' }], purchase_date: '2024-06-15', added_at: '2024-06-15T00:00:00Z', updated_at: '2024-11-20T00:00:00Z' },
  { id: 'd2',  symbol: 'MSFT',  asset_type: 'stock',     direction: 'long',  quantity: 25,  avg_cost: 390.00, notes: null, lots: [], purchase_date: '2024-08-01', added_at: '2024-08-01T00:00:00Z', updated_at: '2024-08-01T00:00:00Z' },
  { id: 'd3',  symbol: 'NVDA',  asset_type: 'stock',     direction: 'long',  quantity: 40,  avg_cost: 485.00, notes: 'AI play', lots: [], purchase_date: '2024-09-10', added_at: '2024-09-10T00:00:00Z', updated_at: '2024-09-10T00:00:00Z' },
  { id: 'd4',  symbol: 'TSLA',  asset_type: 'stock',     direction: 'short', quantity: 15,  avg_cost: 340.00, notes: 'hedge', lots: [], purchase_date: '2025-01-05', added_at: '2025-01-05T00:00:00Z', updated_at: '2025-01-05T00:00:00Z' },
  { id: 'd5',  symbol: 'BTC',   asset_type: 'crypto',    direction: 'long',  quantity: 0.8, avg_cost: 62000,  notes: null, lots: [], purchase_date: '2024-03-20', added_at: '2024-03-20T00:00:00Z', updated_at: '2024-03-20T00:00:00Z' },
  { id: 'd6',  symbol: 'ETH',   asset_type: 'crypto',    direction: 'long',  quantity: 5,   avg_cost: 3200,   notes: null, lots: [], purchase_date: '2024-05-10', added_at: '2024-05-10T00:00:00Z', updated_at: '2024-05-10T00:00:00Z' },
  { id: 'd7',  symbol: 'GC=F',  asset_type: 'commodity', direction: 'long',  quantity: 10,  avg_cost: 2050,   notes: 'inflation hedge', lots: [], purchase_date: '2024-07-01', added_at: '2024-07-01T00:00:00Z', updated_at: '2024-07-01T00:00:00Z' },
  { id: 'd8',  symbol: 'CL=F',  asset_type: 'commodity', direction: 'short', quantity: 20,  avg_cost: 78.50,  notes: 'oil short', lots: [], purchase_date: '2025-02-01', added_at: '2025-02-01T00:00:00Z', updated_at: '2025-02-01T00:00:00Z' },
  { id: 'd9',  symbol: 'JPM',   asset_type: 'stock',     direction: 'long',  quantity: 30,  avg_cost: 195.00, notes: null, lots: [], purchase_date: '2024-04-15', added_at: '2024-04-15T00:00:00Z', updated_at: '2024-04-15T00:00:00Z' },
  { id: 'd10', symbol: 'AMZN',  asset_type: 'stock',     direction: 'long',  quantity: 20,  avg_cost: 178.00, notes: null, lots: [], purchase_date: '2024-10-01', added_at: '2024-10-01T00:00:00Z', updated_at: '2024-10-01T00:00:00Z' },
]

const DEMO_QUOTES: Record<string, QD> = {
  AAPL:   { price: 215.30,  change: 2.15,   changePercent: 1.01 },
  MSFT:   { price: 425.80,  change: -3.20,  changePercent: -0.75 },
  NVDA:   { price: 890.50,  change: 15.40,  changePercent: 1.76 },
  TSLA:   { price: 310.20,  change: -8.50,  changePercent: -2.67 },
  BTC:    { price: 87500,   change: 1250,   changePercent: 1.45 },
  ETH:    { price: 3450,    change: -45,    changePercent: -1.29 },
  'GC=F': { price: 2380,    change: 12.50,  changePercent: 0.53 },
  'CL=F': { price: 82.30,   change: 1.80,   changePercent: 2.24 },
  JPM:    { price: 215.60,  change: 1.30,   changePercent: 0.61 },
  AMZN:   { price: 198.40,  change: 4.20,   changePercent: 2.16 },
}

// ─── Crypto symbol mapping ─────────────────────────────────────────────────

const CRYPTO_TO_BINANCE: Record<string, string> = {
  BTC:  'BINANCE:BTCUSDT',
  ETH:  'BINANCE:ETHUSDT',
  SOL:  'BINANCE:SOLUSDT',
  BNB:  'BINANCE:BNBUSDT',
  XRP:  'BINANCE:XRPUSDT',
  ADA:  'BINANCE:ADAUSDT',
  AVAX: 'BINANCE:AVAXUSDT',
  DOGE: 'BINANCE:DOGEUSDT',
  DOT:  'BINANCE:DOTUSDT',
  MATIC:'BINANCE:MATICUSDT',
  LINK: 'BINANCE:LINKUSDT',
  UNI:  'BINANCE:UNIUSDT',
  ATOM: 'BINANCE:ATOMUSDT',
  LTC:  'BINANCE:LTCUSDT',
}

// ─── Empty state ───────────────────────────────────────────────────────────

function EmptyPortfolio({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <p className="text-3xl">📊</p>
      <p className="mt-4 font-mono text-[14px] font-medium text-[var(--text)]">
        Your portfolio is empty
      </p>
      <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)] max-w-xs">
        Add your first position to get personalized market intelligence and live P&L tracking.
      </p>
      <button
        onClick={onAdd}
        className="mt-6 rounded-lg px-5 py-2.5 font-mono text-[12px] font-semibold text-white transition hover:opacity-90"
        style={{ background: 'var(--accent)' }}
      >
        Add Position
      </button>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {[
          { label: 'Stocks',      href: '/stocks'      },
          { label: 'Crypto',      href: '/crypto'      },
          { label: 'Forex',       href: '/forex'       },
          { label: 'Commodities', href: '/commodities' },
          { label: 'ETFs',        href: '/etf'         },
        ].map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-mono text-[11px] text-[var(--text-muted)] transition hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Loading skeleton ──────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="px-4 py-8 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <div className="h-3.5 w-12 animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-16 animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-10 animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="ml-auto h-3.5 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
        </div>
      ))}
    </div>
  )
}

// ─── Section header ────────────────────────────────────────────────────────

function SectionHeader({
  icon, label, right,
}: {
  icon:  React.ReactNode
  label: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 sm:px-4">
      <div className="flex items-center gap-2">
        {icon}
        <span
          className="truncate font-mono font-semibold uppercase text-[var(--text)]"
          style={{ fontSize: '11px', letterSpacing: '0.05em' }}
        >
          {label}
        </span>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-[var(--border)] to-transparent" />
      {right}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const searchParams = useSearchParams()
  const isDemo = process.env.NODE_ENV === 'development' && searchParams.get('demo') === 'true'

  const { user, loading: authLoading } = useAuth()
  const { positions, loading: posLoading, addPosition, updatePosition, removePosition, addLotToPosition, removeLot, updateLot, refetch } = usePortfolio()

  const [quotes,       setQuotes]       = useState<Record<string, QuoteData>>({})
  const [addOpen,      setAddOpen]      = useState(false)
  const [authOpen,     setAuthOpen]     = useState(false)
  const [briefTrigger, setBriefTrigger] = useState(0)
  const [prefill,      setPrefill]      = useState<{ symbol: string; type: string } | undefined>()

  // ── Fetch live prices ─────────────────────────────────────────────────
  const fetchQuotes = useCallback(async () => {
    if (positions.length === 0) return

    const stocks:      string[] = []
    const cryptos:     string[] = []
    const commodities: string[] = []
    const forexPairs:  string[] = []

    for (const p of positions) {
      switch (p.asset_type) {
        case 'stock':
        case 'etf':
          stocks.push(p.symbol)
          break
        case 'crypto': {
          const binance = CRYPTO_TO_BINANCE[p.symbol.toUpperCase()]
          if (binance) cryptos.push(binance)
          break
        }
        case 'commodity':
          commodities.push(p.symbol)
          break
        case 'forex':
          forexPairs.push(p.symbol)
          break
      }
    }

    const merged: Record<string, QuoteData> = {}

    if (stocks.length > 0) {
      try {
        const r = await fetch(`/api/quotes?symbols=${encodeURIComponent(stocks.join(','))}`)
        if (r.ok) Object.assign(merged, await r.json() as Record<string, QuoteData>)
      } catch { /* silent */ }
    }

    if (cryptos.length > 0) {
      try {
        const r = await fetch(`/api/quotes?symbols=${encodeURIComponent(cryptos.join(','))}`)
        if (r.ok) {
          const data = await r.json() as Record<string, QuoteData>
          for (const [binanceKey, quote] of Object.entries(data)) {
            const plain = Object.keys(CRYPTO_TO_BINANCE).find((k) => CRYPTO_TO_BINANCE[k] === binanceKey)
            if (plain) merged[plain] = quote
          }
        }
      } catch { /* silent */ }
    }

    if (commodities.length > 0) {
      try {
        const r = await fetch(`/api/quotes?symbols=${encodeURIComponent(commodities.join(','))}`)
        if (r.ok) Object.assign(merged, await r.json() as Record<string, QuoteData>)
      } catch { /* silent */ }
    }

    if (forexPairs.length > 0) {
      try {
        const r = await fetch('/api/forex')
        if (r.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = await r.json() as any[]
          for (const pair of forexPairs) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const item = data.find((d: any) => d.symbol === pair || d.pair === pair)
            if (item) {
              merged[pair] = {
                price:         item.price ?? item.rate ?? 0,
                change:        item.change ?? 0,
                changePercent: item.changePercent ?? 0,
              }
            }
          }
        }
      } catch { /* silent */ }
    }

    setQuotes(merged)
  }, [positions])

  useEffect(() => {
    fetchQuotes()
    const id = setInterval(fetchQuotes, 60_000)
    return () => clearInterval(id)
  }, [fetchQuotes])

  useEffect(() => {
    fetchQuotes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions.length])

  const activePositions = isDemo ? DEMO_POSITIONS : positions
  const activeQuotes    = isDemo ? DEMO_QUOTES    : quotes
  const isLoading       = isDemo ? false          : (authLoading || posLoading)

  // All-time P&L — same source as summary bar, passed to BenchmarkChart for consistency
  const allTimeStats = useMemo(() => {
    let totalValue = 0
    let totalCost  = 0
    let withCost   = 0
    for (const p of activePositions) {
      const q = activeQuotes[p.symbol]
      if (!q || !p.quantity || !p.avg_cost) continue
      const qty = Number(p.quantity)
      const avg = Number(p.avg_cost)
      if (qty <= 0 || avg <= 0) continue
      withCost++
      totalValue += qty * q.price
      totalCost  += qty * avg
    }
    const allTimePnl = totalValue - totalCost
    const allTimePct = totalCost > 0 ? (allTimePnl / totalCost) * 100 : 0
    return {
      allTimeReturn:     allTimePct,
      allTimeReturnAmt:  allTimePnl,
      totalCost,
      totalValue,
      positionsWithCost: withCost,
      totalPositions:    activePositions.length,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePositions, activeQuotes])

  // ── Auth gate ─────────────────────────────────────────────────────────
  if (!authLoading && !user && !isDemo) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6">
          <h1 className="font-mono text-[22px] font-bold tracking-tight text-[var(--text)]">My Portfolio</h1>
          <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-20 text-center">
            <p className="text-3xl">🔒</p>
            <p className="mt-4 font-mono text-[14px] font-medium text-[var(--text)]">
              Sign in to see your portfolio
            </p>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
              Create a free account to track positions and monitor live P&amp;L.
            </p>
            <button
              onClick={() => setAuthOpen(true)}
              className="mt-6 rounded-lg px-5 py-2.5 font-mono text-[12px] font-semibold text-white transition hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              Sign In / Create Account
            </button>
          </div>
        </div>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ══ SUMMARY BAR ══════════════════════════════════════════════════ */}
      <PortfolioSummary positions={activePositions} quotes={activeQuotes} />

      {/* ══ AI BRIEF ═════════════════════════════════════════════════════ */}
      <PortfolioBrief positionCount={activePositions.length} refreshTrigger={briefTrigger} />

      {/* ══ LOADING ══════════════════════════════════════════════════════ */}
      {isLoading && <LoadingSkeleton />}

      {/* ══ EMPTY STATE ══════════════════════════════════════════════════ */}
      {!isLoading && activePositions.length === 0 && (
        <EmptyPortfolio onAdd={() => setAddOpen(true)} />
      )}

      {/* ══ PORTFOLIO CONTENT ════════════════════════════════════════════ */}
      {!isLoading && activePositions.length > 0 && (
        <>
          {/* ── Section header: PORTFOLIO INTELLIGENCE ──────────────────── */}
          <SectionHeader
            icon={
              <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1"/>
                <circle cx="8" cy="8" r="1" fill="currentColor"/>
              </svg>
            }
            label="Portfolio Intelligence"
            right={
              <div className="hidden sm:flex items-center gap-1">
                <span className="live-dot h-1 w-1 rounded-full" style={{ background: 'var(--accent)' }} />
                <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">LIVE</span>
              </div>
            }
          />

          {/* ── Row 1: Day Movers | Allocation ──────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-[var(--border)] bg-[var(--surface)] sm:min-h-[200px]">
            <div className="min-w-0 overflow-hidden flex flex-col border-b sm:border-b-0 sm:border-r border-[var(--border)]">
              <DayMovers positions={activePositions} quotes={activeQuotes} />
            </div>
            <div className="min-w-0 overflow-hidden flex flex-col">
              <AllocationPanel positions={activePositions} quotes={activeQuotes} />
            </div>
          </div>

          {/* ── Row 2: Risk Alerts | Exposure ───────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 border-b border-[var(--border)] bg-[var(--surface)] sm:min-h-[180px]">
            <div className="min-w-0 overflow-hidden flex flex-col border-b sm:border-b-0 sm:border-r border-[var(--border)]">
              <RiskAlerts positions={activePositions} quotes={activeQuotes} />
            </div>
            <div className="min-w-0 overflow-hidden flex flex-col">
              <ExposurePanel positions={activePositions} quotes={activeQuotes} />
            </div>
          </div>

          {/* ── Benchmark Comparison ─────────────────────────────────────── */}
          <div className="border-b border-[var(--border)] bg-[var(--surface)]">
            <BenchmarkChart {...allTimeStats} />
          </div>

          {/* ── Performance History ──────────────────────────────────────── */}
          <div className="border-b border-[var(--border)] bg-[var(--surface)]">
            <PerformanceChart />
          </div>

          {/* ── Earnings Calendar ────────────────────────────────────────── */}
          {activePositions.some((p) => p.asset_type === 'stock' || p.asset_type === 'etf') && (
            <div className="border-b border-[var(--border)] bg-[var(--surface)]">
              <EarningsCalendar />
            </div>
          )}

          {/* ── Section header: POSITIONS ────────────────────────────────── */}
          <SectionHeader
            icon={
              <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0 text-[var(--text-muted)]" aria-hidden>
                <rect x="1" y="3" width="14" height="2" rx="0.5" fill="currentColor" opacity="0.5"/>
                <rect x="1" y="7" width="14" height="2" rx="0.5" fill="currentColor" opacity="0.7"/>
                <rect x="1" y="11" width="14" height="2" rx="0.5" fill="currentColor"/>
              </svg>
            }
            label="Positions"
            right={
              <div className="flex items-center gap-2">
                <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
                  {activePositions.length} position{activePositions.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => setAddOpen(true)}
                  className="flex items-center gap-1 rounded px-2.5 py-1 font-mono text-[10px] font-semibold text-white transition hover:opacity-90"
                  style={{ background: 'var(--accent)' }}
                >
                  <svg viewBox="0 0 10 10" fill="none" className="h-2 w-2" aria-hidden>
                    <line x1="5" y1="1" x2="5" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                    <line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                  Add
                </button>
              </div>
            }
          />

          {/* ── Positions table ──────────────────────────────────────────── */}
          <div className="border-b border-[var(--border)]">
            <PositionsTable
              positions={activePositions}
              quotes={activeQuotes}
              onUpdate={async (id, data) => {
                const ok = await updatePosition(id, data)
                if (ok) setBriefTrigger((n) => n + 1)
                return ok
              }}
              onDelete={async (id) => {
                const ok = await removePosition(id)
                if (ok) setBriefTrigger((n) => n + 1)
                return ok
              }}
              onDeleteLot={async (positionId, lotId) => {
                const ok = await removeLot(positionId, lotId)
                if (ok) setBriefTrigger((n) => n + 1)
                return ok
              }}
              onEditLot={async (positionId, updatedLot) => {
                const ok = await updateLot(positionId, updatedLot)
                if (ok) setBriefTrigger((n) => n + 1)
                return ok
              }}
              onAddMore={(position) => {
                setPrefill({ symbol: position.symbol, type: position.asset_type })
                setAddOpen(true)
              }}
            />
          </div>

          {/* ── Section header: PORTFOLIO NEWS ───────────────────────────── */}
          <SectionHeader
            icon={
              <span className="live-dot h-1.5 w-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
            }
            label="Portfolio News"
            right={null}
          />

          {/* ── News feed ────────────────────────────────────────────────── */}
          <div className="max-h-[500px] overflow-y-auto">
            <PortfolioNewsFeed positionCount={activePositions.length} refreshTrigger={briefTrigger} />
          </div>
        </>
      )}

      {/* ══ MODALS ═══════════════════════════════════════════════════════ */}
      <AddPositionModal
        isOpen={addOpen}
        onClose={() => { setAddOpen(false); setPrefill(undefined) }}
        prefill={prefill}
        positions={activePositions}
        onAddLot={async (positionId, lot) => {
          const ok = await addLotToPosition(positionId, lot)
          if (ok) setBriefTrigger((n) => n + 1)
          return ok
        }}
        onAdd={async (data) => {
          const ok = await addPosition(
            data.symbol,
            data.assetType,
            data.direction,
            data.quantity,
            data.avgCost,
            data.notes,
            data.lots   ?? null,
            data.purchaseDate ?? null,
          )
          if (ok) { await refetch(); setBriefTrigger((n) => n + 1) }
          return ok
        }}
      />
    </div>
  )
}
