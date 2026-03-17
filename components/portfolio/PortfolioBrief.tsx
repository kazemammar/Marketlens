'use client'

import { useEffect, useState } from 'react'
import Link                    from 'next/link'
import type { PortfolioBriefPayload } from '@/app/api/portfolio/brief/route'
import { timeAgo }             from '@/lib/utils/timeago'

// ─── Sentiment styles ─────────────────────────────────────────────────────

const SENTIMENT_STYLE = {
  bullish: {
    border:     '#10b981',
    background: 'linear-gradient(to right, rgba(16,185,129,0.07), rgba(16,185,129,0.025) 50%, transparent)',
    pill:       'bg-emerald-500/10 border-emerald-500/35 text-emerald-400',
    dot:        '#10b981',
  },
  bearish: {
    border:     'var(--price-down)',
    background: 'linear-gradient(to right, rgba(239,68,68,0.07), rgba(239,68,68,0.025) 50%, transparent)',
    pill:       'bg-red-500/10 border-red-500/35 text-red-400',
    dot:        '#ef4444',
  },
  mixed: {
    border:     'var(--warning)',
    background: 'linear-gradient(to right, rgba(245,158,11,0.07), rgba(245,158,11,0.025) 50%, transparent)',
    pill:       'bg-amber-500/10 border-amber-500/35 text-amber-400',
    dot:        '#f59e0b',
  },
}

// ─── Component ────────────────────────────────────────────────────────────

export default function PortfolioBrief({ positionCount }: { positionCount: number }) {
  const [brief,   setBrief]   = useState<PortfolioBriefPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (positionCount === 0) { setLoading(false); return }

    function fetchBrief() {
      fetch('/api/portfolio/brief')
        .then((r) => r.ok ? r.json() as Promise<PortfolioBriefPayload> : null)
        .then((d) => { if (d) setBrief(d) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }

    fetchBrief()
    const id = setInterval(fetchBrief, 15 * 60 * 1_000)
    return () => clearInterval(id)
  }, [positionCount])

  if (positionCount === 0) return null

  const style = brief ? SENTIMENT_STYLE[brief.sentiment] : SENTIMENT_STYLE.mixed

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="mb-4 rounded-xl border overflow-hidden"
        style={{
          borderColor:  'rgba(16,185,129,0.2)',
          borderLeft:   '3px solid rgba(16,185,129,0.3)',
          background:   'linear-gradient(to right, rgba(16,185,129,0.06), rgba(16,185,129,0.02) 60%, transparent)',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="skeleton h-5 w-24 shrink-0 rounded-full" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-3/4 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!brief) return null

  return (
    <div
      className="mb-4 rounded-xl border overflow-hidden animate-fade-up"
      style={{
        borderColor:  'rgba(0,0,0,0.1)',
        borderLeft:   `3px solid ${style.border}`,
        background:   style.background,
      }}
    >
      <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4 px-4 py-3">

        {/* Badge cluster */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Sentiment pill */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${style.pill}`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: style.dot, boxShadow: `0 0 5px ${style.dot}` }}
            />
            {brief.sentiment}
          </span>

          {/* AI label */}
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--text-muted)] opacity-60">
            AI Brief
          </span>

          {/* Timestamp */}
          <span
            className="font-mono text-[9px] tabular-nums text-[var(--text-muted)]"
            suppressHydrationWarning
          >
            {timeAgo(brief.generatedAt)}
          </span>
        </div>

        {/* Brief text */}
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[12px] sm:text-[13px] leading-relaxed text-[var(--text-2)]">
            {brief.brief}
          </p>

          {/* Alert chips */}
          {brief.alerts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {brief.alerts.map((alert, i) => (
                <Link
                  key={i}
                  href={`/asset/${encodeURIComponent(alert.symbol)}`}
                  className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px] transition hover:opacity-80 ${
                    alert.type === 'risk'
                      ? 'border-red-500/30 bg-red-500/8 text-red-400'
                      : 'border-emerald-500/30 bg-emerald-500/8 text-emerald-400'
                  }`}
                >
                  <span className="font-bold">{alert.symbol}</span>
                  <span className="text-[var(--text-muted)] opacity-80">{alert.message}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
