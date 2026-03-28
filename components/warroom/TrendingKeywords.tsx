'use client'

import { TrendingUp } from 'lucide-react'
import { useFetch }   from '@/lib/hooks/useFetch'
import { timeAgo }    from '@/lib/utils/timeago'
import type { TrendingPayload, TrendingKeyword } from '@/lib/utils/trending-keywords'

// ─── Severity styles ──────────────────────────────────────────────────────

const SEV_DOT: Record<string, string> = {
  HIGH: 'bg-[var(--price-down)]',
  MED:  'bg-[var(--warning)]',
  LOW:  'bg-[var(--border)]',
}

const SEV_TEXT: Record<string, string> = {
  HIGH: 'text-[var(--price-down)]',
  MED:  'text-[var(--warning)]',
  LOW:  'text-[var(--text-muted)]',
}

// ─── Spike badge ──────────────────────────────────────────────────────────

function SpikeBadge({ spike, severity }: { spike: number; severity: TrendingKeyword['severity'] }) {
  const cls = severity === 'HIGH'
    ? 'text-[var(--price-down)] bg-[var(--danger-dim)] border-transparent'
    : severity === 'MED'
    ? 'text-[var(--warning)] bg-[var(--warning-dim)] border-transparent'
    : 'text-[var(--text-muted)] bg-[var(--surface-2)] border-[var(--border)]'

  return (
    <span className={`rounded border px-1.5 py-px font-mono text-[8px] font-bold tabular-nums ${cls}`}>
      {spike >= 10 ? `${Math.round(spike)}×` : `${spike.toFixed(1)}×`}
    </span>
  )
}

// ─── Single keyword row ───────────────────────────────────────────────────

function KeywordRow({ kw, rank }: { kw: TrendingKeyword; rank: number }) {
  const isHigh = kw.severity === 'HIGH'
  return (
    <div className={`group flex items-center gap-3 border-b border-[var(--border)] px-4 py-2 hover:bg-[var(--surface-2)] transition-colors ${isHigh ? 'bg-[var(--danger-dim)]' : ''}`}>
      {/* rank */}
      <span className="w-4 shrink-0 font-mono text-[9px] tabular-nums text-[var(--text-muted)] opacity-40">
        {rank}
      </span>

      {/* severity dot */}
      <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${SEV_DOT[kw.severity] ?? SEV_DOT.LOW}`} />

      {/* keyword + sample headline */}
      <div className="min-w-0 flex-1">
        <p className={`font-mono text-[10px] font-bold uppercase tracking-wide ${SEV_TEXT[kw.severity] ?? SEV_TEXT.LOW}`}>
          {kw.keyword}
        </p>
        <p className="truncate font-mono text-[9px] text-[var(--text-muted)] opacity-60">
          {kw.sampleHeadline}
        </p>
      </div>

      {/* right meta */}
      <div className="flex shrink-0 items-center gap-2">
        {/* sources count */}
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
          {kw.sources.length} src
        </span>

        {/* mentions */}
        <span className="font-mono text-[8px] tabular-nums text-[var(--text-muted)] opacity-50">
          {kw.currentCount}×
        </span>

        {/* spike ratio */}
        <SpikeBadge spike={kw.spike} severity={kw.severity} />

        {/* first seen */}
        <span className="w-10 text-right font-mono text-[8px] tabular-nums text-[var(--text-muted)] opacity-40" suppressHydrationWarning>
          {timeAgo(kw.firstSeen)}
        </span>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────

export default function TrendingKeywords() {
  const { data, loading } = useFetch<TrendingPayload>('/api/trending', { refreshInterval: 5 * 60_000 })

  const keywords = data?.keywords ?? []

  return (
    <div className="flex flex-col overflow-hidden rounded border border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={10} style={{ color: 'var(--accent)' }} strokeWidth={2.5} />
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
            Trending Keywords
          </span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        <div className="flex items-center gap-2">
          <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
            {keywords.length} trending
          </span>
          {data?.generatedAt && data.generatedAt > 0 && (
            <span className="font-mono text-[8px] tabular-nums text-[var(--text-muted)] opacity-40" suppressHydrationWarning>
              {timeAgo(data.generatedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="divide-y divide-[var(--border)]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2">
              <div className="skeleton h-2 w-4 rounded" />
              <div className="skeleton h-1.5 w-1.5 rounded-full" />
              <div className="flex-1 space-y-1">
                <div className="skeleton h-2.5 w-24 rounded" />
                <div className="skeleton h-2 w-full max-w-xs rounded" />
              </div>
              <div className="flex items-center gap-2">
                <div className="skeleton h-2 w-8 rounded" />
                <div className="skeleton h-2 w-6 rounded" />
                <div className="skeleton h-4 w-8 rounded" />
                <div className="skeleton h-2 w-8 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : keywords.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          <TrendingUp size={24} className="text-[var(--text-muted)] opacity-20" />
          <p className="font-mono text-[10px] text-[var(--text-muted)]">No trending keywords</p>
          <p className="font-mono text-[9px] text-[var(--text-muted)] opacity-40">
            Keywords appear when a topic spikes 2× above its baseline
          </p>
        </div>
      ) : (
        <div>
          {keywords.map((kw, i) => (
            <KeywordRow key={kw.keyword} kw={kw} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
