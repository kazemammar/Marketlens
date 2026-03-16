'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CommodityStripItem } from '@/lib/api/homepage'

export type { CommodityStripItem }

const REFRESH_MS = 60_000   // refresh every 60 s (was 30 s — halved to reduce load)

function pct(n: number) { return (n >= 0 ? '+' : '') + n.toFixed(2) + '%' }

export default function CommodityStrip({
  initialData,
}: {
  initialData?: CommodityStripItem[]
}) {
  const [items,   setItems]   = useState<CommodityStripItem[]>(initialData ?? [])
  const [loading, setLoading] = useState(!initialData || initialData.length === 0)

  async function load() {
    try {
      const r = await fetch('/api/commodities-strip')
      const d = await r.json() as CommodityStripItem[]
      setItems(d)
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => {
    // If we got server-side data, skip the immediate fetch — schedule refresh only
    if (initialData && initialData.length > 0) {
      const id = setInterval(load, REFRESH_MS)
      return () => clearInterval(id)
    }
    // No server-side data — fetch immediately then refresh
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex h-10 items-center border-b border-[var(--border)] bg-[var(--surface-2)] px-3">
      {/* Label */}
      <span className="mr-3 shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)]">
        COMMODITIES
      </span>

      {/* Scrollable items */}
      <div className="flex flex-1 items-center gap-0 overflow-x-auto">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex shrink-0 animate-pulse items-center gap-2 border-r border-[var(--border)] px-4">
                <div className="h-2 w-8 rounded bg-[var(--surface-3)]" />
                <div className="h-2 w-12 rounded bg-[var(--surface-3)]" />
              </div>
            ))
          : items.map((item) => {
              const pos = item.changePercent >= 0
              const chgColor = pos ? 'text-emerald-400' : 'text-red-400'
              return (
                <Link
                  key={item.symbol}
                  href={`/asset/commodity/${item.symbol}`}
                  className="flex shrink-0 items-center gap-2.5 border-r border-[var(--border)] px-4 py-0 transition hover:bg-[var(--surface-3)]"
                >
                  <span className="font-mono text-[10px] font-semibold text-[var(--text-muted)]">
                    {item.shortName}
                  </span>
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-[var(--text)]">
                    ${item.price.toFixed(2)}
                  </span>
                  <span className={`font-mono text-[10px] tabular-nums ${chgColor}`}>
                    {pct(item.changePercent)}
                  </span>
                </Link>
              )
            })}
      </div>
    </div>
  )
}
