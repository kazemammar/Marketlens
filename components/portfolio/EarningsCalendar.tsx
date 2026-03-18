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
      <span className="font-mono font-bold uppercase tracking-[0.14em] text-[var(--text)]" style={{ fontSize: '9px' }}>
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

// ─── Upcoming row ─────────────────────────────────────────────────────────

function UpcomingRow({ event, delay }: { event: EarningsItem; delay: number }) {
  const days = daysUntil(event.date)

  const dateColor = days <= 7
    ? '#f59e0b'
    : days <= 14
    ? 'var(--accent)'
    : 'var(--text-muted)'

  const dateBg = days <= 7
    ? 'rgba(245,158,11,0.12)'
    : days <= 14
    ? 'rgba(16,185,129,0.10)'
    : 'var(--surface-2)'

  const countdownColor = dateColor

  const countdown = days === 0
    ? 'today'
    : days === 1
    ? 'tomorrow'
    : `in ~${days}d`

  return (
    <div
      className="animate-fade-up flex items-center gap-3 px-3 py-2 border-b border-[var(--border)] last:border-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      {/* Date badge + EST */}
      <div className="flex shrink-0 flex-col items-center gap-0.5" style={{ minWidth: '52px' }}>
        <span
          className="rounded-md px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums w-full text-center"
          style={{ background: dateBg, color: dateColor }}
        >
          {fmtDate(event.date)}
        </span>
        <span className="font-mono text-[7px] uppercase tracking-wide opacity-40 text-[var(--text-muted)]">est</span>
      </div>

      {/* Symbol */}
      <Link
        href={`/asset/stock/${encodeURIComponent(event.symbol)}`}
        className="font-mono text-[12px] font-bold shrink-0 hover:underline"
        style={{ color: 'var(--accent)' }}
      >
        {event.symbol}
      </Link>

      {/* Quarter label */}
      <span className="shrink-0 rounded px-1.5 py-px font-mono text-[8px] font-semibold uppercase tracking-wide bg-[var(--surface-2)] text-[var(--text-muted)]">
        Q{event.quarter} {event.year}
      </span>

      <div className="flex-1" />

      {/* Countdown */}
      <span
        className="shrink-0 font-mono text-[10px] font-semibold tabular-nums"
        style={{ color: countdownColor }}
      >
        {countdown}
      </span>
    </div>
  )
}

// ─── Recent row ───────────────────────────────────────────────────────────

function RecentRow({ event, delay }: { event: EarningsItem; delay: number }) {
  const hasBoth     = event.actual != null && event.estimate != null
  const beat        = hasBoth ? (event.actual! > event.estimate!) : null
  const beatColor   = beat === true ? '#22c55e' : beat === false ? '#ef4444' : 'var(--text-muted)'

  return (
    <div
      className="animate-fade-up flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] last:border-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both', opacity: 0.75 }}
    >
      {/* Date */}
      <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)] tabular-nums" style={{ minWidth: '44px' }}>
        {fmtDate(event.date)}
      </span>

      {/* Symbol */}
      <Link
        href={`/asset/stock/${encodeURIComponent(event.symbol)}`}
        className="font-mono text-[11px] font-bold shrink-0 hover:underline"
        style={{ color: 'var(--accent)' }}
      >
        {event.symbol}
      </Link>

      {/* Quarter label */}
      <span className="shrink-0 font-mono text-[8px] text-[var(--text-muted)] opacity-60">
        Q{event.quarter} {event.year}
      </span>

      {/* EPS + beat/miss */}
      {hasBoth && (
        <span className="font-mono text-[10px] font-semibold" style={{ color: beatColor }}>
          {beat ? '▲' : '▼'} {fmtEps(event.actual!)} vs {fmtEps(event.estimate!)} est
          {event.surprisePercent != null && (
            <span className="ml-1 opacity-70">
              ({event.surprisePercent >= 0 ? '+' : ''}{event.surprisePercent.toFixed(1)}%)
            </span>
          )}
        </span>
      )}
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

  const upcoming = data?.upcoming ?? []
  const recent   = data?.recent   ?? []
  const hasAny   = upcoming.length > 0 || recent.length > 0

  return (
    <>
      <PanelHeader upcomingCount={upcoming.length} />

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
            No earnings data for your stock positions
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex min-w-0">

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div className="flex-1 min-w-0">
                {upcoming.map((e, i) => (
                  <UpcomingRow key={`${e.symbol}-${e.date}`} event={e} delay={i * 40} />
                ))}
              </div>
            )}

            {/* Divider */}
            {upcoming.length > 0 && recent.length > 0 && (
              <div className="hidden sm:block w-px bg-[var(--border)] shrink-0" />
            )}

            {/* Recent */}
            {recent.length > 0 && (
              <div className="flex-1 min-w-0">
                <div className="px-3 py-1.5 border-b border-[var(--border)]">
                  <span className="font-mono text-[8px] uppercase tracking-wide text-[var(--text-muted)] opacity-50">Recent</span>
                </div>
                {recent.slice(0, 6).map((e, i) => (
                  <RecentRow key={`${e.symbol}-${e.date}-${i}`} event={e} delay={i * 40} />
                ))}
              </div>
            )}

          </div>

          {/* Disclaimer */}
          <p className="font-mono text-[8px] text-[var(--text-muted)] opacity-40 px-3 py-2">
            Upcoming dates are estimates based on historical reporting patterns
          </p>
        </div>
      )}
    </>
  )
}
