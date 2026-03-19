'use client'

import { useEffect, useState } from 'react'
import { AssetCardData } from '@/lib/utils/types'

interface PairItem {
  symbol:        string
  price:         number
  changePercent: number
}

function fmt(price: number, symbol: string): string {
  const digits = symbol.includes('JPY') || symbol.includes('CNY') ? 2 : 4
  return price.toFixed(digits)
}

export default function CurrencyStressMonitor() {
  const [pairs,   setPairs]   = useState<PairItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/market?tab=forex')
      .then((r) => r.json())
      .then((d: AssetCardData[]) => {
        setPairs(d.map((a) => ({
          symbol:        a.symbol,
          price:         a.price,
          changePercent: a.changePercent,
        })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const stressed = pairs.filter((p) => Math.abs(p.changePercent) >= 1)

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" style={{ color: 'var(--accent)' }} aria-hidden>
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 4v4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
            FX Stress
          </span>
        </div>
        {stressed.length > 0 && !loading && (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-400">
            {stressed.length} STRESSED
          </span>
        )}
      </div>

      {/* Pairs */}
      <div className="divide-y divide-[var(--border)]">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center justify-between px-3 py-2">
                <div className="h-3 w-14 rounded bg-[var(--surface-2)]" />
                <div className="h-3 w-12 rounded bg-[var(--surface-2)]" />
              </div>
            ))
          : pairs.map((p) => {
              const positive  = p.changePercent >= 0
              const stressed  = Math.abs(p.changePercent) >= 1
              const chgColor  = stressed
                ? (positive ? 'font-bold' : 'font-bold')
                : ''
              const chgStyle  = { color: positive ? 'var(--price-up)' : 'var(--price-down)' }
              return (
                <div
                  key={p.symbol}
                  className={`flex items-center justify-between px-3 py-1.5 transition hover:bg-[var(--surface-2)] ${
                    stressed ? 'bg-amber-500/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {stressed && (
                      <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: positive ? 'var(--price-up)' : 'var(--price-down)' }} />
                    )}
                    <span className={`font-mono text-[11px] ${stressed ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                      {p.symbol}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] tabular-nums text-[var(--text)]">
                      {fmt(p.price, p.symbol)}
                    </span>
                    <span className={`font-mono text-[10px] tabular-nums ${chgColor}`} style={chgStyle}>
                      {p.changePercent >= 0 ? '+' : ''}{p.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )
            })}

        {!loading && pairs.length === 0 && (
          <p className="px-3 py-4 text-center font-mono text-[11px] text-[var(--text-muted)]">
            No FX data
          </p>
        )}
      </div>

      {/* Footer legend */}
      {!loading && (
        <div className="border-t border-[var(--border)] px-3 py-1.5">
          <span className="font-mono text-[9px] text-[var(--text-muted)]">
            ● STRESSED = daily move &gt;1%
          </span>
        </div>
      )}
    </div>
  )
}
