'use client'

import type { MaritimeData } from '@/lib/api/maritime'
import { useFetch } from '@/lib/hooks/useFetch'

export default function MaritimePanel() {
  const { data, loading } = useFetch<MaritimeData>('/api/maritime', { refreshInterval: 5 * 60_000 })

  const cp       = data?.chokepoints
  const babAlert = (cp?.babelMandeb ?? 5) < 5

  const chokepoints = [
    { label: 'Strait of Hormuz', key: 'hormuz'      as const, alert: (cp?.hormuz     ?? 0) < 3 },
    { label: 'Suez Canal',       key: 'suez'        as const, alert: (cp?.suez       ?? 0) < 3 },
    { label: 'Malacca Strait',   key: 'malacca'     as const, alert: (cp?.malacca    ?? 0) < 3 },
    { label: 'Bab el-Mandeb',    key: 'babelMandeb' as const, alert: babAlert },
  ]

  const shipCategories = [
    { label: 'Tankers', cat: 'tanker', color: '#f97316' },
    { label: 'LNG',     cat: 'lng',    color: '#a855f7' },
    { label: 'Cargo',   cat: 'cargo',  color: '#3b82f6' },
  ]

  return (
    <div className="px-3 py-2 sm:px-4">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <path d="M8 2v4M4 8H2l2 4h8l2-4h-2M4 8h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 12v2M11 12v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Maritime Traffic
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        {babAlert && (
          <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-px font-mono text-[8px] font-bold text-red-400">
            HOUTHI ALERT
          </span>
        )}
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-40">5MIN CACHE</span>
      </div>

      {/* Chokepoint cards */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
                <div className="skeleton h-2 w-20 rounded" />
                <div className="skeleton h-5 w-10 rounded" />
                <div className="skeleton h-1 w-full rounded-full" />
              </div>
            ))
          : !cp
            ? (
                <p className="col-span-full py-6 text-center font-mono text-[10px] text-[var(--text-muted)]">
                  Maritime data unavailable
                </p>
              )
            : chokepoints.map(({ label, key, alert }) => {
                const count    = cp?.[key] ?? 0
                const pct      = Math.min((count / 15) * 100, 100)
                const barColor = alert ? 'var(--price-down)' : 'var(--accent)'
                return (
                  <div
                    key={key}
                    className="flex flex-col gap-1 rounded border bg-[var(--surface)] p-2.5 transition hover:border-[var(--accent)]/30"
                    style={{ borderColor: alert ? 'rgba(239,68,68,0.4)' : 'var(--border)' }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                        {label}
                      </span>
                      {alert && (
                        <span className="shrink-0 rounded border border-red-500/40 bg-red-500/10 px-1 py-px font-mono text-[8px] font-bold text-red-400">
                          LOW
                        </span>
                      )}
                    </div>
                    <div className="flex items-end gap-1.5">
                      <span className="font-mono text-[18px] font-bold leading-none tabular-nums text-[var(--text)]">
                        {count}
                      </span>
                      <span className="mb-0.5 font-mono text-[8px] text-[var(--text-muted)]">vessels</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: barColor, opacity: 0.8 }}
                      />
                    </div>
                  </div>
                )
              })
        }
      </div>

      {/* Ship category footer */}
      {!loading && data && (
        <div className="mt-1.5 flex items-center gap-3">
          {shipCategories.map(({ label, cat, color }) => {
            const count = data.ships.filter((s) => s.category === cat).length
            return (
              <div key={cat} className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                <span className="font-mono text-[9px] text-[var(--text-muted)]">{label}</span>
                <span className="font-mono text-[9px] font-semibold text-[var(--text)]">{count}</span>
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
