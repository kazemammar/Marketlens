'use client'

import { useFetch }                    from '@/lib/hooks/useFetch'
import type { EiaSeries }              from '@/lib/api/eia'
import type { EnergyPayload }          from '@/app/api/energy/route'

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatValue(s: EiaSeries): string {
  if (s.latest == null) return '—'
  if (s.unit === '$/bbl')  return s.latest.toFixed(2)
  // Mbbl/d and Mbbl both show one decimal
  return s.latest.toFixed(1)
}

function formatChange(s: EiaSeries): string {
  if (s.change == null) return '—'
  const abs = Math.abs(s.change)
  if (s.unit === '$/bbl')  return abs.toFixed(2)
  if (s.unit === 'Mbbl/d') return abs.toFixed(3)   // production: 0.010 not 0.0
  return abs.toFixed(1)
}

function formatDate(period: string | undefined): string {
  if (!period) return ''
  // period is "YYYY-MM-DD" — show "Mar 26" style
  const d = new Date(period + 'T12:00:00Z')  // noon UTC avoids DST edge cases
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

function isInventory(id: string): boolean {
  return id === 'us_crude_stocks' || id === 'us_gasoline_stocks'
}

// Energy semantics: for supply-side data higher = bearish (amber), lower = bullish (green)
// For prices: standard (higher = green, lower = red)
function getChangeColor(id: string, change: number | null): string {
  if (change == null || change === 0) return 'var(--price-flat)'
  const isUp = change > 0
  if (id === 'wti_price' || id === 'brent_price') {
    return isUp ? 'var(--price-up)' : 'var(--price-down)'
  }
  // production / inventory: more supply = bearish amber, less supply = bullish green
  return isUp ? '#f59e0b' : 'var(--price-up)'
}

// ─── Arrow icons ──────────────────────────────────────────────────────────

function ArrowUp() {
  return (
    <svg viewBox="0 0 10 10" fill="none" className="inline h-2 w-2 shrink-0" aria-hidden>
      <path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ArrowDown() {
  return (
    <svg viewBox="0 0 10 10" fill="none" className="inline h-2 w-2 shrink-0" aria-hidden>
      <path d="M5 2v6M2 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────

function EnergyCard({ series: s }: { series: EiaSeries }) {
  const changeColor = getChangeColor(s.id, s.change)
  const isUp        = (s.change ?? 0) > 0
  const inv         = isInventory(s.id)

  return (
    <div
      className="flex flex-col gap-1 rounded border bg-[var(--surface)] p-2.5 transition hover:border-[var(--accent)]/30"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Label */}
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {s.name}
      </span>

      {/* Value */}
      <div className="flex items-baseline gap-1">
        {s.unit === '$/bbl' && (
          <span className="font-mono text-[11px] text-[var(--text-muted)]">$</span>
        )}
        <span className="font-mono text-[18px] font-bold leading-none tabular-nums text-[var(--text)]">
          {formatValue(s)}
        </span>
        {s.unit !== '$/bbl' && (
          <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-60">
            {s.unit}
          </span>
        )}
      </div>

      {/* Change row */}
      <div className="flex items-center justify-between gap-1">
        {s.change != null ? (
          s.change === 0 ? (
            <span className="font-mono text-[9px] text-[var(--price-flat)]">UNCH</span>
          ) : (
            <span
              className="flex items-center gap-0.5 font-mono text-[9px] font-semibold tabular-nums"
              style={{ color: changeColor }}
            >
              {isUp ? <ArrowUp /> : <ArrowDown />}
              {isUp ? '+' : '-'}{formatChange(s)}
            </span>
          )
        ) : (
          <span className="font-mono text-[9px] text-[var(--price-flat)]">—</span>
        )}
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
          {formatDate(s.data[0]?.period)}
        </span>
      </div>

      {/* BUILD / DRAW badge for inventory series */}
      {inv && s.change != null && s.change !== 0 && (
        <span
          className="font-mono text-[8px] font-bold"
          style={{ color: isUp ? '#f59e0b' : 'var(--price-up)' }}
        >
          {isUp ? 'BUILD ▲' : 'DRAW ▼'}
        </span>
      )}
    </div>
  )
}

// ─── Skeleton card ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <div className="skeleton h-2 w-20 rounded" />
      <div className="skeleton h-5 w-16 rounded" />
      <div className="skeleton h-2 w-12 rounded" />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────

export default function OilEnergyPanel() {
  const { data, loading } = useFetch<EnergyPayload>('/api/energy', {
    refreshInterval: 30 * 60_000,  // 30 min — EIA only publishes weekly
  })
  const series = data?.series ?? []

  return (
    <div className="overflow-hidden rounded border border-[var(--border)]">
      {/* Panel header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
        {/* Oil barrel icon */}
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: '#f97316' }} aria-hidden>
          <rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/>
          <line x1="3" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="3" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="1.2"/>
          <line x1="6.5" y1="3" x2="6.5" y2="13" stroke="currentColor" strokeWidth="1"/>
          <line x1="9.5" y1="3" x2="9.5" y2="13" stroke="currentColor" strokeWidth="1"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Oil &amp; Energy
        </span>
        <span className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-px font-mono text-[8px] text-[var(--text-muted)]">
          🇺🇸 EIA Weekly
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-40">EIA · 6H CACHE</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-3 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : series.length === 0
            ? (
                <p className="col-span-full py-6 text-center font-mono text-[10px] text-[var(--text-muted)]">
                  Energy data unavailable — add EIA_API_KEY to enable
                </p>
              )
            : series.map(s => <EnergyCard key={s.id} series={s} />)
        }
      </div>
    </div>
  )
}
