'use client'

import { useEffect, useRef, useState } from 'react'
import { Flame, TrendingUp, TrendingDown, AlertTriangle, ArrowLeftRight, Shield, Fuel, Activity } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Signal } from '@/app/api/signals/route'
import { useFetch } from '@/lib/hooks/useFetch'
import { timeAgo, stalenessColor } from '@/lib/utils/timeago'

const SEV_BAR: Record<string, string> = {
  HIGH: 'bg-[#ff4444]',
  MED:  'bg-[#f59e0b]',
  LOW:  'bg-[var(--border)]',
}

const SEV_BADGE: Record<string, string> = {
  HIGH: 'text-white border-transparent bg-[#ff4444]',
  MED:  'text-black border-transparent bg-[#f59e0b]',
  LOW:  'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]',
}

function getSignalIcon(text: string): { icon: LucideIcon; color: string } {
  const t = text.toLowerCase()
  if (/oil|crude|wti|brent|opec|petroleum/.test(t))       return { icon: Flame,          color: '#f97316' }
  if (/war|military|conflict|geopolit|sanction|attack/.test(t)) return { icon: Shield,    color: '#ff4444' }
  if (/vix|volatil|fear/.test(t))                          return { icon: AlertTriangle,  color: '#f59e0b' }
  if (/forex|currency|dollar|yen|euro|pound|yuan|fx/.test(t))  return { icon: ArrowLeftRight, color: '#22d3ee' }
  if (/gas|wheat|corn|commodity|natural gas|copper/.test(t))   return { icon: Fuel,       color: '#eab308' }
  if (/-\d|\bdown\b|sell|drop|fall|crash|decline/.test(t)) return { icon: TrendingDown,  color: '#ff4444' }
  if (/\+\d|\bup\b|buy|rise|rally|surge|gain/.test(t))    return { icon: TrendingUp,     color: '#00ff88' }
  return { icon: Activity, color: 'var(--accent)' }
}

