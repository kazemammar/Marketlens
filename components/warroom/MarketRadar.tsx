'use client'

import { useEffect, useState } from 'react'
import type { MarketRadarPayload, SignalVerdict } from '@/lib/api/homepage'

const VERDICT_STYLE: Record<SignalVerdict, { bg: string; text: string; border: string; label: string }> = {
  BUY:   { bg: '#052e16', text: '#4ade80', border: '#16a34a', label: 'BUY' },
  CASH:  { bg: '#2d0a0a', text: '#f87171', border: '#dc2626', label: 'CASH' },
  MIXED: { bg: '#1c1a05', text: '#fbbf24', border: '#d97706', label: 'MIXED' },
}

const SIG_COLOR: Record<SignalVerdict, string> = {
  BUY:   '#4ade80',
  CASH:  '#f87171',
  MIXED: '#fbbf24',
}

export default function MarketRadar({
  initialData = null,
}: {
  initialData?: MarketRadarPayload | null
}) {
  const [data,    setData]    = useState<MarketRadarPayload | null>(initialData)
  const [loading, setLoading] = useState(initialData === null)
  // Locale-dependent formatting must only run on the client to avoid
  // SSR/hydration mismatch (server uses UTC, browser uses local timezone).
  const [timeStr, setTimeStr] = useState('')
  useEffect(() => {
    if (data?.updatedAt) {
      setTimeStr(new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
  }, [data?.updatedAt])

  useEffect(() => {
    // If we got server-side data, skip immediate fetch — route refresh still
    // updates the panel on next client-side interval if we add one later.
    if (initialData !== null) { setLoading(false); return }

    fetch('/api/market-radar')
      .then((r) => r.ok ? r.json() as Promise<MarketRadarPayload> : null)
      .then((d) => { if (d) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-blue-400" aria-hidden>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1"/>
          <circle cx="8" cy="8" r="1" fill="currentColor"/>
        </svg>
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Market Radar
        </span>
      </div>

      <div className="flex-1 px-3 py-2.5">
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-10 w-full rounded bg-[var(--surface-2)]" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[var(--surface-2)]" />
                <div className="h-2.5 flex-1 rounded bg-[var(--surface-2)]" />
                <div className="h-2.5 w-10 rounded bg-[var(--surface-2)]" />
              </div>
            ))}
          </div>
        ) : data ? (
          <>
            {/* Verdict badge */}
            {(() => {
              const s = VERDICT_STYLE[data.verdict]
              return (
                <div
                  className="mb-3 flex items-center justify-between rounded px-3 py-2"
                  style={{ background: s.bg, border: `1px solid ${s.border}` }}
                >
                  <div>
                    <p className="font-mono text-[8px] uppercase tracking-[0.14em]" style={{ color: s.text, opacity: 0.7 }}>
                      Overall Verdict
                    </p>
                    <p className="font-mono text-[18px] font-bold leading-none" style={{ color: s.text }}>
                      {s.label}
                    </p>
                  </div>
                  {/* Score bar */}
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-[10px]" style={{ color: s.text }}>{data.score}%</span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--surface-3)]">
                      <div className="h-full rounded-full" style={{ width: `${data.score}%`, background: s.text }} />
                    </div>
                    <span className="font-mono text-[8px]" style={{ color: s.text, opacity: 0.6 }}>
                      bull score
                    </span>
                  </div>
                </div>
              )
            })()}

            {/* Signals */}
            <div className="space-y-1">
              {data.signals.map((sig, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: SIG_COLOR[sig.verdict] }}
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[var(--text-muted)]">
                    {sig.name}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-[var(--text)]">
                    {sig.value}
                  </span>
                  <span
                    className="font-mono text-[8px] font-bold uppercase"
                    style={{ color: SIG_COLOR[sig.verdict] }}
                  >
                    {sig.verdict}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-2.5 font-mono text-[8px] text-[var(--text-muted)] opacity-50">
              Updated {timeStr || '--:--'}
            </p>
          </>
        ) : (
          <p className="py-4 text-center font-mono text-[10px] text-[var(--text-muted)]">Unavailable</p>
        )}
      </div>
    </div>
  )
}
