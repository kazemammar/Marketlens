'use client'

import type { MarketRiskPayload } from '@/app/api/market-risk/route'
import { useFetch } from '@/lib/hooks/useFetch'

// ─── Constants ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { abbr: 'GEO', key: 'geopolitical' as const, color: '#ef4444' },
  { abbr: 'MKT', key: 'market'       as const, color: '#f59e0b' },
  { abbr: 'MCR', key: 'macro'        as const, color: '#8b5cf6' },
  { abbr: 'CMD', key: 'commodity'    as const, color: '#3b82f6' },
]

// Bar fills relative to a soft max of 50 (not 100) so bars show meaningful width at typical scores
const BAR_MAX = 50

function scoreColor(score: number): string {
  if (score >= 75) return '#ef4444'
  if (score >= 55) return '#f97316'
  if (score >= 35) return '#f59e0b'
  return '#22c55e'
}

function scoreLabel(level: string): string {
  const map: Record<string, string> = {
    LOW: 'LOW RISK', MODERATE: 'MODERATE RISK', HIGH: 'ELEVATED RISK', CRITICAL: 'CRITICAL RISK',
  }
  return map[level] ?? level
}

const TREND_META = {
  RISING: { arrow: '↑', label: 'RISING', color: '#ef4444' },
  STABLE: { arrow: '→', label: 'STABLE', color: '#f59e0b' },
  EASING: { arrow: '↓', label: 'EASING', color: '#10b981' },
}

// ─── Component ────────────────────────────────────────────────────────────

export default function RiskGauge() {
  const { data, loading } = useFetch<MarketRiskPayload>('/api/market-risk', { refreshInterval: 2 * 60_000 })

  // ── Skeleton ──
  if (loading) {
    return (
      <div className="flex h-full flex-col p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="skeleton h-3 w-3 rounded" />
          <div className="skeleton h-2.5 w-20 rounded" />
        </div>
        {/* Ring skeleton */}
        <div className="mb-3 flex flex-col items-center gap-2">
          <div className="skeleton h-[100px] w-[100px] rounded-full" />
          <div className="skeleton h-2.5 w-24 rounded" />
        </div>
        {/* Bar skeletons */}
        <div className="mb-3 space-y-1.5">
          {CATEGORIES.map((c) => (
            <div key={c.abbr} className="flex items-center gap-2">
              <div className="skeleton h-2 w-7 rounded" />
              <div className="skeleton flex-1 h-2 rounded-full" />
              <div className="skeleton h-2 w-5 rounded" />
            </div>
          ))}
        </div>
        {/* Factors skeleton */}
        <div className="mb-2 space-y-1">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-2.5 w-full rounded" />)}
        </div>
        <div className="mt-auto skeleton h-2.5 w-32 rounded" />
      </div>
    )
  }

  // ── No data ──
  if (!data) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 gap-2">
        <span className="text-2xl opacity-20">⚠</span>
        <p className="font-mono text-[10px] text-[var(--text-muted)] opacity-50 text-center">
          Run market brief to generate risk score
        </p>
      </div>
    )
  }

  const color = scoreColor(data.score)
  const label = scoreLabel(data.level)
  const trend = TREND_META[data.trend] ?? TREND_META.STABLE

  // Ring math: r=42, circumference = 2π×42 ≈ 263.9
  const R    = 42
  const circ = 2 * Math.PI * R
  const arc  = (data.score / 100) * circ

  // Factors: use API factors or fall back to top categories by score
  const factors: string[] = data.factors?.length
    ? data.factors.slice(0, 3)
    : CATEGORIES
        .slice()
        .sort((a, b) => (data.breakdown[b.key] ?? 0) - (data.breakdown[a.key] ?? 0))
        .slice(0, 3)
        .map((c) => `${c.abbr} risk elevated at ${data.breakdown[c.key] ?? 0}`)

  return (
    <div className="flex h-full flex-col p-4">

      {/* ── Header ── */}
      <div className="mb-3 flex items-center gap-1.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0 text-amber-500" aria-hidden>
          <path d="M2 14L8 2l6 12H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <line x1="8" y1="7" x2="8" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <circle cx="8" cy="12" r="0.7" fill="currentColor"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Risk Gauge
        </span>
      </div>

      {/* ── Ring — centered ── */}
      <div className="mb-3 flex flex-col items-center">
        <svg width="100" height="100" className="mb-1.5" aria-label={`Risk score: ${data.score}`}>
          {/* Track */}
          <circle
            cx="50" cy="50" r={R}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth="8"
          />
          {/* Score arc */}
          <circle
            cx="50" cy="50" r={R}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${arc} ${circ - arc}`}
            strokeDashoffset={circ * 0.25}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)' }}
          />
          {/* Score number — centered */}
          <text
            x="50" y="57"
            textAnchor="middle"
            fontFamily="var(--font-mono), monospace"
            fontSize="30"
            fontWeight="700"
            fill="var(--text)"
          >
            {data.score}
          </text>
        </svg>
        {/* Level label below ring */}
        <span
          className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ color }}
        >
          {label}
        </span>
      </div>

      {/* ── Breakdown bars ── */}
      <div className="mb-3 space-y-1.5">
        {CATEGORIES.map(({ abbr, key, color: barColor }) => {
          const val = data.breakdown?.[key] ?? 0
          const pct = Math.min(100, (val / BAR_MAX) * 100)
          return (
            <div key={abbr} className="flex items-center gap-2">
              <span className="w-7 shrink-0 font-mono text-[9px] font-bold uppercase text-[var(--text-muted)]">
                {abbr}
              </span>
              <div className="flex-1 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width:           `${pct}%`,
                    backgroundColor: barColor,
                    opacity:         0.8,
                    transition:      'width 0.7s cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
              </div>
              <span className="w-5 shrink-0 text-right font-mono text-[9px] font-bold text-[var(--text-muted)]">
                {val}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Key risks ── */}
      <div className="mb-2">
        <p className="mb-1 font-mono text-[8px] font-bold uppercase tracking-wide text-[var(--text-muted)] opacity-60">
          Key Risks
        </p>
        <div className="space-y-0.5">
          {factors.map((f, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <div className="mt-1.5 h-1 w-1 shrink-0 rounded-full" style={{ background: color }} />
              <span className="truncate font-mono text-[9px] leading-snug text-[var(--text-muted)]">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Trend — pinned to bottom ── */}
      <div className="mt-auto flex items-center justify-between">
        <span className="font-mono text-[8px] font-bold uppercase tracking-wide text-[var(--text-muted)] opacity-60">
          Risk Trend
        </span>
        <span className="font-mono text-[9px] font-bold" style={{ color: trend.color }}>
          {trend.arrow} {trend.label}
        </span>
      </div>

    </div>
  )
}
