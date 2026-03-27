'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFetch } from '@/lib/hooks/useFetch'
import { formatCompact } from '@/lib/utils/formatters'
import type { EarningsPreviewPayload, EarningsPreviewItem } from '@/app/api/earnings-preview/route'

const CASE_STYLE = {
  bull: { label: 'BULL', color: 'var(--price-up)', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)' },
  base: { label: 'BASE', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)' },
  bear: { label: 'BEAR', color: 'var(--price-down)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)' },
} as const

function HourBadge({ hour }: { hour: string }) {
  const label = hour === 'bmo' ? 'BMO' : hour === 'amc' ? 'AMC' : hour.toUpperCase()
  const color = hour === 'bmo'
    ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
    : 'border-orange-500/40 bg-orange-500/10 text-orange-400'
  return (
    <span className={`rounded border px-1 py-px font-mono text-[8px] font-bold ${color}`}>
      {label}
    </span>
  )
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  if (dateStr === today) return 'Today'
  if (dateStr === tomorrowStr) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function PreviewCard({ preview }: { preview: EarningsPreviewItem }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] transition hover:border-[var(--accent)]/30">
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        {/* Symbol + date */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Link
            href={`/asset/stock/${preview.symbol}`}
            onClick={(e) => e.stopPropagation()}
            className="font-mono text-[13px] font-bold text-[var(--text)] hover:text-[var(--accent)] transition-colors"
          >
            {preview.symbol}
          </Link>
          <span className="font-mono text-[9px] text-[var(--text-muted)]">
            {formatDateShort(preview.date)}
          </span>
          {preview.hour && <HourBadge hour={preview.hour} />}
          <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-60">
            Q{preview.quarter}
          </span>
        </div>

        {/* Estimates */}
        <div className="hidden sm:flex items-center gap-3">
          {preview.epsEstimate !== null && (
            <span className="font-mono text-[9px] text-[var(--text-muted)]">
              EPS <span className="text-[var(--text)] font-semibold">${preview.epsEstimate.toFixed(2)}</span>
            </span>
          )}
          {preview.revenueEstimate !== null && (
            <span className="font-mono text-[9px] text-[var(--text-muted)]">
              Rev <span className="text-[var(--text)] font-semibold">${formatCompact(preview.revenueEstimate)}</span>
            </span>
          )}
        </div>

        {/* Expand arrow */}
        <svg
          viewBox="0 0 10 10"
          className={`h-2.5 w-2.5 shrink-0 text-[var(--text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
        >
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[var(--border)] px-3 py-2.5 space-y-2.5">
          {/* Key metric + why it matters */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--accent)' }}>
                Key Metric
              </span>
              <span className="font-mono text-[10px] text-[var(--text)]">
                {preview.keyMetric}
              </span>
            </div>
            {preview.whyItMatters && (
              <p className="font-mono text-[9px] text-[var(--text-muted)] leading-relaxed">
                {preview.whyItMatters}
              </p>
            )}
          </div>

          {/* Scenario table */}
          {preview.scenarios.length > 0 && (
            <div className="space-y-1">
              {preview.scenarios.map((s) => {
                const style = CASE_STYLE[s.case] ?? CASE_STYLE.base
                return (
                  <div
                    key={s.case}
                    className="flex items-start gap-2 rounded border px-2 py-1.5"
                    style={{ borderColor: style.border, background: style.bg }}
                  >
                    <span
                      className="mt-px shrink-0 rounded px-1 py-px font-mono text-[7px] font-bold uppercase tracking-[0.08em]"
                      style={{ color: style.color, background: `${style.color}1A`, border: `1px solid ${style.color}33` }}
                    >
                      {style.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] text-[var(--text-muted)]">
                          EPS {s.eps} · Rev {s.revenue}
                        </span>
                        <span className="ml-auto font-mono text-[9px] font-bold" style={{ color: style.color }}>
                          {s.stockReaction}
                        </span>
                      </div>
                      <p className="font-mono text-[9px] text-[var(--text)] leading-relaxed">
                        {s.driver}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Contrarian risk */}
          {preview.risks && (
            <div
              className="rounded border px-2 py-1.5"
              style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}
            >
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--price-down)' }}>
                Contrarian Risk
              </span>
              <p className="mt-0.5 font-mono text-[9px] text-[var(--text)] leading-relaxed">
                {preview.risks}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 rounded border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
      <div className="skeleton h-3 w-12 rounded" />
      <div className="skeleton h-2 w-16 rounded" />
      <div className="skeleton h-2 w-8 rounded" />
      <div className="flex-1" />
      <div className="skeleton h-2 w-14 rounded" />
      <div className="skeleton h-2 w-14 rounded" />
    </div>
  )
}

export default function EarningsPreview() {
  const { data, loading } = useFetch<EarningsPreviewPayload>('/api/earnings-preview', {
    refreshInterval: 60 * 60_000, // 1h
  })

  const previews = data?.previews ?? []

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <path d="M4 2v12M12 2v12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M2 6h12M2 10h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Earnings Preview
        </span>
        <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
          AI-generated · 12H cache
        </span>
      </div>

      {/* Content */}
      <div className="p-3 space-y-1.5">
        {loading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </>
        ) : previews.length === 0 ? (
          <p className="py-6 text-center font-mono text-[10px] text-[var(--text-muted)]">
            No notable earnings in the next 7 days
          </p>
        ) : (
          <>
            <p className="font-mono text-[9px] text-[var(--text-muted)] opacity-60 pb-1">
              Click to expand bull/base/bear scenarios · Next 7 days
            </p>
            {previews.map((p) => (
              <PreviewCard key={p.symbol} preview={p} />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
