'use client'

import { useEffect, useState } from 'react'
import { TICKER_SECTOR, SECTOR_ORDER } from '@/lib/utils/sectors'

interface StockQuote {
  symbol:        string
  changePercent: number
}

interface SectorData {
  sector:    string
  avgChange: number
  count:     number
}

export default function SectorRotation() {
  const [sectors, setSectors]  = useState<SectorData[]>([])
  const [loading, setLoading]  = useState(true)

  useEffect(() => {
    fetch('/api/market?tab=stock')
      .then((r) => r.json())
      .then((stocks: StockQuote[]) => {
        const sectorMap: Record<string, { sum: number; count: number }> = {}
        for (const s of stocks) {
          const sector = TICKER_SECTOR[s.symbol]
          if (!sector) continue
          if (!sectorMap[sector]) sectorMap[sector] = { sum: 0, count: 0 }
          sectorMap[sector].sum += s.changePercent ?? 0
          sectorMap[sector].count += 1
        }

        const result: SectorData[] = SECTOR_ORDER
          .filter((s) => sectorMap[s])
          .map((s) => ({
            sector:    s,
            avgChange: sectorMap[s].sum / sectorMap[s].count,
            count:     sectorMap[s].count,
          }))
          .sort((a, b) => b.avgChange - a.avgChange)

        setSectors(result)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const maxAbs = Math.max(...sectors.map((s) => Math.abs(s.avgChange)), 1)

  return (
    <div className="rounded border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <path d="M2 14V6l3-4 3 3 3-2 3 5v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Sector Rotation
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
          Avg % change today
        </span>
      </div>

      {/* Bars */}
      <div className="px-3 py-2 space-y-1.5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="skeleton h-3 w-20 rounded" />
              <div className="skeleton h-3 flex-1 rounded" />
            </div>
          ))
        ) : sectors.length === 0 ? (
          <p className="py-3 text-center font-mono text-[10px] text-[var(--text-muted)]">
            No sector data available
          </p>
        ) : (
          sectors.map((s) => {
            const isPos  = s.avgChange >= 0
            const pct    = (Math.abs(s.avgChange) / maxAbs) * 100
            const color  = isPos ? 'var(--price-up)' : 'var(--price-down)'

            return (
              <div key={s.sector} className="flex items-center gap-2">
                <span className="w-[90px] shrink-0 truncate font-mono text-[10px] font-semibold text-[var(--text)]">
                  {s.sector}
                </span>
                <div className="flex-1 h-4 relative overflow-hidden rounded bg-[var(--surface-2)]">
                  <div
                    className="absolute inset-y-0 left-0 rounded transition-all duration-500"
                    style={{
                      width:      `${Math.max(pct, 2)}%`,
                      background: color,
                      opacity:    0.25,
                    }}
                  />
                </div>
                <span
                  className="w-[52px] shrink-0 text-right font-mono text-[10px] font-bold tabular-nums"
                  style={{ color }}
                >
                  {isPos ? '+' : ''}{s.avgChange.toFixed(2)}%
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
