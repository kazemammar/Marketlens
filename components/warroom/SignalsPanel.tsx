'use client'

import { useEffect, useState } from 'react'
import type { Signal } from '@/app/api/signals/route'

const REFRESH_MS = 120_000

const SEV_STYLE: Record<string, string> = {
  HIGH: 'text-red-400 bg-red-500/10 border-red-500/25',
  MED:  'text-amber-400 bg-amber-500/10 border-amber-500/25',
  LOW:  'text-slate-400 bg-slate-700/20 border-slate-700/25',
}

function ago(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60_000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

export default function SignalsPanel() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const r = await fetch('/api/signals')
      const d = await r.json() as Signal[]
      setSignals(d)
    } catch { /* silent */ }
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Signals
          </span>
        </div>
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
          {signals.length} active
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex animate-pulse gap-2 border-b border-[var(--border)] px-3 py-2.5">
              <div className="h-4 w-4 rounded bg-[var(--surface-2)]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-full rounded bg-[var(--surface-2)]" />
                <div className="h-2 w-16 rounded bg-[var(--surface-2)]" />
              </div>
            </div>
          ))
        ) : signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <span className="text-xl opacity-30">📡</span>
            <p className="font-mono text-[10px] text-[var(--text-muted)]">No active signals</p>
            <p className="font-mono text-[9px] text-[var(--text-muted)] opacity-50">
              Signals appear on notable market moves
            </p>
          </div>
        ) : (
          signals.map((sig) => (
            <div key={sig.id} className="flex gap-2 border-b border-[var(--border)] px-3 py-2.5">
              <span className="mt-0.5 shrink-0 text-[13px] leading-none">{sig.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium leading-snug text-[var(--text)]">
                  {sig.text}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`rounded border px-1 py-px font-mono text-[8px] font-bold uppercase ${SEV_STYLE[sig.severity]}`}>
                    {sig.severity}
                  </span>
                  <span className="font-mono text-[9px] text-[var(--text-muted)]">{ago(sig.timestamp)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
