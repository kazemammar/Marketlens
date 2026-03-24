'use client'

import type { AssetContext, AssetContextFactor } from '@/lib/api/groq'
import type { AssetType } from '@/lib/utils/types'
import { useFetch } from '@/lib/hooks/useFetch'

// Category config
const CAT_CONFIG: Record<AssetContextFactor['category'], { label: string; color: string; bg: string }> = {
  geopolitical: { label: 'Geopolitical', color: 'var(--danger)',  bg: 'var(--danger-dim)'  },
  macro:        { label: 'Macro',        color: '#60a5fa',       bg: 'rgba(96,165,250,0.12)'  },
  sector:       { label: 'Sector',       color: '#c084fc',       bg: 'rgba(192,132,252,0.12)' },
  environmental:{ label: 'Environment',  color: 'var(--accent)', bg: 'var(--accent-dim)'  },
  sentiment:    { label: 'Sentiment',    color: '#22d3ee',       bg: 'rgba(34,211,238,0.12)'  },
  regulatory:   { label: 'Regulatory',   color: 'var(--warning)',bg: 'var(--warning-dim)' },
}

function CatIcon({ category }: { category: AssetContextFactor['category'] }) {
  const color = CAT_CONFIG[category].color
  const icons: Record<AssetContextFactor['category'], React.ReactNode> = {
    geopolitical: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden>
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M2 8h12M8 2c-2 2-3 4-3 6s1 4 3 6M8 2c2 2 3 4 3 6s-1 4-3 6" stroke="currentColor" strokeWidth="1.1"/>
      </svg>
    ),
    macro: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden>
        <path d="M2 14h12M4 10v4M8 7v7M12 4v10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    sector: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden>
        <rect x="1" y="9" width="4" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="6" y="6" width="4" height="8" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
        <rect x="11" y="3" width="4" height="11" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
    environmental: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden>
        <path d="M8 14c-4 0-6-3-4-6 1-1 2-1 3-1C7 4 9 2 12 2c1 4-1 7-4 8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M8 14V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
    sentiment: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden>
        <path d="M2 10L6 6l3 3 5-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    regulatory: (
      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0" style={{ color }} aria-hidden>
        <path d="M8 2L2 5v4c0 3.3 2.6 6 6 7 3.4-1 6-3.7 6-7V5L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M6 8l2 2 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  }
  return <>{icons[category]}</>
}

const SEV_BADGE: Record<AssetContextFactor['severity'], string> = {
  HIGH: 'text-[var(--text)] border-transparent bg-[#ff4444]',
  MED:  'text-black border-transparent bg-[#f59e0b]',
  LOW:  'border-[var(--border)] bg-transparent text-[var(--text-muted)]',
}

const SEV_CAL_COLOR: Record<'HIGH' | 'MED' | 'LOW', string> = {
  HIGH: 'text-red-400',
  MED:  'text-amber-400',
  LOW:  'text-zinc-400',
}

const IMPACT_ICON: Record<AssetContextFactor['impact'], { icon: string; color: string }> = {
  bullish: { icon: '▲', color: 'var(--price-up)' },
  bearish: { icon: '▼', color: 'var(--price-down)' },
  neutral: { icon: '—', color: 'var(--price-flat)' },
}

