'use client'

import { useEffect, useState } from 'react'
import { SentimentAnalysis, SentimentLabel, AssetType } from '@/lib/utils/types'
import { useFetch } from '@/lib/hooks/useFetch'

const LABEL_CONFIG: Record<SentimentLabel, { colorVar: string; bgVar: string; icon: string }> = {
  Bullish: { colorVar: 'var(--price-up)',   bgVar: 'rgba(var(--price-up-rgb), 0.1)', icon: '📈' },
  Bearish: { colorVar: 'var(--price-down)', bgVar: 'rgba(var(--price-down-rgb), 0.1)', icon: '📉' },
  Neutral: { colorVar: 'var(--text-muted)', bgVar: 'var(--surface-2)',                icon: '➡️' },
}

const CONVICTION_STYLE = {
  high:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  low:    'bg-zinc-500/10 text-zinc-400 border-zinc-500/25',
}


function ScoreBar({ score }: { score: number }) {
  const pos = Math.max(0, Math.min(100, score))
  const colorStyle = { background: pos >= 60 ? 'var(--price-up)' : pos <= 40 ? 'var(--price-down)' : 'var(--warning)' }
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between font-mono text-[9px] text-[var(--text-muted)]">
        <span>Bearish</span>
        <span className="font-semibold tabular-nums text-[var(--text)]">{pos}/100</span>
        <span>Bullish</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pos}%`, ...colorStyle }} />
      </div>
    </div>
  )
}

interface SentimentCardProps {
  symbol: string
  type:   AssetType
}

export default function SentimentCard({ symbol, type }: SentimentCardProps) {
  const { data, loading, error } = useFetch<SentimentAnalysis>(
    `/api/sentiment/${encodeURIComponent(symbol)}?type=${type}`,
    { refreshInterval: 30 * 60_000 },
  )
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    if (data?.analyzedAt) {
      setDateStr(new Date(data.analyzedAt).toLocaleDateString())
    }
  }, [data?.analyzedAt])

  const cfg = data ? LABEL_CONFIG[data.label] : LABEL_CONFIG.Neutral

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">AI Sentiment</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      </div>

      <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-3 space-y-3">
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
          <p className="font-mono text-[10px] text-[var(--text-muted)]">Sentiment analysis unavailable.</p>
        )}

        {data && !loading && (
          <>
            {/* Label badge + conviction badge */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-[11px] font-bold" style={{ color: cfg.colorVar, background: cfg.bgVar }}>
                <span>{cfg.icon}</span>
                {data.label}
              </span>
              {data.conviction && (
                <span className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.1em] ${CONVICTION_STYLE[data.conviction]}`}>
                  {data.conviction === 'high' ? 'High Conviction' : data.conviction === 'medium' ? 'Medium' : 'Low'}
                </span>
              )}
              <span className="font-mono text-[8px] text-[var(--text-muted)]">
                Analyzed {dateStr || '…'}
              </span>
            </div>

            {/* Score bar */}
            <ScoreBar score={data.score} />

            {/* Summary */}
            <p className="font-mono text-[10px] text-[var(--text-muted)] leading-relaxed">{data.summary}</p>

            {/* Key signals */}
            {data.keySignals.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  Key Signals
                </p>
                <ul className="space-y-1">
                  {data.keySignals.map((signal, i) => (
                    <li key={i} className="flex items-start gap-2 font-mono text-[10px] text-[var(--text)]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--accent)' }} />
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Contrarian risk */}
            {data.contrarian_risk && (
              <div className="flex items-start gap-2 rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <span className="font-mono text-[11px] text-amber-400 shrink-0">⚠</span>
                <p className="font-mono text-[10px] leading-relaxed text-amber-400/80">
                  <span className="font-bold text-amber-400">Contrarian: </span>
                  {data.contrarian_risk}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
