'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CommodityStripItem } from '@/app/api/commodities-strip/route'

function fmt(n: number) {
  return n.toFixed(2)
}

function pct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

export default function OilGasTracker() {
  const [items,   setItems]   = useState<CommodityStripItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/commodities-strip')
      .then((r) => r.json())
      .then((d: CommodityStripItem[]) => { setItems(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" style={{ color: 'var(--warning)' }} aria-hidden>
          <path d="M8 2C5.5 2 4 4 4 6c0 2.5 2 4 4 7 2-3 4-4.5 4-7 0-2-1.5-4-4-4z" fill="currentColor" opacity=".6"/>
          <path d="M8 5v4M6.5 7.5L8 9l1.5-1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Energy &amp; Metals
        </span>
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-3 divide-x divide-[var(--border)] sm:grid-cols-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse px-3 py-2.5">
                <div className="mb-1 h-2.5 w-10 rounded bg-[var(--surface-2)]" />
                <div className="mb-1 h-3.5 w-14 rounded bg-[var(--surface-2)]" />
                <div className="h-2.5 w-8 rounded bg-[var(--surface-2)]" />
              </div>
            ))
          : items.map((item) => {
              const positive = item.changePercent >= 0
              const chgStyle = { color: positive ? 'var(--price-up)' : 'var(--price-down)' }
              return (
                <Link
                  key={item.symbol}
                  href={`/asset/commodity/${item.symbol}`}
                  className="group flex flex-col px-3 py-2.5 transition hover:bg-[var(--surface-2)]"
                >
                  <span className="mb-0.5 font-mono text-[10px] text-[var(--text-muted)] group-hover:text-[var(--text)]">
                    {item.shortName}
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums text-[var(--text)]">
                    ${fmt(item.price)}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums" style={chgStyle}>
                    {pct(item.changePercent)}
                  </span>
                </Link>
              )
            })}
      </div>
    </div>
  )
}
