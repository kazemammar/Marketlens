'use client'

import { useEffect, useRef, useState } from 'react'
import Link                             from 'next/link'
import type { PortfolioBriefPayload }   from '@/app/api/portfolio/brief/route'
import { timeAgo }                      from '@/lib/utils/timeago'

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

const LABEL_CLS    = 'font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] w-[80px] shrink-0'
const CONTENT_CLS  = 'font-mono text-[10px] sm:text-[11px] leading-relaxed'

// ─── Component ────────────────────────────────────────────────────────────

export default function PortfolioBrief({
  positionCount,
  refreshTrigger,
}: {
  positionCount:   number
  refreshTrigger?: number
}) {
  const [brief,      setBrief]      = useState<PortfolioBriefPayload | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const prevTrigger = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (positionCount === 0) { setLoading(false); return }

    function fetchBrief(forceRefresh = false) {
      const url = forceRefresh ? '/api/portfolio/brief?refresh=true' : '/api/portfolio/brief'
      fetch(url)
        .then((r) => r.ok ? r.json() as Promise<PortfolioBriefPayload> : null)
        .then((d) => { if (d) setBrief(d) })
        .catch(() => {})
        .finally(() => setLoading(false))
    }

    fetchBrief()
    const id = setInterval(fetchBrief, 30 * 60 * 1_000)
    return () => clearInterval(id)
  }, [positionCount])

  // Cache-bust when parent increments refreshTrigger
  useEffect(() => {
    if (refreshTrigger === undefined) return
    if (prevTrigger.current === undefined) { prevTrigger.current = refreshTrigger; return }
    if (refreshTrigger === prevTrigger.current) return
    prevTrigger.current = refreshTrigger
    fetch('/api/portfolio/brief', { method: 'DELETE' })
      .catch(() => {})
      .finally(() => {
        fetch('/api/portfolio/brief?refresh=true')
          .then((r) => r.ok ? r.json() as Promise<PortfolioBriefPayload> : null)
          .then((d) => { if (d) setBrief(d) })
          .catch(() => {})
      })
  }, [refreshTrigger])

  async function handleManualRefresh() {
    setRefreshing(true)
    try {
      const r = await fetch('/api/portfolio/brief?refresh=true')
      if (r.ok) setBrief(await r.json() as PortfolioBriefPayload)
    } catch { /* silent */ }
    setRefreshing(false)
  }

  if (positionCount === 0) return null

  const style = brief ? SENTIMENT_STYLE[brief.sentiment] : SENTIMENT_STYLE.mixed

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          borderBottom: '1px solid var(--border)',
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

  // ── Badge cluster (shared) ────────────────────────────────────────────
  const badges = (
    <div className="flex flex-wrap items-center gap-2 shrink-0">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${style.pill}`}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: style.dot, boxShadow: `0 0 5px ${style.dot}` }} />
        {brief.sentiment}
      </span>

      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--text-muted)] opacity-60">
        AI Brief
      </span>

      <span className="font-mono text-[9px] tabular-nums text-[var(--text-muted)]" suppressHydrationWarning>
        {timeAgo(brief.generatedAt)}
      </span>

      <button
        onClick={handleManualRefresh}
        disabled={refreshing}
        className="flex items-center justify-center rounded p-0.5 text-[var(--text-muted)] transition hover:text-[var(--text)] disabled:opacity-40"
        title="Refresh AI brief"
        aria-label="Refresh AI brief"
      >
        <svg viewBox="0 0 12 12" fill="none" className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} aria-hidden>
          <path d="M10 6A4 4 0 1 1 6 2a4 4 0 0 1 2.83 1.17L10 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <polyline points="8,1 10,4 7,4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )

  return (
    <div
      className="animate-fade-up"
      style={{
        borderBottom: '1px solid var(--border)',
        borderLeft:   `3px solid ${style.border}`,
        background:   style.background,
        boxShadow:    'inset 3px 0 20px rgba(0,0,0,0.04)',
      }}
    >
      {brief.overview ? (
        /* ── Structured layout ─────────────────────────────────────────── */
        <div className="px-4 py-3 space-y-2.5">
          {badges}

          <div className="space-y-2 pt-0.5">
            {/* OVERVIEW */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3">
              <span className={LABEL_CLS}>Overview</span>
              <span className={CONTENT_CLS} style={{ color: 'var(--text-2)' }}>{brief.overview}</span>
            </div>

            {/* MOVERS */}
            {brief.movers && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3">
                <span className={LABEL_CLS}>Movers</span>
                <span className={CONTENT_CLS} style={{ color: 'var(--text-2)' }}>{brief.movers}</span>
              </div>
            )}

            {/* RISK */}
            {brief.risk_focus && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3">
                <span className={LABEL_CLS} style={{ color: '#f59e0b' }}>Risk</span>
                <span className={CONTENT_CLS} style={{ color: 'var(--text-2)' }}>{brief.risk_focus}</span>
              </div>
            )}

            {/* ACTION */}
            {brief.action && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3">
                <span className={LABEL_CLS} style={{ color: '#10b981' }}>Action</span>
                <span className={CONTENT_CLS} style={{ color: 'var(--text-2)' }}>{brief.action}</span>
              </div>
            )}
          </div>

          {/* Alert chips */}
          {brief.alerts.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {brief.alerts.map((alert, i) => (
                <Link
                  key={i}
                  href={`/asset/${encodeURIComponent(alert.symbol)}`}
                  className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px] transition hover:opacity-80 max-w-[500px] ${
                    alert.type === 'risk'
                      ? 'border-red-500/30 bg-red-500/10 text-red-400'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  }`}
                >
                  <span className="font-bold shrink-0">{alert.symbol}</span>
                  <span className="opacity-80 truncate" title={alert.message}>{alert.message}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Fallback: old single-paragraph layout ─────────────────────── */
        <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4 px-4 py-3">
          {badges}

          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] sm:text-[11px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
              {brief.brief}
            </p>

            {brief.alerts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {brief.alerts.map((alert, i) => (
                  <Link
                    key={i}
                    href={`/asset/${encodeURIComponent(alert.symbol)}`}
                    className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px] transition hover:opacity-80 ${
                      alert.type === 'risk'
                        ? 'border-red-500/30 bg-red-500/10 text-red-400'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    }`}
                  >
                    <span className="font-bold">{alert.symbol}</span>
                    <span className="opacity-80">{alert.message}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
