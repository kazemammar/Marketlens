'use client'

import { useEffect, useRef, useState } from 'react'
import { Flame, TrendingUp, TrendingDown, AlertTriangle, ArrowLeftRight, Shield, Fuel, Activity, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Signal } from '@/app/api/signals/route'
import { useFetch } from '@/lib/hooks/useFetch'
import { timeAgo, stalenessColor } from '@/lib/utils/timeago'

const SEV_BAR: Record<string, string> = {
  HIGH: 'bg-[var(--price-down)]',
  MED:  'bg-[var(--warning)]',
  LOW:  'bg-[var(--border)]',
}

const SEV_BADGE: Record<string, string> = {
  HIGH: 'text-white border-transparent bg-[var(--price-down)]',
  MED:  'text-black border-transparent bg-[var(--warning)]',
  LOW:  'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]',
}

function getSignalIcon(text: string, category: Signal['category']): { icon: LucideIcon; color: string } {
  if (category === 'correlation') return { icon: Zap, color: '#f59e0b' }
  const t = text.toLowerCase()
  if (/oil|crude|wti|brent|opec|petroleum/.test(t))       return { icon: Flame,          color: '#f97316' }
  if (/war|military|conflict|geopolit|sanction|attack/.test(t)) return { icon: Shield,   color: 'var(--price-down)' }
  if (/vix|volatil|fear/.test(t))                          return { icon: AlertTriangle,  color: '#f59e0b' }
  if (/forex|currency|dollar|yen|euro|pound|yuan|fx/.test(t))  return { icon: ArrowLeftRight, color: '#22d3ee' }
  if (/gas|wheat|corn|commodity|natural gas|copper/.test(t))   return { icon: Fuel,      color: '#eab308' }
  if (/-\d|\bdown\b|sell|drop|fall|crash|decline/.test(t)) return { icon: TrendingDown,  color: 'var(--price-down)' }
  if (/\+\d|\bup\b|buy|rise|rally|surge|gain/.test(t))    return { icon: TrendingUp,     color: 'var(--price-up)' }
  return { icon: Activity, color: 'var(--accent)' }
}

// Category filter
type CatFilter = 'all' | 'price' | 'news' | 'correlation'

const FILTER_LABELS: Record<CatFilter, string> = {
  all:         'ALL',
  price:       'PRICE',
  news:        'NEWS',
  correlation: '⚡',
}

const CAT_LABEL: Record<string, string> = {
  price:       'PRICE',
  news:        'NEWS',
  technical:   'TECH',
  macro:       'MACRO',
  correlation: '⚡',
}

const CAT_COLOR: Record<string, string> = {
  price:       'text-[var(--accent)] bg-[var(--accent-dim)]',
  news:        'text-blue-400 bg-blue-500/10',
  technical:   'text-purple-400 bg-purple-500/10',
  macro:       'text-amber-400 bg-amber-500/10',
  correlation: 'text-amber-400 bg-amber-500/10',
}

// ─── Explanation badges ───────────────────────────────────────────────────

function ExplanationBadges({ sig }: { sig: Signal }) {
  if (!sig.explanation) return null

  if (sig.explanation.type === 'explained' && sig.explanation.sourceCount > 1) {
    return (
      <span className="ml-1 inline-flex shrink-0 items-center rounded bg-[var(--surface-2)] px-1 py-px font-mono text-[8px] text-[var(--text-muted)]">
        +{sig.explanation.sourceCount - 1} sources
      </span>
    )
  }

  if (sig.explanation.type === 'silent_divergence') {
    return (
      <span className="ml-1 inline-flex shrink-0 items-center rounded border border-amber-500/20 bg-amber-500/10 px-1 py-px font-mono text-[8px] font-bold text-amber-400">
        UNEXPLAINED
      </span>
    )
  }

  return null
}

// ─── Single signal row (horizontal layout) ────────────────────────────────

