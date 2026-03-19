'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MoverItem {
  symbol:        string
  name:          string
  type:          string
  price:         number
  change:        number
  changePercent: number
}

interface MoversPayload {
  all: { gainers: MoverItem[]; losers: MoverItem[] }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  stock:     'bg-emerald-500/10 text-emerald-400',
  crypto:    'bg-orange-500/10 text-orange-400',
  commodity: 'bg-amber-500/10 text-amber-400',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtPrice(price: number): string {
  if (price < 1)    return `$${price.toFixed(4)}`
  if (price > 9999) return `$${(price / 1000).toFixed(1)}K`
  if (price > 999)  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  return `$${price.toFixed(2)}`
}

function assetHref(type: string, symbol: string): string {
  const t = type === 'stock' ? 'stock' : type === 'crypto' ? 'crypto' : 'commodity'
  return `/asset/${t}/${encodeURIComponent(symbol)}`
}

// ─── Skeleton row ────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2 last:border-0">
      <div className="h-2.5 w-3 animate-pulse rounded bg-[var(--surface-2)]" />
      <div className="h-2.5 w-10 animate-pulse rounded bg-[var(--surface-2)]" />
      <div className="h-2 w-8 animate-pulse rounded bg-[var(--surface-2)]" />
      <div className="h-2 flex-1 animate-pulse rounded bg-[var(--surface-2)]" />
      <div className="h-2.5 w-12 animate-pulse rounded bg-[var(--surface-2)]" />
      <div className="h-2.5 w-14 animate-pulse rounded bg-[var(--surface-2)]" />
    </div>
  )
}

// ─── Mover row ───────────────────────────────────────────────────────────────

function MoverRow({ item, rank, isGainer, delay }: {
  item:     MoverItem
  rank:     number
  isGainer: boolean
  delay:    number
}) {
  const colorHex = isGainer ? '#22c55e' : '#ef4444'

  return (
    <Link
      href={assetHref(item.type, item.symbol)}
      className="animate-fade-up flex items-center gap-2 border-b border-[var(--border)] px-3 py-2 last:border-0 transition-colors hover:bg-[var(--surface-2)]"
      style={{
        borderLeft:        `2px solid ${colorHex}50`,
        animationDelay:    `${delay}ms`,
        animationFillMode: 'both',
      }}
    >
      {/* Rank */}
      <span className="w-3.5 shrink-0 text-right font-mono text-[10px] tabular-nums text-[var(--text-muted)] opacity-40">
        {rank}
      </span>

      {/* Symbol */}
      <span
        className="shrink-0 font-mono text-[12px] font-bold"
        style={{ color: 'var(--accent)' }}
      >
        {item.symbol}
      </span>

      {/* Type pill */}
      <span className={`shrink-0 rounded px-1 py-px font-mono text-[7px] font-bold uppercase tracking-wide ${TYPE_COLORS[item.type] ?? 'bg-zinc-800 text-zinc-400'}`}>
        {item.type}
      </span>

      {/* Name */}
      <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[var(--text-muted)] opacity-60">
        {item.name}
      </span>

      {/* Price */}
      <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--text)]">
        {fmtPrice(item.price)}
      </span>

      {/* Change % pill */}
      <span
        className="shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[12px] font-bold tabular-nums"
        style={{
          color:      colorHex,
          background: `${colorHex}15`,
          textShadow: `0 0 8px ${colorHex}40`,
        }}
      >
        {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
      </span>
    </Link>
  )
}

// ─── Panel ───────────────────────────────────────────────────────────────────

function MoverPanel({ items, isGainer, loading }: {
  items:    MoverItem[]
  isGainer: boolean
  loading:  boolean
}) {
  const colorHex = isGainer ? '#22c55e' : '#ef4444'
  const label    = isGainer ? '▲ Top Gainers' : '▼ Top Losers'

  return (
    <div className="flex flex-col min-w-0">
      {/* Panel sub-header */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-1.5">
        <span
          className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em]"
          style={{ color: colorHex }}
        >
          {label}
        </span>
        <div className="flex-1" />
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">today</span>
      </div>

      {/* Rows */}
      <div className="overflow-y-auto scrollbar-hide">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center px-3 py-6">
            <p className="font-mono text-[10px] text-[var(--text-muted)] opacity-40">No data</p>
          </div>
        ) : (
          items.map((item, i) => (
            <MoverRow
              key={`${item.type}-${item.symbol}`}
              item={item}
              rank={i + 1}
              isGainer={isGainer}
              delay={i * 30}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MoversStrip() {
  const [data,    setData]    = useState<MoversPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchingRef           = useRef(false)
  const fetchedAt             = useRef(0)

  async function load() {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const res = await fetch('/api/movers')
      if (res.ok) {
        setData(await res.json() as MoversPayload)
        fetchedAt.current = Date.now()
      }
    } catch { /* silent */ }
    setLoading(false)
    fetchingRef.current = false
  }

  useEffect(() => {
    load()
    const id = setInterval(() => { if (!document.hidden) load() }, 90_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const gainers = data?.all.gainers.slice(0, 10) ?? []
  const losers  = data?.all.losers.slice(0, 10)  ?? []

  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface)]">

      {/* Section header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 sm:px-4">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
            <polyline points="1,12 5,7 8,9 11,4 15,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
            Top Movers
          </span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-[var(--border)] to-transparent" />
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1">
            <span className="live-dot h-1 w-1 rounded-full" style={{ background: 'var(--accent)' }} />
            <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">LIVE</span>
          </div>
          {fetchedAt.current > 0 && (
            <span className="hidden sm:block font-mono text-[8px] tabular-nums text-[var(--text-muted)] opacity-50" suppressHydrationWarning>
              Updated {new Date(fetchedAt.current).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Link
            href="/movers"
            className="font-mono text-[9px] text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
          >
            View All <span style={{ color: 'var(--accent)' }}>→</span>
          </Link>
        </div>
      </div>

      {/* Two-panel grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)] sm:h-[220px]">
        <MoverPanel items={gainers} isGainer={true}  loading={loading && !data} />
        <MoverPanel items={losers}  isGainer={false} loading={loading && !data} />
      </div>

    </div>
  )
}
