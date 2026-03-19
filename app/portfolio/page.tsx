'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
        className="mt-6 rounded px-5 py-2.5 font-mono text-[12px] font-semibold text-black transition hover:opacity-90"
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
            className="rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-mono text-[11px] text-[var(--text-muted)] transition hover:border-[var(--accent)]/30 hover:text-[var(--text)]"
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
        <div key={i} className="flex items-center gap-4 rounded border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
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
    <div className="flex items-center gap-2 px-3 py-3 sm:px-4">
      <div className="flex items-center gap-2">
        {icon}
        <span
          className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]"
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

  const activePositions = positions
  const activeQuotes    = quotes
  const isLoading       = authLoading || posLoading

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
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6">
          <h1 className="font-mono text-[22px] font-bold tracking-tight text-[var(--text)]">My Portfolio</h1>
          <div className="mt-8 flex flex-col items-center justify-center rounded border border-dashed border-[var(--border)] py-20 text-center">
            <p className="text-3xl">🔒</p>
            <p className="mt-4 font-mono text-[14px] font-medium text-[var(--text)]">
              Sign in to see your portfolio
            </p>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
              Create a free account to track positions and monitor live P&amp;L.
            </p>
            <button
              onClick={() => setAuthOpen(true)}
              className="mt-6 rounded px-5 py-2.5 font-mono text-[12px] font-semibold text-white transition hover:opacity-90"
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
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bg)' }}>

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
                <span className="live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
                <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--accent)' }}>LIVE</span>
              </div>
            }
          />

          {/* ── Row 1: Day Movers | Allocation ──────────────────────────── */}
          <div className="grid grid-cols-1 gap-1.5 px-3 sm:grid-cols-2 sm:px-4 py-2">
            <div className="min-w-0 overflow-hidden flex flex-col rounded border border-[var(--border)] bg-[var(--surface)]">
              <DayMovers positions={activePositions} quotes={activeQuotes} />
            </div>
            <div className="min-w-0 overflow-hidden flex flex-col rounded border border-[var(--border)] bg-[var(--surface)]">
              <AllocationPanel positions={activePositions} quotes={activeQuotes} />
            </div>
          </div>

          {/* ── Row 2: Risk Alerts | Exposure ───────────────────────────── */}
          <div className="grid grid-cols-1 gap-1.5 px-3 sm:grid-cols-2 sm:px-4 py-2">
            <div className="min-w-0 overflow-hidden flex flex-col rounded border border-[var(--border)] bg-[var(--surface)]">
              <RiskAlerts positions={activePositions} quotes={activeQuotes} />
            </div>
            <div className="min-w-0 overflow-hidden flex flex-col rounded border border-[var(--border)] bg-[var(--surface)]">
              <ExposurePanel positions={activePositions} quotes={activeQuotes} />
            </div>
          </div>

          {/* ── Benchmark Comparison ─────────────────────────────────────── */}
          <div className="px-3 sm:px-4 py-2">
            <div className="rounded border border-[var(--border)] bg-[var(--surface)]">
              <BenchmarkChart {...allTimeStats} />
            </div>
          </div>

          {/* ── Performance History ──────────────────────────────────────── */}
          <div className="px-3 sm:px-4 py-2">
            <div className="rounded border border-[var(--border)] bg-[var(--surface)]">
              <PerformanceChart />
            </div>
          </div>

          {/* ── Earnings Calendar ────────────────────────────────────────── */}
          {activePositions.some((p) => p.asset_type === 'stock' || p.asset_type === 'etf') && (
            <div className="px-3 sm:px-4 py-2">
              <div className="rounded border border-[var(--border)] bg-[var(--surface)]">
                <EarningsCalendar />
              </div>
            </div>
          )}

          {/* ── Section header: POSITIONS ────────────────────────────────── */}
          <SectionHeader
            icon={
              <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
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
          <div className="px-3 sm:px-4 py-2">
            <div className="rounded border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
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
          <div className="px-3 sm:px-4 py-2">
            <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] max-h-[500px] overflow-y-auto">
              <PortfolioNewsFeed positionCount={activePositions.length} refreshTrigger={briefTrigger} />
            </div>
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
