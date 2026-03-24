'use client'

import { useEffect, useState } from 'react'
import type { MarketBriefPayload, MarketSession } from '@/app/api/market-brief/route'
import { timeAgo, stalenessColor } from '@/lib/utils/timeago'

const SESSION_LABEL: Record<MarketSession, string> = {
  pre_market: 'PRE-MKT',
  morning: 'MORNING',
  afternoon: 'AFTERNOON',
  after_hours: 'AFTER HRS',
}

export default function MarketBriefBar() {
  const [brief, setBrief] = useState<MarketBriefPayload | null>(null)

  useEffect(() => {
    fetch('/api/market-brief')
      .then((r) => r.ok ? r.json() as Promise<MarketBriefPayload> : null)
      .then((b) => { if (b) setBrief(b) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      fetch('/api/market-brief')
        .then((r) => r.ok ? r.json() as Promise<MarketBriefPayload> : null)
        .then((b) => { if (b) setBrief(b) })
        .catch(() => {})
    }, 60 * 60_000)
    return () => clearInterval(id)
  }, [])

  if (!brief) {
    return (
      <div className="ai-brief-bar flex h-9 items-center gap-3 border-b border-[var(--border)] px-4"
        style={{ background: 'linear-gradient(to right, rgba(16,185,129,0.05), transparent)' }}>
        <div className="skeleton h-1.5 w-1.5 rounded-full shrink-0" />
        <div className="skeleton h-2.5 flex-1 max-w-2xl rounded" />
      </div>
    )
  }

  const narrative = brief.narrative ?? brief.brief
  const sessionLabel = brief.session ? SESSION_LABEL[brief.session] : null

  return (
    <div
      className="flex items-center gap-2.5 border-b px-4 py-1.5 overflow-hidden"
      style={{
        borderColor: 'rgba(16,185,129,0.2)',
        background: 'linear-gradient(to right, rgba(16,185,129,0.06), rgba(16,185,129,0.02) 60%, transparent)',
      }}
    >
      {/* Live dot */}
      <span className="live-dot h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: '#10b981' }} />

      {/* AI BRIEF label */}
      <span className="shrink-0 font-mono text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: '#10b981' }}>
        AI Brief
      </span>

      {/* Session badge */}
      {sessionLabel && (
        <span className="shrink-0 rounded border px-1.5 py-px font-mono text-[7px] font-bold uppercase tracking-[0.08em]"
          style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
          {sessionLabel}
        </span>
      )}

      {/* Divider */}
      <span className="shrink-0 text-[var(--text-muted)] opacity-20">|</span>

      {/* Narrative headline */}
      <p className="min-w-0 flex-1 truncate font-mono text-[10px] sm:text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
        {narrative}
      </p>

      {/* Timestamp */}
      <span
        className="shrink-0 font-mono text-[8px] tabular-nums"
        style={{ color: stalenessColor(brief.generatedAt) }}
        suppressHydrationWarning
      >
        {timeAgo(brief.generatedAt)}
      </span>
    </div>
  )
}
