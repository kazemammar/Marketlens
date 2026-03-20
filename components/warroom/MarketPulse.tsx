'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { MarketPulsePayload } from '@/app/api/market-pulse/route'

const DIR_COLOR: Record<string, string> = {
  up:       'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  down:     'text-red-400 bg-red-500/10 border-red-500/25',
  volatile: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
}
const DIR_ARROW: Record<string, string> = { up: '▲', down: '▼', volatile: '↕' }

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

  // Refresh every 5 minutes
  useEffect(() => {
    const id = setInterval(() => fetchPulse(true), 5 * 60_000)
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

  return (
    <div className="flex min-h-10 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 sm:px-4">

      {/* Pulsing dot + label + timestamp */}
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="live-dot h-2 w-2 rounded-full bg-[var(--accent)] animate-pulse" />
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          AI BRIEF
        </span>
        <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-50" suppressHydrationWarning>
          {ts(data.generatedAt)}
        </span>
      </div>

      <span className="hidden text-[var(--border)] sm:block">|</span>

      {/* Pulse text */}
      <p className="min-w-0 flex-1 text-[11px] leading-snug">
        <span className="text-[var(--text)]">{data.pulse}</span>
      </p>

      {/* Asset chips */}
      {data.affectedAssets.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {data.affectedAssets.slice(0, 5).map((a) => (
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
