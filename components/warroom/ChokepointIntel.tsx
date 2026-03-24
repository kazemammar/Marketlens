'use client'

import Link from 'next/link'
import { useFetch } from '@/lib/hooks/useFetch'
import type { ChokepointIntelItem, ChokepointIntelPayload, ChokepointStatus } from '@/lib/api/chokepoints'

// ─── Status colours ───────────────────────────────────────────────────────

const STATUS_COLORS: Record<ChokepointStatus, string> = {
  NORMAL:    '#10b981',
  ELEVATED:  '#f59e0b',
  DISRUPTED: '#ef4444',
  BLOCKED:   '#dc2626',
}

const STATUS_BG: Record<ChokepointStatus, string> = {
  NORMAL:    'rgba(16,185,129,0.08)',
  ELEVATED:  'rgba(245,158,11,0.08)',
  DISRUPTED: 'rgba(239,68,68,0.08)',
  BLOCKED:   'rgba(220,38,38,0.10)',
}

const INSURANCE_COLORS: Record<'NORMAL' | 'ELEVATED' | 'HIGH', string> = {
  NORMAL:   'var(--text-muted)',
  ELEVATED: '#f59e0b',
  HIGH:     '#ef4444',
}

const ASSET_TYPE: Record<string, string> = {
  'CL=F': 'commodity', 'BZ=F': 'commodity', 'USO': 'commodity',
  'UNG':  'commodity', 'WEAT': 'commodity', 'GLD': 'commodity',
  'XOM':  'stock',     'CVX':  'stock',
}

function assetHref(sym: string) {
  const type = ASSET_TYPE[sym.toUpperCase()] ?? 'commodity'
  return `/asset/${type}/${encodeURIComponent(sym)}`
}

// ─── Single card ──────────────────────────────────────────────────────────

function ChokepointCard({ data }: { data: ChokepointIntelItem }) {
  const color   = STATUS_COLORS[data.status]
  const isAbove = data.status !== 'NORMAL'

  return (
    <div
      className="flex flex-col gap-1 rounded border bg-[var(--surface)] p-2.5 transition hover:brightness-105"
      style={{
        borderColor: isAbove
          ? data.status === 'ELEVATED'
            ? 'rgba(245,158,11,0.35)'
            : 'rgba(239,68,68,0.4)'
          : 'var(--border)',
        background: isAbove ? STATUS_BG[data.status] : undefined,
      }}
    >
      {/* Name */}
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] leading-tight">
        {data.name}
      </span>

      {/* Status badge */}
      <div className="flex items-center gap-1.5">
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${isAbove ? 'live-dot' : ''}`}
          style={{ background: color }}
        />
        <span className="font-mono text-[10px] font-bold" style={{ color }}>
          {data.status}
        </span>
      </div>

      {/* Oil flow — headline number */}
      <span className="font-mono text-[15px] font-bold leading-none tabular-nums text-[var(--text)]">
        {data.oilFlow}
      </span>

      {/* LNG flow sub-label */}
      <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-60 leading-none -mt-0.5">
        LNG {data.lngFlow}
      </span>

      {/* Risk driver headline */}
      {data.riskDriver && (
        <p className="font-mono text-[8px] leading-tight text-[var(--text-muted)] line-clamp-2 mt-0.5"
           style={{ color: '#f59e0b' }}>
          ⚠ {data.riskDriver}
        </p>
      )}

      {/* Insurance + Assets row */}
      <div className="flex items-center justify-between gap-1 mt-auto pt-1">
        <span
          className="font-mono text-[8px] shrink-0"
          style={{ color: INSURANCE_COLORS[data.insuranceRisk] }}
        >
          Ins: {data.insuranceRisk}{data.insuranceRisk !== 'NORMAL' ? ' ↑' : ''}
        </span>
        <div className="flex flex-wrap gap-0.5 justify-end">
          {data.affectedAssets.slice(0, 3).map(sym => (
            <Link
              key={sym}
              href={assetHref(sym)}
              className="font-mono text-[9px] rounded px-1 py-px bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              {sym}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <div className="skeleton h-3 w-3 rounded" />
        <div className="skeleton h-2.5 w-44 rounded" />
        <div className="flex-1" />
        <div className="skeleton h-2 w-16 rounded" />
      </div>
      <div className="p-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
            <div className="skeleton h-2 w-20 rounded" />
            <div className="skeleton h-2.5 w-14 rounded" />
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-1.5 w-full rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────

export default function ChokepointIntel() {
  const { data, loading } = useFetch<ChokepointIntelPayload>('/api/chokepoints', {
    refreshInterval: 5 * 60_000,
  })

  if (loading) return <Skeleton />

  const chokepoints    = data?.chokepoints    ?? []
  const disruptedCount = data?.disruptedCount ?? 0

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Panel header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        {/* Anchor / chokepoint icon */}
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <circle cx="8" cy="4.5" r="1.5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M8 6v8M5 12.5c1 .8 5 .8 6 0M4 8h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Chokepoint Intelligence
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        {disruptedCount > 0 && (() => {
          const hasBlocked   = chokepoints.some(c => c.status === 'BLOCKED')
          const hasDisrupted = chokepoints.some(c => c.status === 'DISRUPTED')
          const worstLabel   = hasBlocked ? 'BLOCKED' : hasDisrupted ? 'DISRUPTED' : 'ELEVATED'
          const color        = hasBlocked ? 'border-red-600/40 bg-red-600/10 text-red-400'
                             : hasDisrupted ? 'border-red-500/30 bg-red-500/10 text-red-400'
                             : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
          return (
            <span className={`rounded border px-1.5 py-px font-mono text-[8px] font-bold ${color}`}>
              ⚠ {disruptedCount} {worstLabel}
            </span>
          )
        })()}
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-40">5MIN CACHE</span>
      </div>

      {/* Cards grid */}
      <div className="p-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {chokepoints.length === 0 ? (
          <p className="col-span-full py-6 text-center font-mono text-[10px] text-[var(--text-muted)]">
            Chokepoint data unavailable
          </p>
        ) : (
          chokepoints.map(cp => <ChokepointCard key={cp.id} data={cp} />)
        )}
      </div>

      {/* Footer: headline match count summary */}
      {chokepoints.length > 0 && (
        <div className="flex items-center flex-wrap gap-3 px-3 pb-3 -mt-1">
          {chokepoints.map(cp => (
            <div key={cp.id} className="flex items-center gap-1">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${cp.status !== 'NORMAL' ? 'live-dot' : ''}`}
                style={{ background: STATUS_COLORS[cp.status] }}
              />
              <span className="font-mono text-[8px] font-bold" style={{ color: STATUS_COLORS[cp.status] }}>
                {cp.name.toUpperCase()}
              </span>
              {cp.matchedHeadlines > 0 && (
                <span className="font-mono text-[8px] text-[var(--text-muted)]">
                  · {cp.matchedHeadlines} signal{cp.matchedHeadlines !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
