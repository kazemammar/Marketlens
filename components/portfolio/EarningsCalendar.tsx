'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { EarningsPayload } from '@/app/api/portfolio/earnings/route'
import type { EarningsEvent }   from '@/lib/api/fmp'

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
  const target = new Date(y, m - 1, d)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

function countdownLabel(days: number): string {
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days}d`
}

function fmtRevenue(n: number): string {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toFixed(0)}`
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

function UpcomingRow({ event, delay }: { event: EarningsEvent; delay: number }) {
  const days = daysUntil(event.date)

  const dateBg = days <= 2
    ? 'rgba(239,68,68,0.15)'
    : days <= 6
    ? 'rgba(245,158,11,0.15)'
    : 'var(--surface-2)'

  const dateColor = days <= 2
    ? '#ef4444'
    : days <= 6
    ? '#f59e0b'
    : 'var(--text-muted)'

  const countdownColor = days <= 2 ? '#ef4444' : days <= 6 ? '#f59e0b' : 'var(--text-muted)'

  const timeLabel = event.time === 'bmo' ? 'BMO' : event.time === 'amc' ? 'AMC' : null

  return (
    <div
      className="animate-fade-up flex items-center gap-3 px-3 py-2 border-b border-[var(--border)] last:border-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      {/* Date badge */}
      <span
        className="shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums"
        style={{ background: dateBg, color: dateColor, minWidth: '52px', textAlign: 'center' }}
      >
        {fmtDate(event.date)}
      </span>

      {/* Symbol */}
      <Link
        href={`/asset/stock/${encodeURIComponent(event.symbol)}`}
        className="font-mono text-[12px] font-bold shrink-0 hover:underline"
        style={{ color: 'var(--accent)' }}
      >
        {event.symbol}
      </Link>

      {/* Time badge */}
      {timeLabel && (
        <span className="shrink-0 rounded px-1.5 py-px font-mono text-[8px] font-semibold uppercase tracking-wide bg-[var(--surface-2)] text-[var(--text-muted)]">
          {timeLabel}
        </span>
      )}

      {/* Est. EPS */}
      {event.epsEstimated != null && (
        <span className="font-mono text-[10px] text-[var(--text-muted)] opacity-60">
          Est. EPS: {fmtEps(event.epsEstimated)}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Countdown */}
      <span
        className="shrink-0 font-mono text-[10px] font-semibold tabular-nums"
        style={{ color: countdownColor }}
      >
        {countdownLabel(days)}
      </span>
    </div>
  )
}

// ─── Recent row ───────────────────────────────────────────────────────────

function RecentRow({ event, delay }: { event: EarningsEvent; delay: number }) {
  const hasBoth    = event.eps != null && event.epsEstimated != null
  const beat       = hasBoth ? (event.eps! > event.epsEstimated!) : null
  const diff       = hasBoth ? Math.abs(event.eps! - event.epsEstimated!) : null
  const beatColor  = beat === true ? '#22c55e' : beat === false ? '#ef4444' : 'var(--text-muted)'

  return (
    <div
      className="animate-fade-up flex items-center gap-3 px-3 py-2 border-b border-[var(--border)] last:border-0"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both', opacity: 0.75 }}
    >
      {/* Date */}
      <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)] tabular-nums" style={{ minWidth: '52px' }}>
        {fmtDate(event.date)}
      </span>

      {/* Symbol */}
      <Link
        href={`/asset/stock/${encodeURIComponent(event.symbol)}`}
        className="font-mono text-[12px] font-bold shrink-0 hover:underline"
        style={{ color: 'var(--accent)' }}
      >
        {event.symbol}
      </Link>

      {/* Actual EPS */}
      {event.eps != null && (
        <span className="font-mono text-[10px] font-semibold tabular-nums text-[var(--text)]">
          {fmtEps(event.eps)} EPS
        </span>
      )}

      {/* Beat/miss vs estimate */}
      {hasBoth && diff != null && (
        <span className="font-mono text-[10px] font-semibold" style={{ color: beatColor }}>
          {beat ? '▲ Beat' : '▼ Missed'} by {fmtEps(diff)}
        </span>
      )}

      {/* Revenue */}
      {event.revenue != null && event.revenueEstimated != null && (
        <span className="hidden sm:inline font-mono text-[9px] text-[var(--text-muted)] opacity-50">
          Rev: {fmtRevenue(event.revenue)} vs {fmtRevenue(event.revenueEstimated)} est.
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
            No upcoming earnings for your stock positions
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
                {recent.slice(0, 5).map((e, i) => (
                  <RecentRow key={`${e.symbol}-${e.date}`} event={e} delay={i * 40} />
                ))}
              </div>
            )}

          </div>
        </div>
      )}
    </>
  )
}
