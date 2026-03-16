'use client'

import { useEffect, useState } from 'react'
import type { MaritimeData } from '@/lib/api/maritime'

const REFRESH_MS = 5 * 60 * 1000 // 5 minutes

interface ChipProps {
  label: string
  count: number
  alert?: boolean
}

function Chip({ label, count, alert }: ChipProps) {
  return (
    <div
      className="flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[9px] font-semibold tabular-nums"
      style={{
        borderColor: alert ? 'rgba(239,68,68,0.4)' : 'var(--border)',
        background:  alert ? 'rgba(239,68,68,0.08)' : 'var(--surface-2)',
        color:       alert ? '#fca5a5' : 'var(--text-muted)',
      }}
    >
      <span className="uppercase tracking-[0.1em]">{label}</span>
      <span className="font-mono text-white">{count}</span>
    </div>
  )
}

export default function MaritimePanel() {
  const [data,    setData]    = useState<MaritimeData | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const res  = await fetch('/api/maritime')
      const json = await res.json() as MaritimeData
      setData(json)
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  const cp          = data?.chokepoints
  const babAlert    = (cp?.babelMandeb ?? 5) < 5

  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
            <path d="M8 2v4M4 8H2l2 4h8l2-4h-2M4 8h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 12v2M11 12v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Maritime Traffic
          </span>
        </div>
        {babAlert && (
          <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-px font-mono text-[8px] font-bold text-red-400">
            HOUTHI ALERT
          </span>
        )}
      </div>

      {/* Chokepoint chips */}
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-6 w-24 rounded border border-[var(--border)]" />
          ))
        ) : !cp ? (
          <p className="font-mono text-[9px] text-[var(--text-muted)]">Maritime data unavailable</p>
        ) : (
          <>
            <Chip label="Hormuz"    count={cp.hormuz}      alert={cp.hormuz < 3} />
            <Chip label="Suez"      count={cp.suez}        alert={cp.suez < 3} />
            <Chip label="Malacca"   count={cp.malacca}     alert={cp.malacca < 3} />
            <Chip label="Bab el-Mandeb" count={cp.babelMandeb} alert={cp.babelMandeb < 5} />

            {babAlert && (
              <div className="ml-1 flex items-center gap-1.5 rounded border border-red-500/30 bg-red-500/08 px-2 py-0.5">
                <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="font-mono text-[9px] font-semibold text-red-400">
                  ALERT: Bab el-Mandeb — Houthi threat active
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Ship counts by category if data loaded */}
      {!loading && data && (
        <div className="flex items-center gap-3 border-t border-[var(--border)] px-3 py-1.5">
          {[
            { label: 'Tankers', cat: 'tanker',   color: '#f97316' },
            { label: 'LNG',     cat: 'lng',       color: '#a855f7' },
            { label: 'Cargo',   cat: 'cargo',     color: '#3b82f6' },
          ].map(({ label, cat, color }) => {
            const count = data.ships.filter((s) => s.category === cat).length
            return (
              <div key={cat} className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                <span className="font-mono text-[9px] text-[var(--text-muted)]">{label}</span>
                <span className="font-mono text-[9px] font-semibold text-white">{count}</span>
              </div>
            )
          })}
          <div className="ml-auto font-mono text-[8px] text-[var(--text-muted)] opacity-40">
            {data.ships.length} VESSELS TRACKED
          </div>
        </div>
      )}
    </div>
  )
}
