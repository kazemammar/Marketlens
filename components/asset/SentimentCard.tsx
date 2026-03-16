'use client'

import { useEffect, useState } from 'react'
import { SentimentAnalysis, SentimentLabel, AssetType } from '@/lib/utils/types'

const LABEL_CONFIG: Record<SentimentLabel, { color: string; bg: string; icon: string }> = {
  Bullish: { color: 'text-green-500', bg: 'bg-green-500/10', icon: '📈' },
  Bearish: { color: 'text-red-500',   bg: 'bg-red-500/10',   icon: '📉' },
  Neutral: { color: 'text-slate-400', bg: 'bg-slate-500/10', icon: '➡️' },
}

function ScoreBar({ score }: { score: number }) {
  const pos = Math.max(0, Math.min(100, score))
  const color = pos >= 60 ? 'bg-green-500' : pos <= 40 ? 'bg-red-500' : 'bg-yellow-400'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>Bearish</span>
        <span className="font-medium tabular-nums text-[var(--text)]">{pos}/100</span>
        <span>Bullish</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pos}%` }} />
      </div>
    </div>
  )
}

interface SentimentCardProps {
  symbol: string
  type:   AssetType
}

export default function SentimentCard({ symbol, type }: SentimentCardProps) {
  const [data,    setData]    = useState<SentimentAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/sentiment/${encodeURIComponent(symbol)}?type=${type}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json() as SentimentAnalysis
        setData(json)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [symbol, type])

  const cfg = data ? LABEL_CONFIG[data.label] : LABEL_CONFIG.Neutral

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">AI Sentiment</h2>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4">
        {loading && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-24 animate-pulse rounded-full bg-[var(--surface-2)]" />
              <div className="h-4 w-48 animate-pulse rounded bg-[var(--surface-2)]" />
            </div>
            <div className="h-2 w-full animate-pulse rounded-full bg-[var(--surface-2)]" />
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-[var(--surface-2)]" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-[var(--surface-2)]" />
            </div>
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-[var(--text-muted)]">Sentiment analysis unavailable.</p>
        )}

        {data && !loading && (
          <>
            {/* Label badge */}
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${cfg.color} ${cfg.bg}`}>
                <span>{cfg.icon}</span>
                {data.label}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                Analyzed {new Date(data.analyzedAt).toLocaleDateString()}
              </span>
            </div>

            {/* Score bar */}
            <ScoreBar score={data.score} />

            {/* Summary */}
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">{data.summary}</p>

            {/* Key signals */}
            {data.keySignals.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Key Signals
                </p>
                <ul className="space-y-1">
                  {data.keySignals.map((signal, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text)]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
