'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { CommodityStripItem } from '@/lib/api/homepage'
import type { CommodityStripResponse } from '@/app/api/commodities-strip/route'
import { timeAgo, stalenessColor } from '@/lib/utils/timeago'

export type { CommodityStripItem }

const REFRESH_MS = 3 * 60_000  // 3 min — server cache is 5 min, Yahoo has intraday data

function pct(n: number) { return (n >= 0 ? '+' : '') + n.toFixed(2) + '%' }

export default function CommodityStrip({
  initialData,
}: {
  initialData?: CommodityStripItem[]
}) {
  const [items,     setItems]     = useState<CommodityStripItem[]>(initialData ?? [])
  const [loading,   setLoading]   = useState(!initialData || initialData.length === 0)
  const [flash,     setFlash]     = useState<Record<string, 'up' | 'down'>>({})
  const [updatedAt, setUpdatedAt] = useState(0)
  const prevPrices = useRef<Record<string, number>>({})

  async function load() {
    try {
      const r = await fetch('/api/commodities-strip')
      const body = await r.json() as CommodityStripResponse
      const d = body.items

      const newFlash: Record<string, 'up' | 'down'> = {}
      for (const item of d) {
        const prev = prevPrices.current[item.symbol]
        if (prev !== undefined && prev !== item.price) {
          newFlash[item.symbol] = item.price > prev ? 'up' : 'down'
        }
        prevPrices.current[item.symbol] = item.price
      }
      if (Object.keys(newFlash).length > 0) {
        setFlash(newFlash)
        setTimeout(() => setFlash({}), 700)
      }

      setItems(d)
      setUpdatedAt(body.updatedAt)
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => {
    if (initialData) {
      for (const item of initialData) prevPrices.current[item.symbol] = item.price
    }
    if (initialData && initialData.length > 0) {
      const id = setInterval(load, REFRESH_MS)
      return () => clearInterval(id)
    }
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className="flex h-10 items-center border-b border-[var(--border)] px-3"
      style={{ background: 'var(--surface)' }}
    >
      <div className="mr-3 shrink-0 flex items-center gap-1.5">
        <span className="font-mono text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          COMMODITIES
        </span>
        {updatedAt > 0 && (
          <span
            className="font-mono text-[7px] tabular-nums"
            style={{ color: stalenessColor(updatedAt) }}
            title={`Last updated: ${new Date(updatedAt).toLocaleTimeString()}`}
            suppressHydrationWarning
          >
            {timeAgo(updatedAt)}
          </span>
        )}
      </div>
      <div className="flex flex-1 items-center gap-0 overflow-x-auto scrollbar-hide">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex shrink-0 items-center gap-2 border-r border-[var(--border)] px-4 h-10">
                <div className="skeleton h-2 w-8 rounded" />
                <div className="skeleton h-2 w-12 rounded" />
              </div>
            ))
          : items.map((item) => {
              const pos      = item.changePercent >= 0
              const chgColor = pos ? 'var(--price-up)' : 'var(--price-down)'
              const flashCls = flash[item.symbol] === 'up'
                ? 'price-flash-up'
                : flash[item.symbol] === 'down'
                  ? 'price-flash-down'
                  : ''
              return (
                <Link
                  key={item.symbol}
                  href={`/asset/commodity/${encodeURIComponent(item.symbol)}`}
                  className="flex shrink-0 items-center gap-1.5 sm:gap-2.5 border-r border-[var(--border)] px-2.5 sm:px-4 py-0 transition-colors duration-150 hover:bg-[var(--surface-2)]"
                >
                  <span className="font-mono text-[10px] font-semibold text-[var(--text)]">
                    {item.shortName}
                  </span>
                  <span className={`inline-block font-mono text-[11px] font-bold tabular-nums text-[var(--text)] ${flashCls}`}>
                    ${item.price.toFixed(2)}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums font-semibold" style={{ color: chgColor }}>
                    {pos ? '▲' : '▼'} {pct(item.changePercent)}
                  </span>
                </Link>
              )
            })}
      </div>
      <span className="shrink-0 font-mono text-[8px] text-[var(--text-muted)] opacity-30 px-2">
        Yahoo · delayed
      </span>
    </div>
  )
}
