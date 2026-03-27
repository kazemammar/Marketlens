'use client'

import { useEffect, useState, useCallback } from 'react'
import { SentimentAnalysis, SentimentLabel, AssetType } from '@/lib/utils/types'
import { useFetch } from '@/lib/hooks/useFetch'
import type { StocktwitsSentiment } from '@/lib/api/stocktwits'

interface SocialPulseData {
  reddit:  { mention: number; positiveScore: number; negativeScore: number; score: number }[]
  twitter: { mention: number; positiveScore: number; negativeScore: number; score: number }[]
}

const LABEL_CONFIG: Record<SentimentLabel, { colorVar: string; bgVar: string; icon: string }> = {
  Bullish: { colorVar: 'var(--price-up)',   bgVar: 'rgba(var(--price-up-rgb), 0.1)', icon: '📈' },
  Bearish: { colorVar: 'var(--price-down)', bgVar: 'rgba(var(--price-down-rgb), 0.1)', icon: '📉' },
  Neutral: { colorVar: 'var(--text-muted)', bgVar: 'var(--surface-2)',                icon: '➡️' },
}

const CONVICTION_STYLE = {
  high:   'bg-[rgba(var(--price-up-rgb),0.1)] text-[var(--price-up)] border-[rgba(var(--price-up-rgb),0.25)]',
  medium: 'bg-[var(--warning-dim)] text-[var(--warning)] border-[rgba(var(--warning-rgb,245,158,11),0.25)]',
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

function SocialPulse({ symbol, type }: { symbol: string; type: AssetType }) {
  const [social, setSocial] = useState<SocialPulseData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchSocial = useCallback(() => {
    if (type !== 'stock') return
    setLoading(true)
    fetch(`/api/stock/social-sentiment/${encodeURIComponent(symbol)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setSocial(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [symbol, type])

  useEffect(() => { fetchSocial() }, [fetchSocial])

  if (type !== 'stock') return null

  const redditMentions  = social?.reddit?.reduce((s, d) => s + (d.mention ?? 0), 0) ?? 0
  const twitterMentions = social?.twitter?.reduce((s, d) => s + (d.mention ?? 0), 0) ?? 0
  const redditScore     = social?.reddit?.length
    ? social.reddit.reduce((s, d) => s + (d.score ?? 0), 0) / social.reddit.length
    : 0
  const twitterScore    = social?.twitter?.length
    ? social.twitter.reduce((s, d) => s + (d.score ?? 0), 0) / social.twitter.length
    : 0

  if (!loading && !social) return null
  if (!loading && redditMentions === 0 && twitterMentions === 0) return null

  return (
    <div className="space-y-2">
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        Social Pulse <span className="opacity-50">(7 days)</span>
      </p>
      {loading ? (
        <div className="flex gap-2">
          <div className="skeleton h-10 flex-1 rounded" />
          <div className="skeleton h-10 flex-1 rounded" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Reddit',  mentions: redditMentions,  score: redditScore },
            { label: 'Twitter', mentions: twitterMentions, score: twitterScore },
          ].map((platform) => (
            <div
              key={platform.label}
              className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2"
            >
              <p className="font-mono text-[9px] font-semibold text-[var(--text-muted)]">{platform.label}</p>
              <p className="font-mono text-[13px] font-bold tabular-nums text-[var(--text)]">
                {platform.mentions.toLocaleString()}
                <span className="ml-1 text-[9px] font-normal text-[var(--text-muted)]">mentions</span>
              </p>
              {platform.score !== 0 && (
                <p
                  className="font-mono text-[9px] font-semibold tabular-nums"
                  style={{ color: platform.score > 0 ? 'var(--price-up)' : platform.score < 0 ? 'var(--price-down)' : 'var(--text-muted)' }}
                >
                  Sentiment: {platform.score > 0 ? '+' : ''}{platform.score.toFixed(2)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StocktwitsPulse({ symbol }: { symbol: string }) {
  const { data } = useFetch<StocktwitsSentiment>(
    `/api/social/sentiment/${encodeURIComponent(symbol)}`,
    { refreshInterval: 10 * 60_000 },
  )

  if (!data || data.totalMessages === 0) return null

  const total = data.bullish + data.bearish
  const bullPct = total > 0 ? (data.bullish / total) * 100 : 50

  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        Stocktwits Pulse <span className="opacity-50">({data.totalMessages} messages)</span>
      </p>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] font-bold tabular-nums text-[var(--price-up)]">
          {data.bullish}
        </span>
        <div className="flex-1 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div className="flex h-full">
            <div
              className="h-full rounded-l-full transition-all duration-500"
              style={{ width: `${bullPct}%`, background: 'var(--price-up)' }}
            />
            <div
              className="h-full rounded-r-full transition-all duration-500"
              style={{ width: `${100 - bullPct}%`, background: 'var(--price-down)' }}
            />
          </div>
        </div>
        <span className="font-mono text-[10px] font-bold tabular-nums text-[var(--price-down)]">
          {data.bearish}
        </span>
      </div>
      <div className="flex items-center justify-between font-mono text-[8px] text-[var(--text-muted)]">
        <span>Bullish</span>
        <span>Bearish</span>
      </div>
    </div>
  )
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
              <div className="flex items-start gap-2 rounded border border-[var(--warning)]/20 bg-[var(--warning-dim)] px-3 py-2">
                <span className="font-mono text-[11px] text-[var(--warning)] shrink-0">⚠</span>
                <p className="font-mono text-[10px] leading-relaxed text-[var(--warning)] opacity-80">
                  <span className="font-bold text-[var(--warning)]">Contrarian: </span>
                  {data.contrarian_risk}
                </p>
              </div>
            )}

            {/* Social Pulse */}
            <SocialPulse symbol={symbol} type={type} />

            {/* Stocktwits Pulse */}
            <StocktwitsPulse symbol={symbol} />
          </>
        )}
      </div>
    </section>
  )
}
