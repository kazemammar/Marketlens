'use client'

import { useFetch } from '@/lib/hooks/useFetch'
import type { EconomicEvent } from '@/lib/api/finnhub'

interface EconomicCalendarPayload {
  events: EconomicEvent[]
  generatedAt: number
}

const IMPACT_COLOR: Record<string, string> = {
  high:   '#ef4444',
  medium: '#f59e0b',
}

function formatDateLabel(dateStr: string): string {
  // dateStr is YYYY-MM-DD — append T00:00:00 to avoid timezone shift
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '—'
  // Finnhub returns times like "08:30:00" in UTC
  const [h, m] = timeStr.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12  = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${m} ${ampm}`
}

function formatNum(n: number | null, unit: string): string {
  if (n === null) return '—'
  if (unit === '%') return `${n.toFixed(2)}%`
  if (unit === 'B') return `${n.toFixed(1)}B`
  if (unit === 'K') return `${n.toFixed(0)}K`
  if (unit === 'M') return `${n.toFixed(1)}M`
  return n.toFixed(2)
}

function groupByDate(events: EconomicEvent[]): Map<string, EconomicEvent[]> {
  const map = new Map<string, EconomicEvent[]>()
  for (const ev of events) {
    const group = map.get(ev.date) ?? []
    group.push(ev)
    map.set(ev.date, group)
  }
  return map
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-[var(--border)]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2">
          <div className="skeleton h-2 w-12 rounded" />
          <div className="skeleton h-1.5 w-1.5 rounded-full shrink-0" />
          <div className="skeleton h-2 flex-1 rounded" />
          <div className="skeleton h-2 w-16 rounded" />
        </div>
      ))}
    </div>
  )
}

export default function EconomicCalendar() {
  const { data, loading } = useFetch<EconomicCalendarPayload>('/api/economic-calendar', {
    refreshInterval: 60 * 60_000,
  })

  const events = data?.events ?? []
  const grouped = groupByDate(events)
  const dates   = Array.from(grouped.keys()).sort()

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        {/* Calendar icon */}
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <rect x="1" y="3" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M1 7h14" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Economic Calendar
        </span>
        <span className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-px font-mono text-[8px] text-[var(--text-muted)]">
          NEXT 7 DAYS
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-40">1HR CACHE</span>
      </div>

      {loading ? (
        <SkeletonRows />
      ) : events.length === 0 ? (
        <p className="px-3 py-6 text-center font-mono text-[10px] text-[var(--text-muted)]">
          No high-impact events this week
        </p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {dates.map((date) => (
            <div key={date}>
              {/* Date group header */}
              <div className="bg-[var(--surface-2)] px-3 py-1">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  {formatDateLabel(date)}
                </span>
              </div>
              {/* Event rows */}
              {(grouped.get(date) ?? []).map((ev, i) => {
                const happened = ev.actual !== null
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-2)] transition-colors"
                  >
                    {/* Time */}
                    <span className="font-mono text-[9px] tabular-nums text-[var(--text-muted)] w-14 shrink-0">
                      {formatTime(ev.time)}
                    </span>

                    {/* Impact dot */}
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: IMPACT_COLOR[ev.impact] ?? 'var(--text-muted)' }}
                      title={ev.impact.toUpperCase()}
                    />

                    {/* Event name */}
                    <span className="font-mono text-[9px] text-[var(--text)] flex-1 min-w-0 truncate">
                      {ev.event}
                    </span>

                    {/* Values */}
                    <div className="flex items-center gap-2 shrink-0 font-mono text-[9px] tabular-nums">
                      {happened ? (
                        <>
                          <span
                            className="font-semibold"
                            style={{
                              color: ev.actual !== null && ev.estimate !== null
                                ? ev.actual >= ev.estimate ? 'var(--price-up)' : 'var(--price-down)'
                                : 'var(--text)',
                            }}
                          >
                            A: {formatNum(ev.actual, ev.unit)}
                          </span>
                          {ev.estimate !== null && (
                            <span className="text-[var(--text-muted)]">E: {formatNum(ev.estimate, ev.unit)}</span>
                          )}
                        </>
                      ) : (
                        <>
                          {ev.estimate !== null && (
                            <span className="text-[var(--text-muted)]">E: {formatNum(ev.estimate, ev.unit)}</span>
                          )}
                          {ev.prev !== null && (
                            <span className="text-[var(--text-muted)] opacity-50">P: {formatNum(ev.prev, ev.unit)}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
