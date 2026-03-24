'use client'

import { useState } from 'react'
import { useFetch } from '@/lib/hooks/useFetch'
import type { SectorSentimentPayload, SectorSentiment } from '@/app/api/sector-sentiment/route'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function barColor(score: number): string {
  return score >= 0 ? 'var(--price-up)' : 'var(--price-down)'
}

function trendArrow(current: number, prev: number | null): { icon: string; color: string } | null {
  if (prev === null) return null
  const delta = current - prev
  if (Math.abs(delta) < 5) return null // ignore noise
  if (delta > 0) return { icon: '▲', color: 'var(--price-up)' }
  return { icon: '▼', color: 'var(--price-down)' }
}

/** Scale row bg tint opacity by both score strength and article confidence. */
function rowBg(score: number, articleCount: number): string {
  const strength = Math.min(Math.abs(score) / 80, 1)
  const confidence = Math.min(articleCount / 8, 1)
  const opacity = (strength * 0.5 + 0.05) * confidence
  const channel = score >= 0 ? 'var(--price-up-rgb)' : 'var(--price-down-rgb)'
  return `rgba(${channel}, ${opacity.toFixed(3)})`
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <div className="skeleton h-3 w-3 rounded" />
        <div className="skeleton h-3 w-44 rounded" />
      </div>
      <div className="space-y-px">
        {[85, 70, 60, 75, 55, 65].map((w, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <div className="skeleton h-3 w-[80px] rounded" />
            <div className="skeleton h-2 flex-1 rounded-full" style={{ maxWidth: `${w}%` }} />
            <div className="skeleton h-3 w-8 rounded" />
            <div className="skeleton h-3 w-12 rounded hidden sm:block" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Sector row ──────────────────────────────────────────────────────────────

function SectorRow({ sector, maxAbs }: { sector: SectorSentiment; maxAbs: number }) {
  const pct = maxAbs > 0 ? (Math.abs(sector.score) / maxAbs) * 100 : 0
  const isPositive = sector.score >= 0
  const color = barColor(sector.score)
  const trend = trendArrow(sector.score, sector.prevScore)

  return (
    <div
      className="group transition-colors duration-200"
      style={{ background: rowBg(sector.score, sector.articleCount) }}
    >
      {/* Main row */}
      <div className="flex items-center gap-2 px-3 py-2 sm:gap-3">
        {/* Sector name */}
        <span className="w-[85px] shrink-0 truncate font-mono text-[10px] font-semibold text-[var(--text)]">
          {sector.name}
        </span>

        {/* Diverging bar */}
        <div className="flex-1 flex items-center h-4 min-w-0">
          <div className="relative flex-1 h-full flex items-center">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[var(--border)] opacity-40" />
            {isPositive ? (
              <div
                className="ml-[50%] h-2.5 rounded-r transition-all duration-500"
                style={{ width: `${pct / 2}%`, background: color, opacity: 0.75 }}
              />
            ) : (
              <div
                className="h-2.5 rounded-l ml-auto transition-all duration-500"
                style={{ width: `${pct / 2}%`, background: color, opacity: 0.75, marginRight: '50%' }}
              />
            )}
          </div>
        </div>

        {/* Score */}
        <span
          className="w-[34px] shrink-0 text-right font-mono text-[10px] font-bold tabular-nums"
          style={{ color }}
        >
          {sector.score > 0 ? '+' : ''}{sector.score}
        </span>

        {/* Trend arrow */}
        <span
          className="w-[10px] shrink-0 font-mono text-[9px] tabular-nums"
          style={{ color: trend?.color ?? 'transparent' }}
        >
          {trend?.icon ?? ''}
        </span>

        {/* Article count — opacity scales with confidence */}
        <span
          className="hidden sm:block w-[48px] shrink-0 text-right font-mono text-[9px] text-[var(--text-muted)] tabular-nums"
          style={{ opacity: Math.max(0.35, Math.min(sector.articleCount / 10, 1)) }}
        >
          {sector.articleCount} art.
        </span>

        {/* Positive/negative mini badges */}
        <div className="hidden lg:flex items-center gap-1 w-[60px] shrink-0">
          {sector.positive > 0 && (
            <span className="rounded px-1 py-px font-mono text-[9px] tabular-nums" style={{ color: 'var(--price-up)', background: 'rgba(var(--price-up-rgb), 0.12)' }}>
              +{sector.positive}
            </span>
          )}
          {sector.negative > 0 && (
            <span className="rounded px-1 py-px font-mono text-[9px] tabular-nums" style={{ color: 'var(--price-down)', background: 'rgba(var(--price-down-rgb), 0.12)' }}>
              −{sector.negative}
            </span>
          )}
        </div>
      </div>

      {/* Headline — below the bar, truncated */}
      {sector.topHeadline && (
        <div className="px-3 pb-2 -mt-0.5">
          {sector.headlineUrl ? (
            <a
              href={sector.headlineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate block font-mono text-[9px] text-[var(--text-muted)] opacity-50 hover:opacity-80 hover:text-[var(--accent)] transition-all duration-150"
            >
              {sector.topHeadline}
            </a>
          ) : (
            <p className="truncate font-mono text-[9px] text-[var(--text-muted)] opacity-50">
              {sector.topHeadline}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SectorSentimentPulse() {
  const { data, loading } = useFetch<SectorSentimentPayload>('/api/sector-sentiment', {
    refreshInterval: 10 * 60_000,
  })

  const [sortByName, setSortByName] = useState(false)

  if (loading) return <Skeleton />
  if (!data || data.sectors.length === 0) return null

  const sectors = sortByName
    ? [...data.sectors].sort((a, b) => a.name.localeCompare(b.name))
    : data.sectors // already sorted by |score| from API

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
          Sector Sentiment Pulse
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />

        {/* Sort toggle */}
        <button
          onClick={() => setSortByName(p => !p)}
          className="font-mono text-[9px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          {sortByName ? 'BY NAME' : 'BY SCORE'}
        </button>

        <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-40">
          {data.totalArticles} articles
        </span>
      </div>

      {/* Sector rows */}
      <div className="divide-y divide-[var(--border)]/30">
        {sectors.map((sector) => (
          <SectorRow key={sector.name} sector={sector} maxAbs={maxAbs} />
        ))}
      </div>
    </div>
  )
}
