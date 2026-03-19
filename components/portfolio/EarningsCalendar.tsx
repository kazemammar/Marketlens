'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { EarningsPayload, EarningsItem } from '@/app/api/portfolio/earnings/route'

// ─── Helpers ──────────────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(y, m - 1, d)
  )
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [y, m, d] = dateStr.split('-').map(Number)
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86_400_000)
}

function fmtEps(n: number): string {
  return `${n >= 0 ? '' : '−'}$${Math.abs(n).toFixed(2)}`
}

function urgencyConfig(days: number): { color: string; bg: string; borderHex: string } {
  if (days <= 14) return {
    color:     '#f59e0b',
    bg:        'rgba(245,158,11,0.12)',
    borderHex: '#f59e0b',
  }
  if (days <= 30) return {
    color:     'var(--accent)',
    bg:        'rgba(16,185,129,0.10)',
    borderHex: '#10b981',
  }
  return {
    color:     'var(--text-muted)',
    bg:        'var(--surface-2)',
    borderHex: '#6b7280',
  }
}

// ─── Panel header ─────────────────────────────────────────────────────────

function PanelHeader({ upcomingCount }: { upcomingCount: number }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0 text-[var(--text-muted)]" aria-hidden>
        <rect x="1" y="2" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="1" y1="6" x2="15" y2="6" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="5" y1="1" x2="5" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <line x1="11" y1="1" x2="11" y2="4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <circle cx="5.5" cy="10" r="0.8" fill="currentColor"/>
        <circle cx="8" cy="10" r="0.8" fill="currentColor"/>
        <circle cx="10.5" cy="10" r="0.8" fill="currentColor"/>
      </svg>
      <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
        Earnings Calendar
      </span>
      {upcomingCount > 0 && (
        <span
          className="rounded-full px-1.5 py-px font-mono text-[8px] font-bold"
          style={{ background: 'var(--accent)', color: '#000', opacity: 0.9 }}
        >
          {upcomingCount} upcoming
        </span>
      )}
    </div>
  )
}

// ─── Column header ─────────────────────────────────────────────────────────

function ColHeader({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-1.5">
      {icon}
      <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {label}
      </span>
    </div>
  )
}

// ─── Upcoming card ─────────────────────────────────────────────────────────