function SignalRow({ sig, isNew }: { sig: Signal; isNew: boolean }) {
  const { icon: Icon, color } = getSignalIcon(sig.text, sig.category)
  const isHigh = sig.severity === 'HIGH'
  return (
    <div
      className={`group flex items-start gap-3 border-b border-[var(--border)] px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)] ${isHigh ? 'bg-[var(--danger-dim)]' : ''} ${isNew ? 'signal-new' : ''}`}
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
      {/* Signal text + explanation badges */}
      <p className={`flex-1 font-mono leading-snug ${isHigh ? 'text-[11px] font-semibold text-[var(--text)]' : 'text-[10px] font-medium text-[var(--text-2)]'}`}>
        {sig.text}
        <ExplanationBadges sig={sig} />
      </p>
      {/* Right meta */}
      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        <span className={`rounded px-1.5 py-px font-mono text-[8px] font-bold uppercase ${CAT_COLOR[sig.category] ?? CAT_COLOR.news}`}>
          {CAT_LABEL[sig.category] ?? sig.category}
        </span>
        <span className={`rounded border px-1.5 py-px font-mono text-[8px] font-bold uppercase ${SEV_BADGE[sig.severity]}`}>
          {sig.severity}
        </span>
        <span className="w-10 text-right font-mono text-[8px] tabular-nums text-[var(--text-muted)] opacity-50" suppressHydrationWarning>
          {timeAgo(sig.timestamp)}
        </span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────

export default function SignalsPanel({ layout = 'vertical' }: { layout?: 'vertical' | 'horizontal' }) {
  const { data: raw, loading } = useFetch<Signal[]>('/api/signals', { refreshInterval: 5 * 60_000 })
  const signals = raw ?? []

  const [newIds,    setNewIds]    = useState<Set<string>>(new Set())
  const prevIds   = useRef<Set<string>>(new Set())
  const [filter,   setFilter]    = useState<CatFilter>('all')
  const [updatedAt, setUpdatedAt] = useState(0)
  const prevRaw   = useRef<Signal[] | null>(null)

  useEffect(() => {
    if (raw && raw !== prevRaw.current) {
      prevRaw.current = raw
      setUpdatedAt(raw.length > 0 ? Math.max(...raw.map((s) => s.timestamp)) : 0)
    }
  }, [raw])

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
    const correlationCount = signals.filter(s => s.category === 'correlation').length

    return (
      <div className="flex flex-col overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-2">
          <div className="flex items-center gap-1.5">
            <span className="live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
              Live Signals
            </span>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />

          <div className="flex items-center gap-2">
            {/* Filter tabs */}
            <div className="flex items-center gap-px">
              {(['all', 'price', 'news', 'correlation'] as CatFilter[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  aria-label={`Filter signals: ${cat}`}
                  aria-pressed={filter === cat}
                  className={`relative rounded px-2 py-px font-mono text-[8px] font-bold uppercase transition-colors ${
                    filter === cat
                      ? 'bg-[var(--accent)] text-[var(--bg)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {FILTER_LABELS[cat]}
                  {/* Badge for unread correlation signals */}
                  {cat === 'correlation' && correlationCount > 0 && filter !== 'correlation' && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2 items-center justify-center rounded-full bg-amber-500 font-mono text-[6px] text-black">
                      {correlationCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <span className="h-3 w-px bg-[var(--border)] opacity-50" />
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

        {/* Signal feed */}
        {loading ? (
          <div className="divide-y divide-[var(--border)]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className="skeleton h-3.5 w-3.5 shrink-0 rounded" />
                <div className="skeleton h-3 flex-1 rounded" />
                <div className="flex shrink-0 items-center gap-2">
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
    <div className="flex h-full flex-col overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
            Signals
          </span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
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
              const { icon: Icon, color } = getSignalIcon(sig.text, sig.category)
              return (
                <div
                  key={`${sig.id}-${i}`}
                  className={`flex gap-2 border-b border-[var(--border)] px-3 py-2.5 transition-all duration-150 hover:bg-[var(--surface-2)] hover:translate-x-0.5 ${isNew ? 'animate-slide-right signal-new' : 'animate-slide-in'}`}
                  style={{ animationDelay: isNew ? '0ms' : `${i * 40}ms` }}
                >
                  <div className={`mt-0.5 w-[3px] shrink-0 self-stretch rounded-full ${SEV_BAR[sig.severity] ?? SEV_BAR.LOW}`} />
                  <Icon size={14} className="mt-0.5 shrink-0" style={{ color }} strokeWidth={2} />
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] font-medium leading-snug text-[var(--text)]">
                      {sig.text}
                      <ExplanationBadges sig={sig} />
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`rounded border px-1 py-px font-mono text-[8px] font-bold uppercase ${SEV_BADGE[sig.severity]}`}>
                        {sig.severity}
                      </span>
                      <span className="font-mono text-[9px] text-[var(--text-muted)]" suppressHydrationWarning>
                        {timeAgo(sig.timestamp)}
                      </span>
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