function ago(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

function thesisBorderColor(thesis: string): string {
  const t = thesis.toLowerCase()
  if (t.includes('long') || t.includes('bullish')) return 'var(--price-up)'
  if (t.includes('short') || t.includes('avoid') || t.includes('bearish')) return 'var(--price-down)'
  return 'var(--warning)'
}

export default function AssetContext({ symbol, type }: { symbol: string; type: AssetType }) {
  const { data, loading, error } = useFetch<AssetContext>(
    `/api/asset-context/${encodeURIComponent(symbol)}?type=${type}`,
    { refreshInterval: 30 * 60_000 },
  )

  return (
    <div className="border-b border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 mb-2.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          What&apos;s Affecting {symbol}
        </span>
        <span className="live-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        {data && (
          <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
            AI · {ago(data.analyzedAt)}
          </span>
        )}
      </div>

      {loading ? (
        <div className="bg-[var(--surface)]">
          <div className="space-y-1.5 border-b border-[var(--border)] px-4 py-3">
            <div className="skeleton h-2.5 w-full rounded" />
            <div className="skeleton h-2.5 w-4/5 rounded" />
            <div className="skeleton h-2.5 w-3/5 rounded" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 border-b border-[var(--border)] px-4 py-3">
              <div className="skeleton h-5 w-5 rounded" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-2.5 w-32 rounded" />
                <div className="skeleton h-2 w-full rounded" />
              </div>
              <div className="skeleton h-4 w-10 rounded" />
            </div>
          ))}
        </div>
      ) : error || !data || data.factors.length === 0 ? (
        <p className="bg-[var(--surface)] px-4 py-6 font-mono text-[10px] text-[var(--text-muted)]">
          {error ? 'Context analysis unavailable' : 'No context factors identified'}
        </p>
      ) : (
        <div className="bg-[var(--surface)]">
          {/* AI summary */}
          <div className="border-b border-[var(--border)] px-4 py-3">
            <p className="font-mono text-[10px] italic leading-relaxed text-[var(--text-muted)]">
              {data.summary}
            </p>
          </div>

          {/* Factor rows */}
          {data.factors.map((factor, i) => {
            const cat    = CAT_CONFIG[factor.category]
            const impact = IMPACT_ICON[factor.impact]
            return (
              <div
                key={i}
                className="flex items-start gap-3 border-b border-[var(--border)] px-4 py-3 transition hover:bg-[var(--surface-2)]"
              >
                <div
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded"
                  style={{ background: cat.bg }}
                >
                  <CatIcon category={factor.category} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-[var(--text)]">{factor.title}</span>
                    <span
                      className="rounded px-1.5 py-px font-mono text-[8px] font-bold uppercase tracking-[0.08em]"
                      style={{ background: cat.bg, color: cat.color }}
                    >
                      {cat.label}
                    </span>
                  </div>
                  <p className="font-mono text-[10px] leading-snug text-[var(--text-muted)]">
                    {factor.description}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-mono text-[14px] font-bold leading-none" style={{ color: impact.color }}>
                    {impact.icon}
                  </span>
                  <span className={`rounded border px-1 py-px font-mono text-[8px] font-bold uppercase ${SEV_BADGE[factor.severity]}`}>
                    {factor.severity}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Investment Thesis */}
          {data.thesis && (
            <div
              className="flex items-start gap-3 border-b border-[var(--border)] px-4 py-3"
              style={{ borderLeft: `3px solid ${thesisBorderColor(data.thesis)}` }}
            >
              <div className="min-w-0 flex-1">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  Thesis
                </span>
                <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-[var(--text)]">
                  {data.thesis}
                </p>
              </div>
            </div>
          )}

          {/* Competitive Position */}
          {data.competitive_position && (
            <div className="border-b border-[var(--border)] px-4 py-3">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Competitive Edge
              </span>
              <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-[var(--text-2)]">
                {data.competitive_position}
              </p>
            </div>
          )}

          {/* Catalyst Calendar */}
          {data.catalyst_calendar && data.catalyst_calendar.length > 0 && (
            <div className="px-4 py-3">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Catalysts
              </span>
              <ul className="mt-1.5 space-y-1.5">
                {data.catalyst_calendar.map((c, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className={`font-mono text-[9px] font-bold uppercase ${SEV_CAL_COLOR[c.significance]}`}>
                      ● {c.significance}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--text)]">{c.event}</span>
                    <span className="font-mono text-[10px] text-[var(--text-muted)] ml-auto shrink-0 pl-2">— {c.date}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
