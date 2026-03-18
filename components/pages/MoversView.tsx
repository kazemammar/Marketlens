'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

// ─── Types ─────────────────────────────────────────────────────────────────

interface MoverItem {
  symbol:        string
  name:          string
  type:          string
  price:         number
  change:        number
  changePercent: number
}

interface MoversPayload {
  all:         { gainers: MoverItem[]; losers: MoverItem[] }
  stocks:      { gainers: MoverItem[]; losers: MoverItem[] }
  crypto:      { gainers: MoverItem[]; losers: MoverItem[] }
  commodities: { gainers: MoverItem[]; losers: MoverItem[] }
  generatedAt: number
}

type TabKey = 'all' | 'stocks' | 'crypto' | 'commodities'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',         label: 'All'         },
  { key: 'stocks',      label: 'Stocks'      },
  { key: 'crypto',      label: 'Crypto'      },
  { key: 'commodities', label: 'Commodities' },
]

const TYPE_COLORS: Record<string, string> = {
  stock:     'bg-emerald-500/10 text-emerald-400',
  crypto:    'bg-orange-500/10 text-orange-400',
  commodity: 'bg-amber-500/10 text-amber-400',
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtPrice(price: number, type: string): string {
  if (type === 'commodity' || price > 500) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  if (price < 1) return `$${price.toFixed(4)}`
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtChange(change: number): string {
  const sign = change >= 0 ? '+' : '−'
  const abs  = Math.abs(change)
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(2)}`
}

function assetHref(type: string, symbol: string): string {
  // crypto uses 'crypto', stock uses 'stock', commodity uses 'commodity'
  const t = type === 'stock' ? 'stock' : type === 'crypto' ? 'crypto' : 'commodity'
  return `/asset/${t}/${encodeURIComponent(symbol)}`
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="mx-2 mb-2 overflow-hidden rounded-md border-l-2 border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div className="h-3 w-4 animate-pulse rounded bg-[var(--border)]" />
        <div className="h-3 w-12 animate-pulse rounded bg-[var(--border)]" />
        <div className="h-3 flex-1 animate-pulse rounded bg-[var(--border)]" />
        <div className="h-3 w-14 animate-pulse rounded bg-[var(--border)]" />
        <div className="h-3 w-12 animate-pulse rounded bg-[var(--border)]" />
      </div>
      <div className="mt-2 h-1.5 w-full animate-pulse rounded-full bg-[var(--border)]" />
    </div>
  )
}

function SkeletonColumn({ count = 10 }: { count?: number }) {
  return (
    <div className="pt-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

// ─── Mover card ────────────────────────────────────────────────────────────

function MoverCard({
  item, rank, isGainer, showType, delay,
}: {
  item:     MoverItem
  rank:     number
  isGainer: boolean
  showType: boolean
  delay:    number
}) {
  const colorHex = isGainer ? '#22c55e' : '#ef4444'
  const barPct   = Math.min(Math.abs(item.changePercent) / 5, 1) * 100

  return (
    <div
      className="animate-fade-up mx-2 mb-2 overflow-hidden rounded-md cursor-default"
      style={{
        borderLeft:        `2px solid ${colorHex}90`,
        background:        `linear-gradient(to right, ${colorHex}08, transparent 70%)`,
        animationDelay:    `${delay}ms`,
        animationFillMode: 'both',
        transition:        'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform   = 'translateY(-1px)'
        el.style.borderColor = colorHex
        el.style.boxShadow   = `0 2px 8px ${colorHex}20`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform   = 'translateY(0)'
        el.style.borderColor = `${colorHex}90`
        el.style.boxShadow   = 'none'
      }}
    >
      {/* Top row */}
      <div className="flex items-center gap-1.5 px-2 pt-1.5 pb-0.5">
        {/* Rank */}
        <span className="w-4 shrink-0 font-mono text-[9px] tabular-nums text-[var(--text-muted)] opacity-40 text-right">
          {rank}
        </span>

        {/* Symbol */}
        <Link
          href={assetHref(item.type, item.symbol)}
          className="font-mono text-[12px] font-bold hover:underline shrink-0"
          style={{ color: 'var(--accent)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {item.symbol}
        </Link>

        {/* Type pill (only on All tab) */}
        {showType && (
          <span className={`shrink-0 rounded px-1 py-px font-mono text-[7px] font-bold uppercase tracking-wide ${TYPE_COLORS[item.type] ?? 'bg-zinc-800 text-zinc-400'}`}>
            {item.type}
          </span>
        )}

        {/* Name */}
        <span className="min-w-0 flex-1 truncate font-mono text-[9px] text-[var(--text-muted)] opacity-60">
          {item.name}
        </span>

        {/* Price */}
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--text)] opacity-80">
          {fmtPrice(item.price, item.type)}
        </span>

        {/* Change % */}
        <span
          className="shrink-0 font-mono text-[12px] font-bold tabular-nums"
          style={{ color: colorHex, textShadow: `0 0 10px ${colorHex}50` }}
        >
          {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
        </span>
      </div>

      {/* Bar + dollar change */}
      <div className="mx-2 mb-1 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width:      `${barPct}%`,
              background: `linear-gradient(to right, ${colorHex}60, ${colorHex})`,
              boxShadow:  `0 0 6px ${colorHex}60`,
            }}
          />
        </div>
        <span className="shrink-0 font-mono text-[9px] tabular-nums text-[var(--text-muted)] opacity-50">
          {fmtChange(item.change)}
        </span>
      </div>
    </div>
  )
}

// ─── Column ────────────────────────────────────────────────────────────────

function MoverColumn({
  items, isGainer, showType, loading,
}: {
  items:    MoverItem[]
  isGainer: boolean
  showType: boolean
  loading:  boolean
}) {
  const colorHex = isGainer ? '#22c55e' : '#ef4444'
  const label    = isGainer ? 'Gainers' : 'Losers'
  const arrow    = isGainer ? '▲' : '▼'

  return (
    <div className="flex flex-col min-w-0">
      {/* Column header */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-1.5">
        <svg viewBox="0 0 10 10" fill="none" className="h-2.5 w-2.5 shrink-0" aria-hidden>
          {isGainer ? (
            <polyline points="1,7 4,3 7,5 9,1" stroke={colorHex} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          ) : (
            <polyline points="1,2 4,6 7,4 9,8" stroke={colorHex} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          )}
        </svg>
        <span
          className="font-mono text-[9px] font-semibold uppercase tracking-wide"
          style={{ color: colorHex, textShadow: `0 0 8px ${colorHex}60` }}
        >
          {arrow} {label}
        </span>
      </div>

      {loading ? (
        <SkeletonColumn count={10} />
      ) : items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-4 py-8">
          <p className="font-mono text-[10px] text-[var(--text-muted)] opacity-40">No data</p>
        </div>
      ) : (
        <div className="pt-1.5">
          {items.map((item, i) => (
            <MoverCard
              key={`${item.type}-${item.symbol}`}
              item={item}
              rank={i + 1}
              isGainer={isGainer}
              showType={showType}
              delay={i * 30}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main view ─────────────────────────────────────────────────────────────

export default function MoversView() {
  const [data,    setData]    = useState<MoversPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [tab,     setTab]     = useState<TabKey>('all')
  const fetchingRef           = useRef(false)

  const fetchData = useCallback(async (silent = false) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    if (!silent) setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/movers')
      if (!res.ok) throw new Error('fetch failed')
      const json = await res.json() as MoversPayload
      setData(json)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [])

  // Initial fetch
  useEffect(() => { fetchData() }, [fetchData])

  // Auto-refresh every 90s when tab is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) fetchData(true)
    }, 90_000)
    return () => clearInterval(interval)
  }, [fetchData])

  const current   = data ? data[tab] : null
  const showType  = tab === 'all'
  const gainers   = current?.gainers ?? []
  const losers    = current?.losers  ?? []

  const generatedAt = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">

        {/* Page header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
                <polyline points="2,14 7,8 11,11 15,5 18,3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="2,17 7,11 11,14 15,8 18,6" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"/>
              </svg>
              <h1 className="font-mono text-[13px] font-bold uppercase tracking-[0.16em] text-[var(--text)]">
                Top Movers
              </h1>
              <span
                className="rounded-full px-2 py-px font-mono text-[8px] font-bold uppercase tracking-wide"
                style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--accent)' }}
              >
                Live
              </span>
            </div>
            <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)] opacity-60">
              Biggest gainers and losers across stocks, crypto &amp; commodities
            </p>
          </div>

          {/* Timestamp + refresh */}
          <div className="flex items-center gap-2">
            {generatedAt && (
              <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-40 tabular-nums">
                Updated {generatedAt}
              </span>
            )}
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[9px] text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
            >
              <svg viewBox="0 0 12 12" fill="none" className={`h-2.5 w-2.5 ${loading ? 'animate-spin' : ''}`} stroke="currentColor" strokeWidth="1.5">
                <path d="M10 6A4 4 0 1 1 6 2" strokeLinecap="round"/>
                <polyline points="10,2 10,6 6,6" fill="currentColor" stroke="none"/>
                <path d="M10 2l0 4-4 0" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Error state */}
        {error && !data && (
          <div className="flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-12">
            <div className="text-center">
              <svg viewBox="0 0 20 20" fill="none" className="mx-auto mb-3 h-8 w-8 text-[var(--text-muted)] opacity-30" stroke="currentColor" strokeWidth="1.3">
                <circle cx="10" cy="10" r="8"/><line x1="10" y1="6" x2="10" y2="11"/><circle cx="10" cy="13.5" r="0.8" fill="currentColor"/>
              </svg>
              <p className="font-mono text-[11px] text-[var(--text-muted)]">Market data temporarily unavailable</p>
              <button
                onClick={() => fetchData()}
                className="mt-3 font-mono text-[10px] text-[var(--accent)] hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Tab row */}
        {!error && (
          <>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="rounded-full border px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide transition-colors"
                  style={tab === t.key ? {
                    background:   'var(--accent)',
                    borderColor:  'var(--accent)',
                    color:        '#000',
                  } : {
                    background:   'var(--surface)',
                    borderColor:  'var(--border)',
                    color:        'var(--text-muted)',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Gainers / Losers grid */}
            <div
              className="overflow-hidden rounded-xl border border-[var(--border)]"
              style={{ background: 'var(--surface)' }}
            >
              {/* Panel header */}
              <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
                <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
                  <polyline points="1,12 5,7 8,9 11,4 15,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="font-mono font-bold uppercase tracking-[0.14em] text-[var(--text)]" style={{ fontSize: '9px' }}>
                  {TABS.find(t => t.key === tab)?.label ?? 'All'} Movers
                </span>
                {!loading && (
                  <span className="ml-auto font-mono text-[8px] text-[var(--text-muted)] opacity-40">
                    {gainers.length + losers.length} tracked
                  </span>
                )}
              </div>

              {/* Two-column grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
                <MoverColumn items={gainers} isGainer={true}  showType={showType} loading={loading && !data} />
                <MoverColumn items={losers}  isGainer={false} showType={showType} loading={loading && !data} />
              </div>
            </div>

            {/* Disclaimer */}
            {!loading && (
              <p className="mt-3 font-mono text-[8px] text-[var(--text-muted)] opacity-30">
                Stocks: US markets · Crypto: 24h change · Commodities: futures · Data cached 90s
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
