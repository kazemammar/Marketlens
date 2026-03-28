'use client'

import { useEffect, useState } from 'react'
import type { IpoEvent } from '@/lib/api/finnhub'

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
  })
}

function fmtValue(n: number | null) {
  if (n == null) return '—'
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toLocaleString()}`
}

export default function IpoCalendar({ limit }: { limit?: number }) {
  const [events,  setEvents]  = useState<IpoEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/ipo-calendar')
      .then((r) => r.json())
      .then((d) => setEvents(d ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const display = limit ? events.slice(0, limit) : events
  const hasMore = limit ? events.length > limit : false

  return (
    <div className="rounded border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Upcoming IPOs
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
          Next 30 days
        </span>
      </div>

      {/* Content */}
      <div className="divide-y divide-[var(--border)]">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2">
              <div className="skeleton h-3 w-16 rounded" />
              <div className="skeleton h-3 flex-1 rounded" />
              <div className="skeleton h-3 w-12 rounded" />
            </div>
          ))
        ) : display.length === 0 ? (
          <p className="px-3 py-4 text-center font-mono text-[10px] text-[var(--text-muted)]">
            No upcoming IPOs in the next 30 days
          </p>
        ) : (
          display.map((ipo, i) => (
            <div
              key={`${ipo.symbol}-${i}`}
              className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-[var(--surface-2)]"
            >
              <span className="w-[52px] shrink-0 font-mono text-[9px] text-[var(--text-muted)]">
                {fmtDate(ipo.date)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[11px] font-semibold text-[var(--text)]">
                  {ipo.symbol || '—'}
                </p>
                <p className="truncate font-mono text-[9px] text-[var(--text-muted)]">
                  {ipo.name}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-[10px] font-semibold text-[var(--text)]">
                  {ipo.price || '—'}
                </p>
                <p className="font-mono text-[8px] text-[var(--text-muted)]">
                  {fmtValue(ipo.totalSharesValue)}
                </p>
              </div>
              <span
                className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase"
                style={{
                  background: ipo.status === 'priced' ? 'rgba(16,185,129,0.1)' : 'var(--surface-2)',
                  color:      ipo.status === 'priced' ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {ipo.status || 'expected'}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {hasMore && (
        <div className="border-t border-[var(--border)] px-3 py-1.5 text-center">
          <span className="font-mono text-[9px] text-[var(--text-muted)]">
            +{events.length - (limit ?? 0)} more IPOs this month
          </span>
        </div>
      )}
    </div>
  )
}
