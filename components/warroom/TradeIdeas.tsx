'use client'

import Link from 'next/link'
import { useFetch } from '@/lib/hooks/useFetch'
import type { TradeIdea } from '@/app/api/trade-ideas/route'

const DIR_STYLE = {
  long:  { bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)',  color: 'var(--price-up)',   label: 'LONG' },
  short: { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)',  color: 'var(--price-down)', label: 'SHORT' },
  hedge: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', color: 'var(--warning)',     label: 'HEDGE' },
}

const CONF_STYLE = {
  HIGH:   { bg: 'rgba(34,197,94,0.1)',  color: 'var(--price-up)' },
  MEDIUM: { bg: 'rgba(245,158,11,0.1)', color: 'var(--warning)' },
  LOW:    { bg: 'rgba(148,163,184,0.1)', color: 'var(--text-muted)' },
}

export default function TradeIdeas() {
  const { data, loading } = useFetch<{ ideas: TradeIdea[]; generatedAt: number }>(
    '/api/trade-ideas',
    { refreshInterval: 60 * 60_000 },
  )

  const ideas = data?.ideas ?? []

  return (
    <div className="rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" style={{ color: 'var(--accent)' }} aria-hidden>
          <path d="M8 1l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z" fill="currentColor" />
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          AI Trade Ideas
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-[var(--border)] to-transparent" />
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
          Groq AI · Refreshed hourly
        </span>
      </div>

      {/* Cards */}
      <div className="p-2">
        {loading ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="space-y-2 rounded border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="flex gap-2">
                  <div className="skeleton h-4 w-14 rounded" />
                  <div className="skeleton h-4 w-12 rounded" />
                </div>
                <div className="skeleton h-5 w-16 rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-4/5 rounded" />
              </div>
            ))}
          </div>
        ) : ideas.length === 0 ? (
          <p className="py-6 text-center font-mono text-[10px] text-[var(--text-muted)]">
            Trade ideas generating — check back shortly
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {ideas.map((idea, i) => {
              const dir = DIR_STYLE[idea.direction] ?? DIR_STYLE.long
              const conf = CONF_STYLE[idea.confidence] ?? CONF_STYLE.MEDIUM
              return (
                <div
                  key={i}
                  className="flex flex-col rounded border border-[var(--border)] bg-[var(--surface-2)] p-3"
                >
                  {/* Top row: direction + confidence */}
                  <div className="mb-2 flex items-center justify-between">
                    <span
                      className="rounded px-2 py-0.5 font-mono text-[9px] font-bold"
                      style={{ background: dir.bg, color: dir.color, border: `1px solid ${dir.border}` }}
                    >
                      {dir.label}
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[8px] font-bold"
                      style={{ background: conf.bg, color: conf.color }}
                    >
                      {idea.confidence}
                    </span>
                  </div>

                  {/* Ticker */}
                  <Link
                    href={`/asset/stock/${idea.symbol}`}
                    className="mb-1.5 font-mono text-base font-bold text-[var(--text)] hover:text-[var(--accent)] hover:underline"
                  >
                    {idea.symbol}
                  </Link>

                  {/* Thesis */}
                  <p className="mb-2 text-[11px] leading-relaxed text-[var(--text)]">
                    {idea.thesis}
                  </p>

                  {/* Catalyst */}
                  <div className="mb-1.5">
                    <span className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                      Catalyst
                    </span>
                    <p className="font-mono text-[10px] text-[var(--text-muted)] leading-relaxed">
                      {idea.catalyst}
                    </p>
                  </div>

                  {/* Risk */}
                  <div className="mb-2">
                    <span className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--price-down)]">
                      Risk
                    </span>
                    <p className="font-mono text-[10px] text-[var(--text-muted)] leading-relaxed">
                      {idea.risk}
                    </p>
                  </div>

                  {/* Timeframe */}
                  <div className="mt-auto">
                    <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-[8px] text-[var(--text-muted)]">
                      {idea.timeframe}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Disclaimer */}
        <p className="mt-2 font-mono text-[8px] text-[var(--text-muted)] opacity-40 text-center">
          AI-generated ideas for educational purposes only. Not financial advice.
        </p>
      </div>
    </div>
  )
}
