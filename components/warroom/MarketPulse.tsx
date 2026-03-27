'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { MarketPulsePayload } from '@/app/api/market-pulse/route'
import type { MarketSession } from '@/app/api/market-brief/route'

const DIR_COLOR: Record<string, string> = {
  up:       'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  down:     'text-red-400 bg-red-500/10 border-red-500/25',
  volatile: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
}
const DIR_ARROW: Record<string, string> = { up: '▲', down: '▼', volatile: '↕' }

const SESSION_STYLE: Record<MarketSession, { label: string; color: string }> = {
  pre_market:  { label: 'PRE-MKT',   color: '#60a5fa' },
  morning:     { label: 'MORNING',   color: 'var(--accent)' },
  afternoon:   { label: 'AFTERNOON', color: '#f59e0b' },
  after_hours: { label: 'AFTER HRS', color: '#a78bfa' },
}

function getSession(): { label: string; color: string } {
  const now = new Date()
  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit' })
  const [h, m] = etStr.split(':').map(Number)
  const decimal = h + m / 60
  let session: MarketSession
  if (decimal < 9.5)       session = 'pre_market'
  else if (decimal < 12)   session = 'morning'
  else if (decimal < 16)   session = 'afternoon'
  else                     session = 'after_hours'
  return SESSION_STYLE[session]
}

function ts(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
}

export default function MarketPulse() {
  const [data,    setData]    = useState<MarketPulsePayload | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPulse = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/market-pulse')
      if (res.ok) setData(await res.json() as MarketPulsePayload)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPulse() }, [fetchPulse])

  // Refresh every 10 minutes (pulse derives from the Brief cache, no Groq call)
  useEffect(() => {
    const id = setInterval(() => fetchPulse(true), 10 * 60_000)
    return () => clearInterval(id)
  }, [fetchPulse])

  if (loading) {
    return (
      <div className="flex h-10 animate-pulse items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4">
        <div className="h-2 w-2 rounded-full bg-[var(--surface-2)]" />
        <div className="h-2.5 flex-1 max-w-2xl rounded bg-[var(--surface-2)]" />
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => <div key={i} className="h-5 w-12 rounded bg-[var(--surface-2)]" />)}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { label: sessionLabel, color: sessionColor } = getSession()

  return (
    <div className="flex flex-col gap-1.5 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 sm:flex-row sm:min-h-10 sm:items-center sm:gap-3 sm:py-1.5 sm:px-4">

      {/* LIVE badge + label + session + timestamp */}
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="flex items-center gap-1 rounded px-1 py-0.5" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-red-400">LIVE</span>
        </div>
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          AI BRIEF
        </span>
        <span
          className="rounded border px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-[0.08em]"
          style={{ color: sessionColor, borderColor: `${sessionColor}33`, background: `${sessionColor}12` }}
        >
          {sessionLabel}
        </span>
        <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-50" suppressHydrationWarning>
          {ts(data.generatedAt)}
        </span>
      </div>

      <span className="hidden text-[var(--border)] sm:block">|</span>

      {/* Pulse text — full-width on mobile, flex-1 on desktop */}
      <p className="min-w-0 text-[11px] leading-snug sm:flex-1">
        <span className="text-[var(--text)]">{data.pulse}</span>
      </p>

      {/* Asset chips — wrap below text on mobile */}
      {(data.affectedAssets ?? []).length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {(data.affectedAssets ?? []).slice(0, 5).map((a) => (
            <Link
              key={a.symbol}
              href={`/asset/${a.type}/${encodeURIComponent(a.symbol)}`}
              className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold transition hover:opacity-75 ${DIR_COLOR[a.direction] ?? DIR_COLOR.volatile}`}
            >
              {DIR_ARROW[a.direction] ?? '↕'} {a.symbol}
            </Link>
          ))}
        </div>
      )}

    </div>
  )
}
