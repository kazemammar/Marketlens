'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { usePortfolio } from '@/lib/hooks/usePortfolio'
import AuthModal from '@/components/auth/AuthModal'
import AddPositionModal from '@/components/portfolio/AddPositionModal'
import PortfolioSummary from '@/components/portfolio/PortfolioSummary'
import PositionsTable, { type QuoteData } from '@/components/portfolio/PositionsTable'
import PortfolioBrief from '@/components/portfolio/PortfolioBrief'
import PortfolioNewsFeed from '@/components/portfolio/PortfolioNewsFeed'

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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-20 text-center">
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

function Skeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <div className="h-3.5 w-12 animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-16 animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-10 animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="ml-auto h-3.5 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-14 animate-pulse rounded bg-[var(--surface-2)]" />
        </div>
      ))}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const { user, loading: authLoading } = useAuth()
  const { positions, loading: posLoading, addPosition, updatePosition, removePosition, refetch } = usePortfolio()

  const [quotes,   setQuotes]   = useState<Record<string, QuoteData>>({})
  const [addOpen,  setAddOpen]  = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  // Fetch live prices for all positions
  const fetchQuotes = useCallback(async () => {
    if (positions.length === 0) return

    const stocks:     string[] = []
    const cryptos:    string[] = []
    const commodities:string[] = []
    const forexPairs: string[] = []

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

    // Stocks + ETFs
    if (stocks.length > 0) {
      try {
        const r = await fetch(`/api/quotes?symbols=${encodeURIComponent(stocks.join(','))}`)
        if (r.ok) {
          const data = await r.json() as Record<string, QuoteData>
          Object.assign(merged, data)
        }
      } catch { /* silent */ }
    }

    // Crypto
    if (cryptos.length > 0) {
      try {
        const r = await fetch(`/api/quotes?symbols=${encodeURIComponent(cryptos.join(','))}`)
        if (r.ok) {
          const data = await r.json() as Record<string, QuoteData>
          // Map BINANCE:XYZUSDT back to XYZ
          for (const [binanceKey, quote] of Object.entries(data)) {
            const plain = Object.keys(CRYPTO_TO_BINANCE).find((k) => CRYPTO_TO_BINANCE[k] === binanceKey)
            if (plain) merged[plain] = quote
          }
        }
      } catch { /* silent */ }
    }

    // Commodities
    if (commodities.length > 0) {
      try {
        const r = await fetch(`/api/quotes?symbols=${encodeURIComponent(commodities.join(','))}`)
        if (r.ok) {
          const data = await r.json() as Record<string, QuoteData>
          Object.assign(merged, data)
        }
      } catch { /* silent */ }
    }

    // Forex — fetch all pairs, pick the ones we need
    if (forexPairs.length > 0) {
      try {
        const r = await fetch('/api/forex')
        if (r.ok) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const data = await r.json() as any[]
          for (const pair of forexPairs) {
            const item = data.find(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (d: any) => d.symbol === pair || d.pair === pair
            )
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

  // Initial fetch + poll every 60s
  useEffect(() => {
    fetchQuotes()
    const id = setInterval(fetchQuotes, 60_000)
    return () => clearInterval(id)
  }, [fetchQuotes])

  // Refetch quotes after positions change
  useEffect(() => {
    fetchQuotes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions.length])

  // ── Auth gate ────────────────────────────────────────────────────────
  if (!authLoading && !user) {
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

  const isLoading = authLoading || posLoading

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Summary bar */}
      {!isLoading && positions.length > 0 && (
        <PortfolioSummary positions={positions} quotes={quotes} />
      )}

      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-mono text-[22px] font-bold tracking-tight text-[var(--text)]">
              My Portfolio
            </h1>
            {user && (
              <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
                {positions.length} position{positions.length !== 1 ? 's' : ''} · {user.email}
              </p>
            )}
          </div>
          {!isLoading && (
            <button
              onClick={() => setAddOpen(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2.5 font-mono text-[12px] font-semibold text-white transition hover:opacity-90"
              style={{ background: 'var(--accent)' }}
            >
              <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3" aria-hidden>
                <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Add Position
            </button>
          )}
        </div>

        {/* Content */}
        {isLoading && <Skeleton />}

        {!isLoading && positions.length === 0 && (
          <EmptyPortfolio onAdd={() => setAddOpen(true)} />
        )}

        {!isLoading && positions.length > 0 && (
          <>
            {/* AI Brief */}
            <PortfolioBrief positionCount={positions.length} />

            {/* Positions table */}
            <div className="rounded-xl border border-[var(--border)] overflow-hidden">
              <PositionsTable
                positions={positions}
                quotes={quotes}
                onUpdate={updatePosition}
                onDelete={removePosition}
              />
            </div>

            {/* News feed */}
            <PortfolioNewsFeed positionCount={positions.length} />
          </>
        )}
      </div>

      {/* Modals */}
      <AddPositionModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={async (data) => {
          const ok = await addPosition(
            data.symbol,
            data.assetType,
            data.direction,
            data.quantity,
            data.avgCost,
            data.notes,
          )
          if (ok) { await refetch() }
          return ok
        }}
      />
    </div>
  )
}
