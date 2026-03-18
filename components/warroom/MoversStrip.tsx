'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function heatBg(changePercent: number, isGainer: boolean): string {
  const abs = Math.abs(changePercent)
  if (isGainer) {
    if (abs >= 5) return 'rgba(16,185,129,0.55)'
    if (abs >= 3) return 'rgba(16,185,129,0.40)'
    if (abs >= 1) return 'rgba(16,185,129,0.25)'
    return             'rgba(16,185,129,0.15)'
  } else {
    if (abs >= 5) return 'rgba(239,68,68,0.55)'
    if (abs >= 3) return 'rgba(239,68,68,0.40)'
    if (abs >= 1) return 'rgba(239,68,68,0.25)'
    return             'rgba(239,68,68,0.15)'
  }
}

function heatBorder(changePercent: number, isGainer: boolean): string {
  const abs = Math.abs(changePercent)
  const alpha = abs >= 5 ? '0.50' : abs >= 3 ? '0.40' : abs >= 1 ? '0.30' : '0.20'
  return isGainer
    ? `1px solid rgba(16,185,129,${alpha})`
    : `1px solid rgba(239,68,68,${alpha})`
}

// ─── Tile ────────────────────────────────────────────────────────────────────

function HeatTile({ item, isGainer, delay }: { item: MoverItem; isGainer: boolean; delay: number }) {
  const arrow = isGainer ? '▲' : '▼'
  const pctStr = `${item.changePercent >= 0 ? '+' : ''}${item.changePercent.toFixed(2)}%`
  // Shorten symbol if long
  const sym = item.symbol.length > 6 ? item.symbol.slice(0, 6) : item.symbol

  return (
    <Link
      href={assetHref(item.type, item.symbol)}
      title={`${item.symbol} — ${item.name}: ${pctStr}`}
      className="animate-fade-up flex shrink-0 flex-col justify-center gap-0.5 rounded-md px-2.5 py-1.5 transition-all duration-150 hover:scale-105 hover:brightness-110"
      style={{
        minWidth:          '88px',
        maxWidth:          '110px',
        height:            '50px',
        background:        heatBg(item.changePercent, isGainer),
        border:            heatBorder(item.changePercent, isGainer),
        animationDelay:    `${delay}ms`,
        animationFillMode: 'both',
      }}
    >
      {/* Symbol + arrow */}
      <div className="flex items-center gap-1 leading-none">
        <span className="font-mono text-[8px] opacity-80" style={{ color: isGainer ? '#6ee7b7' : '#fca5a5' }}>
          {arrow}
        </span>
        <span className="font-mono text-[11px] font-bold leading-none text-[var(--text)]">
          {sym}
        </span>
      </div>
      {/* Change % */}
      <span className="font-mono text-[11px] font-bold tabular-nums leading-none text-white">
        {pctStr}
      </span>
      {/* Price */}
      <span className="font-mono text-[8px] tabular-nums leading-none" style={{ color: 'rgba(255,255,255,0.55)' }}>
        {fmtPrice(item.price)}
      </span>
    </Link>
  )
}

// ─── Skeleton tile ────────────────────────────────────────────────────────────

function SkeletonTile() {
  return (
    <div
      className="flex shrink-0 flex-col justify-center gap-1 rounded-md px-2.5 py-1.5"
      style={{ minWidth: '88px', height: '50px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}
    >
      <div className="h-2 w-10 animate-pulse rounded bg-[var(--border)]" />
      <div className="h-2.5 w-14 animate-pulse rounded bg-[var(--border)]" />
      <div className="h-1.5 w-8 animate-pulse rounded bg-[var(--border)]" />
    </div>
  )
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function MoverRow({ items, isGainer, loading }: { items: MoverItem[]; isGainer: boolean; loading: boolean }) {
  const colorHex = isGainer ? '#10b981' : '#ef4444'
  const label    = isGainer ? '▲ Gainers' : '▼ Losers'

  return (
    <div className="flex items-center gap-2 px-3 py-1">
      {/* Fixed row label */}
      <span
        className="shrink-0 font-mono text-[8px] font-bold uppercase tracking-wide"
        style={{ color: colorHex, width: '46px', textShadow: `0 0 8px ${colorHex}50` }}
      >
        {label}
      </span>

      {/* Scrollable tiles with fade */}
      <div className="relative flex-1 overflow-hidden">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonTile key={i} />)
            : items.map((item, i) => (
                <HeatTile key={`${item.type}-${item.symbol}`} item={item} isGainer={isGainer} delay={i * 25} />
              ))
          }
        </div>
        {/* Right fade */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-12"
          style={{ background: 'linear-gradient(to left, var(--surface), transparent)' }}
        />
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MoversStrip() {
  const [data,    setData]    = useState<MoversPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchingRef           = useRef(false)

  async function load() {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const res = await fetch('/api/movers')
      if (res.ok) setData(await res.json() as MoversPayload)
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
    <div className="border-b border-[var(--border)]" style={{ background: 'var(--surface)' }}>

      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <polyline points="1,12 5,7 8,9 11,4 15,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="1,15 5,10 8,12 11,7 15,5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
        </svg>
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Top Movers
        </span>
        <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
        <div className="ml-auto">
          <Link
            href="/movers"
            className="font-mono text-[9px] text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
          >
            View All <span style={{ color: 'var(--accent)' }}>→</span>
          </Link>
        </div>
      </div>

      {/* Rows */}
      <MoverRow items={gainers} isGainer={true}  loading={loading && !data} />
      <MoverRow items={losers}  isGainer={false} loading={loading && !data} />

    </div>
  )
}
