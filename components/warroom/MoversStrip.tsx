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
  if (price < 1)   return `$${price.toFixed(4)}`
  if (price > 999) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `$${price.toFixed(2)}`
}

function assetHref(type: string, symbol: string): string {
  const t = type === 'stock' ? 'stock' : type === 'crypto' ? 'crypto' : 'commodity'
  return `/asset/${t}/${encodeURIComponent(symbol)}`
}

// ─── Pill ───────────────────────────────────────────────────────────────────

function MoverPill({ item, isGainer }: { item: MoverItem; isGainer: boolean }) {
  const colorHex = isGainer ? '#22c55e' : '#ef4444'
  const arrow    = isGainer ? '▲' : '▼'

  return (
    <Link
      href={assetHref(item.type, item.symbol)}
      className="flex shrink-0 flex-col justify-center border-r border-[var(--border)] px-3 py-0 transition-colors duration-150 hover:bg-[var(--surface-2)]"
      style={{
        minWidth:   '100px',
        height:     '40px',
        background: `${colorHex}08`,
        borderLeft: `2px solid ${colorHex}50`,
      }}
    >
      {/* Top: arrow + symbol + change% */}
      <div className="flex items-center gap-1">
        <span className="font-mono text-[8px]" style={{ color: colorHex }}>{arrow}</span>
        <span className="font-mono text-[10px] font-bold text-[var(--accent)]">{item.symbol}</span>
        <span
          className="ml-auto font-mono text-[9px] font-semibold tabular-nums"
          style={{ color: colorHex }}
        >
          {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
        </span>
      </div>
      {/* Bottom: price */}
      <div className="font-mono text-[8px] tabular-nums text-[var(--text-muted)] opacity-60">
        {fmtPrice(item.price)}
      </div>
    </Link>
  )
}

// ─── Skeleton pill ───────────────────────────────────────────────────────────

function SkeletonPill() {
  return (
    <div className="flex shrink-0 flex-col justify-center gap-1 border-r border-[var(--border)] px-3" style={{ minWidth: '90px', height: '40px' }}>
      <div className="h-2 w-14 animate-pulse rounded bg-[var(--surface-2)]" />
      <div className="h-1.5 w-10 animate-pulse rounded bg-[var(--surface-2)]" />
    </div>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

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

  const gainers = data?.all.gainers.slice(0, 5) ?? []
  const losers  = data?.all.losers.slice(0, 5)  ?? []

  return (
    <div
      className="flex h-10 items-stretch border-b border-[var(--border)]"
      style={{ background: 'var(--surface)' }}
    >
      {/* Left label */}
      <div className="flex shrink-0 items-center gap-2 border-r border-[var(--border)] px-3">
        <svg viewBox="0 0 14 14" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <polyline points="1,10 4,6 7,8 10,3 13,1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] hidden sm:block">
          Top Movers
        </span>
        <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
      </div>

      {/* Scrollable pills */}
      <div className="flex flex-1 items-stretch overflow-x-auto scrollbar-hide">
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => <SkeletonPill key={i} />)
        ) : (
          <>
            {gainers.map((item) => (
              <MoverPill key={`g-${item.symbol}`} item={item} isGainer={true} />
            ))}

            {/* Divider between gainers and losers */}
            {gainers.length > 0 && losers.length > 0 && (
              <div className="flex shrink-0 items-center border-r border-[var(--border)] px-2">
                <div className="h-4 w-px bg-[var(--border)]" />
              </div>
            )}

            {losers.map((item) => (
              <MoverPill key={`l-${item.symbol}`} item={item} isGainer={false} />
            ))}
          </>
        )}
      </div>

      {/* Right: View All link */}
      <Link
        href="/movers"
        className="flex shrink-0 items-center gap-1 border-l border-[var(--border)] px-3 font-mono text-[9px] text-[var(--text-muted)] transition-colors hover:text-[var(--accent)] whitespace-nowrap"
      >
        <span className="hidden sm:inline">View All</span>
        <span style={{ color: 'var(--accent)' }}>→</span>
      </Link>
    </div>
  )
}
