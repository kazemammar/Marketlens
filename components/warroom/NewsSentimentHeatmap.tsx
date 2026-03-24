'use client'

import { useFetch } from '@/lib/hooks/useFetch'

interface SectorEntry {
  name: string
  positive: number
  negative: number
  neutral: number
  total: number
}

interface Payload {
  sectors: SectorEntry[]
  generatedAt: number
}

function tileColor(s: SectorEntry): string {
  const net = s.positive - s.negative
  if (net > 2)  return 'rgba(var(--price-up-rgb), 0.55)'
  if (net > 0)  return 'rgba(var(--price-up-rgb), 0.22)'
  if (net < -2) return 'rgba(var(--price-down-rgb), 0.55)'
  if (net < 0)  return 'rgba(var(--price-down-rgb), 0.22)'
  return 'var(--surface-2)'
}

function sentimentLabel(s: SectorEntry): { text: string; color: string } {
  const net = s.positive - s.negative
  if (net > 0) return { text: `+${net}`, color: 'var(--price-up)' }
  if (net < 0) return { text: `${net}`, color: 'var(--price-down)' }
  return { text: '0', color: 'var(--text-muted)' }
}

export default function NewsSentimentHeatmap() {
  const { data, loading } = useFetch<Payload>('/api/news-sentiment-heatmap', { refreshInterval: 10 * 60_000 })

  if (loading) {
    return (
      <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
          <div className="skeleton h-3 w-3 rounded" />
          <div className="skeleton h-3 w-44 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-[var(--border)] p-px">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-14 bg-[var(--surface)]" />
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.sectors.every((s) => s.total === 0)) return null

  const active = data.sectors.filter((s) => s.total > 0)

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <rect x="1" y="1" width="6" height="6" rx="0.5" fill="currentColor" opacity="0.3" />
          <rect x="9" y="1" width="6" height="6" rx="0.5" fill="currentColor" opacity="0.7" />
          <rect x="1" y="9" width="6" height="6" rx="0.5" fill="currentColor" opacity="0.5" />
          <rect x="9" y="9" width="6" height="6" rx="0.5" fill="currentColor" opacity="0.9" />
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          News Sentiment by Sector
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-[var(--border)] p-px">
        {active.map((s) => {
          const { text, color } = sentimentLabel(s)
          return (
            <div
              key={s.name}
              className="flex flex-col items-center justify-center px-2 py-3"
              style={{ background: tileColor(s) }}
            >
              <span className="font-mono text-[10px] font-bold text-[var(--text)] truncate max-w-full">
                {s.name}
              </span>
              <span className="mt-0.5 font-mono text-[10px] font-bold tabular-nums" style={{ color }}>
                {text}
              </span>
              <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-60">
                {s.total} mention{s.total !== 1 ? 's' : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
