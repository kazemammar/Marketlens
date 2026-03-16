'use client'

import { useEffect, useState } from 'react'

interface Entry {
  label: string
  apiPath: string
  freshKey: string // JSON key that contains a timestamp in ms
}

const ENTRIES: Entry[] = [
  { label: 'Stocks',  apiPath: '/api/market?tab=stock&limit=1',  freshKey: '' },
  { label: 'Forex',   apiPath: '/api/market?tab=forex&limit=1',  freshKey: '' },
  { label: 'Crypto',  apiPath: '/api/market?tab=crypto&limit=1', freshKey: '' },
]

function freshness(ms: number | null): 'fresh' | 'stale' | 'old' | 'unknown' {
  if (ms === null) return 'unknown'
  const age = (Date.now() - ms) / 1000
  if (age < 300)  return 'fresh'
  if (age < 900)  return 'stale'
  return 'old'
}

function fmt(ms: number | null): string {
  if (ms === null) return '—'
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

const DOT_COLOR: Record<string, string> = {
  fresh:   'var(--accent)',
  stale:   'var(--warning)',
  old:     'var(--danger)',
  unknown: 'var(--text-muted)',
}

const LABELS = ['Stocks', 'Forex', 'News', 'AI Brief']

export default function StatusBar() {
  const [times, setTimes] = useState<Record<string, number | null>>({
    Stocks: null, Forex: null, News: null, 'AI Brief': null,
  })
  const [tick, setTick] = useState(0)

  // Probe each endpoint once for its cache freshness
  useEffect(() => {
    const probes: Array<[string, string]> = [
      ['Stocks',   '/api/market?tab=stock'],
      ['Forex',    '/api/market?tab=forex'],
      ['News',     '/api/news?page=1&limit=1'],
      ['AI Brief', '/api/market-brief'],
    ]
    for (const [label, path] of probes) {
      fetch(path, { method: 'HEAD' }).catch(() => null)
      // Fall back: mark as "now" if the endpoint responds
      fetch(path)
        .then(async (r) => {
          if (!r.ok) return
          const data = await r.json() as Record<string, unknown>
          // Try to extract a timestamp from common fields
          const ts =
            (typeof data.cachedAt === 'number' ? data.cachedAt : null) ??
            (typeof data.generatedAt === 'number' ? data.generatedAt : null) ??
            (Array.isArray(data) && data.length > 0 ? Date.now() : null) ??
            Date.now()
          setTimes((prev) => ({ ...prev, [label]: ts }))
        })
        .catch(() => {})
    }
  }, [])

  // Re-render every 10 s to update relative times
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  // suppress unused warning
  void tick

  return (
    <div
      className="flex h-6 shrink-0 items-center gap-3 overflow-x-auto border-t border-[var(--border)] px-4"
      style={{ background: 'var(--bg)' }}
    >
      <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] opacity-40">
        Data
      </span>
      <div className="flex items-center gap-3">
        {LABELS.map((label) => {
          const ms   = times[label]
          const stat = freshness(ms)
          const color = DOT_COLOR[stat]
          return (
            <div key={label} className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
              <span className="font-mono text-[9px] tabular-nums text-[var(--text-muted)]">
                {label} {fmt(ms)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
