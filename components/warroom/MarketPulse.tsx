'use client'

import { useEffect, useState, useCallback } from 'react'
import { MarketPulsePayload } from '@/app/api/market-pulse/route'
import { timeAgo }            from '@/lib/utils/timeago'

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
      <div
        className="border-b"
        style={{
          borderColor: 'rgba(16,185,129,0.15)',
          borderLeft:  '3px solid rgba(16,185,129,0.25)',
          background:  'linear-gradient(to right, rgba(16,185,129,0.04), transparent 60%)',
        }}
      >
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="skeleton h-4 w-14 rounded-full shrink-0" />
          <div className="skeleton h-3 w-full max-w-md rounded" />
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div
      className="animate-fade-up border-b"
      style={{
        borderColor: 'rgba(16,185,129,0.2)',
        borderLeft:  '3px solid #10b981',
        background:  'linear-gradient(to right, rgba(16,185,129,0.06), rgba(16,185,129,0.01) 50%, transparent)',
      }}
    >
      <div className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-start sm:gap-4">

        {/* Badge */}
        <div className="flex shrink-0 items-center gap-2">
          <div
            className="flex items-center gap-1.5 rounded-full px-2 py-0.5"
            style={{
              background: 'rgba(16,185,129,0.15)',
              border:     '1px solid rgba(16,185,129,0.35)',
              boxShadow:  '0 0 10px rgba(16,185,129,0.12)',
            }}
          >
            <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            <span
              className="font-mono text-[9px] font-bold uppercase tracking-[0.16em]"
              style={{ color: 'var(--accent)' }}
            >
              Live
            </span>
          </div>
          <span
            className="font-mono text-[9px] tabular-nums text-[var(--text-muted)] opacity-50"
            suppressHydrationWarning
          >
            {timeAgo(data.generatedAt)}
          </span>
        </div>

        {/* Pulse sentence */}
        <p
          className="min-w-0 flex-1 font-mono text-[11px] sm:text-[12px] leading-relaxed"
          style={{ color: 'var(--text-2, var(--text))' }}
        >
          {data.pulse}
        </p>

        {/* Top headline chips — hidden on mobile, visible on md+ */}
        {data.headlines.length > 0 && (
          <div className="hidden lg:flex shrink-0 flex-col gap-1 max-w-[260px]">
            {data.headlines.slice(0, 3).map((h, i) => (
              <p
                key={i}
                className="truncate font-mono text-[9px] text-[var(--text-muted)] opacity-50"
                title={h}
              >
                · {h}
              </p>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
