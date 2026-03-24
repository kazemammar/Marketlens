'use client'

import Link from 'next/link'
import { useFetch } from '@/lib/hooks/useFetch'
import { formatCompact } from '@/lib/utils/formatters'
import type { EarningsEvent } from '@/lib/api/finnhub'

interface EarningsCalendarPayload {
  events: EarningsEvent[]
  generatedAt: number
}

function HourBadge({ hour }: { hour: string }) {
  const label = hour === 'bmo' ? 'BMO' : hour === 'amc' ? 'AMC' : hour.toUpperCase()
  const color = hour === 'bmo'
    ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
    : 'border-orange-500/40 bg-orange-500/10 text-orange-400'
  return (
    <span className={`rounded border px-1 py-px font-mono text-[7px] font-bold ${color}`}>
      {label}
    </span>
  )
}

function BeatMissBadge({ actual, estimate }: { actual: number; estimate: number }) {
  const beat = actual > estimate
  return (
    <span
      className="rounded border px-1 py-px font-mono text-[7px] font-bold"
      style={{
        borderColor: beat ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)',
        background:  beat ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
        color:       beat ? 'var(--price-up)'     : 'var(--price-down)',
      }}
    >
      {beat ? 'BEAT' : 'MISS'}
    </span>
  )
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <div className="skeleton h-3 w-16 rounded" />
      <div className="skeleton h-2 w-10 rounded" />
      <div className="skeleton h-2 w-20 rounded" />
      <div className="skeleton h-2 w-14 rounded" />
    </div>
  )
}

export default function EarningsCalendar({ limit }: { limit?: number } = {}) {
  const { data, loading } = useFetch<EarningsCalendarPayload>('/api/earnings-calendar', {
    refreshInterval: 60 * 60_000,
  })

  const allEvents = data?.events ?? []
  const events    = limit ? allEvents.slice(0, limit) : allEvents
  const hiddenCount = limit ? Math.max(0, allEvents.length - limit) : 0

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        {/* Chart bar icon */}
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <rect x="1" y="9" width="3" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.4"/>
          <rect x="6" y="5" width="3" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.4"/>
          <rect x="11" y="1" width="3" height="14" rx="0.5" stroke="currentColor" strokeWidth="1.4"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Earnings This Week
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        {limit ? (
          <Link
            href="/stocks#earnings"
            className="font-mono text-[9px] text-[var(--accent)] opacity-70 hover:opacity-100 transition-opacity"
          >
            View all →
          </Link>
        ) : (
          <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-40">1HR CACHE</span>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {loading ? (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: limit ?? 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : events.length === 0 ? (
          <p className="py-6 text-center font-mono text-[10px] text-[var(--text-muted)]">
            No earnings reports this week
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {events.map((ev, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-1.5 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5 transition hover:border-[var(--accent)]/30"
                >
                  {/* Symbol + hour badge */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[12px] font-bold text-[var(--text)] truncate">
                      {ev.symbol}
                    </span>
                    {ev.hour && <HourBadge hour={ev.hour} />}
                  </div>

                  {/* Date */}
                  <span className="font-mono text-[9px] text-[var(--text-muted)]">
                    {formatDateShort(ev.date)} · Q{ev.quarter} {ev.year}
                  </span>

                  {/* EPS line */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[8px] text-[var(--text-muted)] uppercase tracking-[0.08em]">EPS Est</span>
                    <span className="font-mono text-[9px] tabular-nums text-[var(--text)]">
                      {ev.epsEstimate !== null ? `$${ev.epsEstimate.toFixed(2)}` : '—'}
                    </span>
                  </div>

                  {/* Revenue line */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[8px] text-[var(--text-muted)] uppercase tracking-[0.08em]">Rev Est</span>
                    <span className="font-mono text-[9px] tabular-nums text-[var(--text)]">
                      {ev.revenueEstimate !== null ? `$${formatCompact(ev.revenueEstimate)}` : '—'}
                    </span>
                  </div>

                  {/* Beat/miss badge if reported */}
                  {ev.epsActual !== null && ev.epsEstimate !== null && (
                    <div className="flex items-center justify-between gap-1">
                      <BeatMissBadge actual={ev.epsActual} estimate={ev.epsEstimate} />
                      <span className="font-mono text-[9px] tabular-nums" style={{ color: ev.epsActual >= ev.epsEstimate ? 'var(--price-up)' : 'var(--price-down)' }}>
                        ${ev.epsActual.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* "View all" footer when truncated */}
            {hiddenCount > 0 && (
              <div className="mt-2.5 flex justify-center">
                <Link
                  href="/stocks#earnings"
                  className="flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--surface-2)] px-4 py-1.5 font-mono text-[10px] text-[var(--text-muted)] transition hover:border-[var(--accent)]/40 hover:text-[var(--accent)]"
                >
                  +{hiddenCount} more earnings · View all on Stocks page →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
