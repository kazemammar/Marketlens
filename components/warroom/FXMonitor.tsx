'use client'

import { useEffect, useState } from 'react'
import { AssetCardData } from '@/lib/utils/types'

const REFRESH_MS = 30_000

function fmt(price: number, sym: string): string {
  if (sym.includes('JPY') || sym.includes('CNY')) return price.toFixed(2)
  return price.toFixed(4)
}

export default function FXMonitor() {
  const [pairs,   setPairs]   = useState<AssetCardData[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const r = await fetch('/api/market?tab=forex')
      const d = await r.json() as AssetCardData[]
      setPairs(d)
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  const stressed1pct = pairs.filter((p) => Math.abs(p.changePercent) >= 1).length
  const stressed05   = pairs.filter((p) => Math.abs(p.changePercent) >= 0.5 && Math.abs(p.changePercent) < 1).length

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-blue-400" aria-hidden>
            <path d="M2 8h3l2-5 3 10 2-5h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            FX Monitor
          </span>
        </div>
        {!loading && (stressed1pct > 0 || stressed05 > 0) && (
          <span className="rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-px font-mono text-[8px] font-bold text-amber-400">
            {stressed1pct + stressed05} ALERTS
          </span>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-3 border-b border-[var(--border)] px-3 py-1">
        <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /><span className="font-mono text-[8px] text-[var(--text-muted)]">&gt;0.5%</span></div>
        <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /><span className="font-mono text-[8px] text-[var(--text-muted)]">&gt;1% ⚠️</span></div>
      </div>

      {/* Pairs */}
      <div className="flex-1">
        {loading
          ? Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex animate-pulse items-center justify-between border-b border-[var(--border)] px-3 py-2">
                <div className="h-2.5 w-14 rounded bg-[var(--surface-2)]" />
                <div className="h-2.5 w-16 rounded bg-[var(--surface-2)]" />
              </div>
            ))
          : pairs.length === 0
          ? (
              <p className="py-8 text-center font-mono text-[10px] text-[var(--text-muted)]">
                FX data unavailable
              </p>
            )
          : pairs.map((p) => {
              const abs  = Math.abs(p.changePercent)
              const pos  = p.changePercent >= 0
              const crit = abs >= 1
              const warn = abs >= 0.5 && abs < 1
              const textColor = crit
                ? (pos ? 'text-emerald-300' : 'text-red-300')
                : warn
                  ? (pos ? 'text-emerald-400' : 'text-amber-400')
                  : (pos ? 'text-emerald-500' : 'text-red-500')
              return (
                <div
                  key={p.symbol}
                  className={`flex items-center justify-between border-b border-[var(--border)] px-3 py-1.5 transition ${crit ? 'bg-red-500/5' : warn ? 'bg-amber-500/5' : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    {crit  && <span className="font-mono text-[10px]">⚠️</span>}
                    {!crit && <span className={`h-1 w-1 rounded-full ${warn ? 'bg-amber-400' : 'bg-[var(--surface-3)]'}`} />}
                    <span className={`font-mono text-[11px] font-semibold ${crit || warn ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                      {p.symbol}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] tabular-nums text-[var(--text)]">
                      {fmt(p.price, p.symbol)}
                    </span>
                    <span className={`w-14 text-right font-mono text-[10px] font-semibold tabular-nums ${textColor}`}>
                      {p.changePercent >= 0 ? '+' : ''}{p.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )
            })}
      </div>
    </div>
  )
}