function UpcomingCard({ event, delay }: { event: EarningsItem; delay: number }) {
  const days  = daysUntil(event.date)
  const cfg   = urgencyConfig(days)

  const countdown = days === 0 ? 'today'
    : days === 1 ? 'tomorrow'
    : `in ~${days}d`

  return (
    <div
      className="animate-fade-up mx-2 mb-2 overflow-hidden rounded cursor-default"
      style={{
        borderLeft:        `2px solid ${cfg.borderHex}90`,
        background:        `linear-gradient(to right, ${cfg.borderHex}08, transparent 70%)`,
        animationDelay:    `${delay}ms`,
        animationFillMode: 'both',
        transition:        'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform   = 'translateY(-1px)'
        el.style.borderColor = cfg.borderHex
        el.style.boxShadow   = `0 2px 8px ${cfg.borderHex}20`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform   = 'translateY(0)'
        el.style.borderColor = `${cfg.borderHex}90`
        el.style.boxShadow   = 'none'
      }}
    >
      {/* Single row */}
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        {/* Date */}
        <span className="shrink-0 font-mono text-[9px] tabular-nums text-[var(--text-muted)]">
          {fmtDate(event.date)}
        </span>

        {/* Symbol */}
        <Link
          href={`/asset/stock/${encodeURIComponent(event.symbol)}`}
          className="font-mono text-[12px] font-bold hover:underline"
          style={{ color: 'var(--accent)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {event.symbol}
        </Link>

        {/* Quarter label */}
        <span className="rounded px-1 py-px font-mono text-[8px] font-semibold bg-[var(--surface-2)] text-[var(--text-muted)]">
          Q{event.quarter} {event.year}
        </span>

        {/* Countdown pill */}
        <span
          className="ml-auto shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums"
          style={{ background: cfg.bg, color: cfg.color }}
        >
          {countdown}
        </span>
      </div>
    </div>
  )
}

// ─── Recent card ───────────────────────────────────────────────────────────

function RecentCard({ event, delay }: { event: EarningsItem; delay: number }) {
  const hasBoth   = event.actual != null && event.estimate != null
  const beat      = event.surprisePercent != null ? event.surprisePercent >= 0 : hasBoth ? (event.actual! >= event.estimate!) : null
  const colorHex  = beat === true ? '#22c55e' : beat === false ? '#ef4444' : '#6b7280'
  const beatBg    = beat === true ? 'rgba(34,197,94,0.12)' : beat === false ? 'rgba(239,68,68,0.12)' : 'var(--surface-2)'

  return (
    <div
      className="animate-fade-up mx-2 mb-2 overflow-hidden rounded cursor-default"
      style={{
        borderLeft:        `2px solid ${colorHex}90`,
        background:        `linear-gradient(to right, ${colorHex}08, transparent 70%)`,
        animationDelay:    `${delay}ms`,
        animationFillMode: 'both',
        transition:        'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform   = 'translateY(-1px)'
        el.style.borderColor = colorHex
        el.style.boxShadow   = `0 2px 8px ${colorHex}20`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform   = 'translateY(0)'
        el.style.borderColor = `${colorHex}90`
        el.style.boxShadow   = 'none'
      }}
    >
      {/* Top row */}
      <div className="flex items-center gap-1.5 px-2 pt-1.5 pb-0.5">
        {/* Date pill */}
        <span className="shrink-0 font-mono text-[9px] tabular-nums text-[var(--text-muted)]">
          {fmtDate(event.date)}
        </span>

        {/* Symbol */}
        <Link
          href={`/asset/stock/${encodeURIComponent(event.symbol)}`}
          className="font-mono text-[12px] font-bold hover:underline"
          style={{ color: 'var(--accent)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {event.symbol}
        </Link>

        {/* Quarter label */}
        <span className="rounded px-1 py-px font-mono text-[8px] font-semibold bg-[var(--surface-2)] text-[var(--text-muted)]">
          Q{event.quarter} {event.year}
        </span>

        {/* Beat/miss badge — prominent */}
        {event.surprisePercent != null && (
          <span
            className="ml-auto shrink-0 rounded px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums"
            style={{
              background: beat ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color:      beat ? '#22c55e' : '#ef4444',
              border:     `1px solid ${beat ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}
          >
            {beat ? '▲ BEAT' : '▼ MISS'} {Math.abs(event.surprisePercent).toFixed(1)}%
          </span>
        )}
      </div>

      {/* EPS detail row */}
      {hasBoth && event.actual != null && event.estimate != null && event.estimate !== 0 && (
        <div className="flex items-center gap-2 px-2 pb-1.5 font-mono text-[9px]">
          <span className="text-[var(--text-muted)]">
            Est: <span className="text-[var(--text)] tabular-nums">${event.estimate.toFixed(2)}</span>
          </span>
          <span className="text-[var(--text-muted)]">
            Act:{' '}
            <span
              className="tabular-nums"
              style={{ color: beat ? '#22c55e' : '#ef4444' }}
            >
              ${event.actual.toFixed(2)}
            </span>
          </span>
        </div>
      )}
      {(!hasBoth || event.estimate === 0) && <div className="pb-1.5" />}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────

export default function EarningsCalendar() {
  const [data,    setData]    = useState<EarningsPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/portfolio/earnings')
      .then((r) => r.ok ? r.json() as Promise<EarningsPayload> : null)
      .then((d) => { if (d) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const upcoming    = data?.upcoming ?? []
  const recent      = data?.recent   ?? []
  const upcoming90  = upcoming.filter((e) => daysUntil(e.date) <= 180)
  const hasAny      = upcoming90.length > 0 || recent.length > 0

  return (
    <>
      <PanelHeader upcomingCount={upcoming90.length} />

      {loading ? (
        <div className="flex items-center gap-3 px-3 py-3">
          {[80, 48, 64, 96].map((w, i) => (
            <div key={i} className="animate-pulse rounded bg-[var(--surface-2)]" style={{ height: '10px', width: `${w}px` }} />
          ))}
        </div>
      ) : !hasAny ? (
        <div className="flex items-center gap-3 px-3 py-3">
          <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4 shrink-0 text-[var(--text-muted)] opacity-30" aria-hidden>
            <rect x="1" y="2" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
            <line x1="1" y1="6" x2="15" y2="6" stroke="currentColor" strokeWidth="1.3"/>
          </svg>
          <p className="font-mono text-[11px] text-[var(--text-muted)]">
            No upcoming earnings — your stocks have already reported this quarter
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_3fr] divide-x divide-[var(--border)] overflow-y-auto scrollbar-hide">

          {/* Upcoming column */}
          <div className="flex flex-col min-w-0">
            <ColHeader
              label="Upcoming"
              icon={
                <svg viewBox="0 0 10 10" fill="none" className="h-2.5 w-2.5 shrink-0" aria-hidden>
                  <circle cx="5" cy="5" r="3.5" stroke="var(--accent)" strokeWidth="1.3"/>
                  <line x1="5" y1="3" x2="5" y2="5.5" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round"/>
                  <circle cx="5" cy="6.2" r="0.5" fill="var(--accent)"/>
                </svg>
              }
            />
            {upcoming90.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-1 px-3 py-4">
                <p className="font-mono text-[10px] text-[var(--text-muted)] opacity-50 text-center">
                  All reported this quarter
                </p>
              </div>
            ) : (
              <div className="pt-1.5">
                {upcoming90.map((e, i) => (
                  <UpcomingCard key={`${e.symbol}-${e.date}`} event={e} delay={i * 50} />
                ))}
              </div>
            )}
          </div>

          {/* Recent column */}
          <div className="flex flex-col min-w-0">
            <ColHeader
              label="Recent"
              icon={
                <svg viewBox="0 0 10 10" fill="none" className="h-2.5 w-2.5 shrink-0" aria-hidden>
                  <polyline points="1,7 4,3 7,5 9,1" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            />
            {recent.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-1 px-3 py-4">
                <p className="font-mono text-[10px] text-[var(--text-muted)] opacity-50 text-center">
                  No recent data
                </p>
              </div>
            ) : (
              <div className="pt-1.5">
                {recent.slice(0, 6).map((e, i) => (
                  <RecentCard key={`${e.symbol}-${e.date}-${i}`} event={e} delay={i * 50} />
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Disclaimer */}
      {hasAny && !loading && (
        <p className="border-t border-[var(--border)] px-3 py-1.5 font-mono text-[8px] text-[var(--text-muted)] opacity-40">
          Upcoming dates are estimates based on historical reporting patterns
        </p>
      )}
    </>
  )
}