function ago(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60_000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

// Category filter type
type CatFilter = 'all' | 'price' | 'news'

const CAT_LABEL: Record<string, string> = {
  price:     'PRICE',
  news:      'NEWS',
  technical: 'TECH',
  macro:     'MACRO',
}

const CAT_COLOR: Record<string, string> = {
  price:     'text-[var(--accent)] bg-[var(--accent-dim)]',
  news:      'text-blue-400 bg-blue-500/10',
  technical: 'text-purple-400 bg-purple-500/10',
  macro:     'text-amber-400 bg-amber-500/10',
}

// Single signal row — full-width, text always wraps, never truncates
function SignalRow({ sig, isNew }: { sig: Signal; isNew: boolean }) {
  const { icon: Icon, color } = getSignalIcon(sig.text)
  const isHigh = sig.severity === 'HIGH'
  return (
    <div
      className={`group flex items-start gap-3 border-b border-[var(--border)] px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)] ${isHigh ? 'bg-[rgba(255,68,68,0.03)]' : ''} ${isNew ? 'signal-new' : ''}`}
    >
      {/* Severity bar */}
      <div className={`mt-1 w-[3px] shrink-0 self-stretch rounded-full ${SEV_BAR[sig.severity] ?? SEV_BAR.LOW}`} />
      {/* Icon */}
      <Icon
        size={14}
        className="mt-0.5 shrink-0"
        style={{ color, opacity: isHigh ? 1 : 0.75 }}
        strokeWidth={2}
      />
      {/* Full signal text — no truncation, wraps freely */}
      <p className={`flex-1 leading-snug ${isHigh ? 'text-[13px] font-semibold text-[var(--text)]' : 'text-[12px] font-medium text-[var(--text-2)]'}`}>
        {sig.text}
      </p>
      {/* Right meta: category tag · severity badge · time */}
      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        <span className={`rounded px-1.5 py-px font-mono text-[8px] font-bold uppercase ${CAT_COLOR[sig.category] ?? CAT_COLOR.news}`}>
          {CAT_LABEL[sig.category] ?? sig.category}
        </span>
        <span className={`rounded border px-1.5 py-px font-mono text-[8px] font-bold uppercase ${SEV_BADGE[sig.severity]}`}>
          {sig.severity}
        </span>
        <span className="w-10 text-right font-mono text-[8px] tabular-nums text-[var(--text-muted)] opacity-50">
          {ago(sig.timestamp)}
        </span>
      </div>
    </div>
  )
}

export default function SignalsPanel({ layout = 'vertical' }: { layout?: 'vertical' | 'horizontal' }) {
  const { data: raw, loading } = useFetch<Signal[]>('/api/signals', { refreshInterval: 5 * 60_000 })
  const signals = raw ?? []

  const [newIds,    setNewIds]    = useState<Set<string>>(new Set())
  const prevIds = useRef<Set<string>>(new Set())
  const [filter,    setFilter]    = useState<CatFilter>('all')
  const [updatedAt, setUpdatedAt] = useState(0)
  const prevRaw = useRef<Signal[] | null>(null)
  useEffect(() => {
    if (raw && raw !== prevRaw.current) {
      prevRaw.current = raw
      // Use the most-recent signal timestamp — not client receipt time
      setUpdatedAt(raw.length > 0 ? Math.max(...raw.map((s) => s.timestamp)) : 0)
    }
  }, [raw])

  // Detect brand-new signal IDs on each refresh
  useEffect(() => {
    if (!raw) return
    const fresh = new Set<string>()
    for (const s of raw) {
      if (!prevIds.current.has(s.id)) fresh.add(s.id)
    }
    prevIds.current = new Set(raw.map((s) => s.id))
    if (fresh.size > 0) {
      setNewIds(fresh)
      setTimeout(() => setNewIds(new Set()), 2000)
    }
  }, [raw])

  // ─── Horizontal strip layout ────────────────────────────────────────────
  if (layout === 'horizontal') {
    const filtered = filter === 'all' ? signals : signals.filter((s) => s.category === filter)

    return (
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Live Signals
            </span>
          </div>

          {/* Category filter tabs */}
          <div className="flex items-center gap-px">
            {(['all', 'price', 'news'] as CatFilter[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-2 py-px font-mono text-[8px] font-bold uppercase rounded transition-colors ${
                  filter === cat
                    ? 'bg-[var(--accent)] text-[var(--bg)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
              {filtered.length} signals
            </span>
            {updatedAt > 0 && (
              <span
                className="font-mono text-[8px] tabular-nums"
                style={{ color: stalenessColor(updatedAt) }}
                title={`Last updated: ${new Date(updatedAt).toLocaleTimeString()}`}
                suppressHydrationWarning
              >
                {timeAgo(updatedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Full-width single-column feed — text always visible, wraps freely */}
        {loading ? (
          <div className="divide-y divide-[var(--border)]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="skeleton h-3.5 w-3.5 rounded shrink-0" />
                <div className="skeleton h-3 flex-1 rounded" />
                <div className="flex items-center gap-2 shrink-0">
                  <div className="skeleton h-2.5 w-10 rounded" />
                  <div className="skeleton h-2.5 w-8 rounded" />
                  <div className="skeleton h-2 w-8 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <p className="font-mono text-[10px] text-[var(--text-muted)] opacity-50">
              No {filter === 'all' ? '' : filter + ' '}signals active
            </p>
          </div>
        ) : (
          <div>
            {filtered.slice(0, 14).map((sig, i) => (
              <SignalRow key={`${sig.id}-${i}`} sig={sig} isNew={newIds.has(sig.id)} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Vertical layout (default) ───────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Signals
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
            {signals.length} active
          </span>
          {updatedAt > 0 && (
            <span
              className="font-mono text-[8px] tabular-nums"
              style={{ color: stalenessColor(updatedAt) }}
              title={`Last updated: ${new Date(updatedAt).toLocaleTimeString()}`}
              suppressHydrationWarning
            >
              {timeAgo(updatedAt)}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-2 border-b border-[var(--border)] px-3 py-2.5">
              <div className="skeleton h-4 w-4 rounded" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-2.5 w-full rounded" />
                <div className="skeleton h-2 w-16 rounded" />
              </div>
            </div>
          ))
        ) : signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7 text-[var(--text-muted)] opacity-25" aria-hidden>
              <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
            </svg>
            <p className="font-mono text-[10px] text-[var(--text-muted)]">No active signals</p>
            <p className="font-mono text-[9px] text-[var(--text-muted)] opacity-40">Signals appear on notable market moves</p>
          </div>
        ) : (
          <div>
            {signals.map((sig, i) => {
              const isNew = newIds.has(sig.id)
              return (
                <div
                  key={`${sig.id}-${i}`}
                  className={`flex gap-2 border-b border-[var(--border)] px-3 py-2.5 transition-all duration-150 hover:bg-[var(--surface-2)] hover:translate-x-0.5 ${isNew ? 'animate-slide-right signal-new' : 'animate-slide-in'}`}
                  style={{ animationDelay: isNew ? '0ms' : `${i * 40}ms` }}
                >
                  <div className={`mt-0.5 w-[3px] shrink-0 self-stretch rounded-full ${SEV_BAR[sig.severity] ?? SEV_BAR.LOW}`} />
                  {(() => {
                    const { icon: Icon, color } = getSignalIcon(sig.text)
                    return <Icon size={14} className="mt-0.5 shrink-0" style={{ color }} strokeWidth={2} />
                  })()}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium leading-snug text-[var(--text)]">{sig.text}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`rounded border px-1 py-px font-mono text-[8px] font-bold uppercase ${SEV_BADGE[sig.severity]}`}>
                        {sig.severity}
                      </span>
                      <span className="font-mono text-[9px] text-[var(--text-muted)]">{ago(sig.timestamp)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
