'use client'

import { useFetch } from '@/lib/hooks/useFetch'

interface SectorSentiment {
  name: string
  score: number
  articleCount: number
  topHeadline: string
}

interface SentimentPayload {
  sectors: SectorSentiment[]
  generatedAt: number
}

export default function NewsSentimentMap() {
  const { data, loading } = useFetch<SentimentPayload>('/api/news-sentiment', { refreshInterval: 10 * 60_000 })

  if (loading) {
    return (
      <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
          <div className="skeleton h-3 w-3 rounded" />
          <div className="skeleton h-3 w-40 rounded" />
        </div>
        <div className="px-3 py-3 space-y-2">
          {[75, 90, 65, 80, 70, 85].map((w, i) => (
            <div key={i} className="skeleton h-5 rounded" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.sectors.length === 0) return null

  const maxAbs = Math.max(...data.sectors.map(s => Math.abs(s.score)), 1)

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <rect x="1" y="4" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.4"/>
          <rect x="5" y="2" width="3" height="10" rx="0.5" fill="currentColor" opacity="0.6"/>
          <rect x="9" y="6" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.8"/>
          <rect x="13" y="1" width="2" height="11" rx="0.5" fill="currentColor"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          News Sentiment by Sector
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-40">
          {data.sectors.reduce((s, x) => s + x.articleCount, 0)} articles analyzed
        </span>
      </div>

      {/* Bars */}
      <div className="px-3 py-2.5 space-y-1.5">
        {data.sectors.map((sector) => {
          const pct = (Math.abs(sector.score) / maxAbs) * 100
          const isPositive = sector.score >= 0
          const barColor = isPositive ? 'var(--price-up)' : 'var(--price-down)'

          return (
            <div key={sector.name}>
              <div className="flex items-center gap-2">
                <span className="w-[90px] shrink-0 truncate font-mono text-[9px] font-semibold text-[var(--text)]">
                  {sector.name}
                </span>
                <div className="flex-1 flex items-center h-4">
                  {/* Center line */}
                  <div className="relative flex-1 h-full flex items-center">
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[var(--border)]" />
                    {isPositive ? (
                      <div className="ml-[50%] h-2.5 rounded-r" style={{ width: `${pct / 2}%`, background: barColor, opacity: 0.7 }} />
                    ) : (
                      <div className="h-2.5 rounded-l ml-auto" style={{ width: `${pct / 2}%`, background: barColor, opacity: 0.7, marginRight: '50%' }} />
                    )}
                  </div>
                </div>
                <span
                  className="w-[32px] shrink-0 text-right font-mono text-[9px] font-bold tabular-nums"
                  style={{ color: barColor }}
                >
                  {sector.score > 0 ? '+' : ''}{sector.score}
                </span>
              </div>
              {sector.topHeadline && (
                <p className="ml-[90px] pl-2 truncate font-mono text-[9px] text-[var(--text-muted)] opacity-50">
                  {sector.topHeadline}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
