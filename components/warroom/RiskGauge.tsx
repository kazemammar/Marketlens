'use client'

import type { MarketRiskPayload } from '@/app/api/market-risk/route'
import { useFetch } from '@/lib/hooks/useFetch'

// ─── Circular Ring Gauge ──────────────────────────────────────────────────

function RingGauge({ score, color }: { score: number; color: string }) {
  const R   = 38
  const CX  = 48
  const CY  = 48
  const circumference = 2 * Math.PI * R
  const filled        = (score / 100) * circumference

  return (
    <svg viewBox="0 0 96 96" className="h-[140px] w-[140px]" aria-hidden>
      <defs>
        <filter id="ring-glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Track */}
      <circle
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke="var(--surface-3)"
        strokeWidth="6"
      />

      {/* Zone ticks — subtle color segments */}
      {[
        { pct: 0.30, color: '#00ff88' },
        { pct: 0.30, color: '#f59e0b' },
        { pct: 0.20, color: '#f97316' },
        { pct: 0.20, color: '#ff4444' },
      ].reduce<{ els: React.ReactNode[]; offset: number }>((acc, z, i) => {
        const start  = acc.offset * circumference
        const len    = z.pct * circumference - 1
        acc.els.push(
          <circle
            key={i}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={z.color}
            strokeWidth="6"
            strokeDasharray={`${len} ${circumference - len}`}
            strokeDashoffset={-(start - circumference * 0.25)}
            strokeLinecap="butt"
            opacity="0.2"
            transform={`rotate(-90 ${CX} ${CY})`}
          />
        )
        acc.offset += z.pct
        return acc
      }, { els: [], offset: 0 }).els}

      {/* Filled progress arc */}
      {score > 0 && (
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
          opacity="0.92"
          filter="url(#ring-glow)"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)' }}
          transform={`rotate(-90 ${CX} ${CY})`}
        />
      )}
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<string, string> = {
  LOW: 'LOW RISK', MODERATE: 'MODERATE', HIGH: 'ELEVATED', CRITICAL: 'CRITICAL',
}

function dataAge(updatedAt: number): string {
  const m = Math.floor((Date.now() - updatedAt) / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

function stalenessColor(updatedAt: number): string {
  const m = Math.floor((Date.now() - updatedAt) / 60_000)
  if (m < 10) return 'var(--price-up)'
  if (m < 20) return 'var(--warning)'
  return 'var(--price-down)'
}

export default function RiskGauge() {
  const { data, loading } = useFetch<MarketRiskPayload>('/api/market-risk', { refreshInterval: 2 * 60_000 })

  const scoreColor = data
    ? (data.score >= 80 ? 'var(--price-down)' : data.score >= 60 ? 'var(--danger)' : data.score >= 30 ? 'var(--warning)' : 'var(--price-up)')
    : 'var(--price-up)'

  const breakdown = data?.breakdown ?? []

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-amber-400" aria-hidden>
          <path d="M2 14L8 2l6 12H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <line x1="8" y1="7" x2="8" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <circle cx="8" cy="12" r="0.7" fill="currentColor"/>
        </svg>
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Risk Gauge
        </span>
        <div className="flex-1" />
        {data && (
          <span
            className="font-mono text-[8px] tabular-nums"
            style={{ color: stalenessColor(data.updatedAt) }}
            title={`Last updated: ${new Date(data.updatedAt).toLocaleTimeString()}`}
          >
            {dataAge(data.updatedAt)}
          </span>
        )}
      </div>

      <div className="flex-1 px-3 py-2 overflow-y-auto">
        {loading ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="skeleton h-[140px] w-[140px] shrink-0 rounded-full" />
              <div className="flex-1 flex flex-col justify-center gap-3">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between">
                      <div className="skeleton h-2 w-16 rounded" />
                      <div className="skeleton h-2 w-6 rounded" />
                    </div>
                    <div className="skeleton h-1 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="skeleton h-2 w-20 rounded" />
                <div className="skeleton h-2 w-full rounded" />
                <div className="skeleton h-2 w-4/5 rounded" />
              </div>
              <div className="space-y-1.5">
                <div className="skeleton h-2 w-14 rounded" />
                <div className="skeleton h-2 w-full rounded" />
                <div className="skeleton h-2 w-3/4 rounded" />
              </div>
            </div>
            <div className="skeleton h-8 w-full rounded" />
          </div>
        ) : data ? (
          <>
            {/* ── ROW 1: Ring (left) + Breakdown (right) ── */}
            <div className="flex gap-3">

              {/* Left: Ring + Score — 140×140 relative wrapper keeps overlay centered */}
              <div className="relative h-[140px] w-[140px] shrink-0">
                <RingGauge score={data.score} color={scoreColor} />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="font-mono text-[48px] font-bold leading-none tabular-nums"
                    style={{ color: 'var(--text)', textShadow: `0 0 24px ${scoreColor}70` }}
                  >
                    {data.score}
                  </span>
                  <span
                    className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em]"
                    style={{ color: scoreColor }}
                  >
                    {LEVEL_LABEL[data.level] ?? data.level}
                  </span>
                </div>
              </div>

              {/* Right: Category Breakdown Bars */}
              <div className="flex flex-1 flex-col justify-center gap-3">
                {breakdown.map((cat) => (
                  <div key={cat.key}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: cat.color }} />
                      <span className="flex-1 font-mono text-[9px] uppercase tracking-wide text-[var(--text-2)] font-medium">
                        {cat.category}
                      </span>
                      <span className="font-mono text-[9px] font-bold tabular-nums" style={{ color: cat.color }}>
                        {cat.score}
                      </span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-[var(--surface-3)]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${cat.score}%`, background: cat.color, opacity: 0.9 }}
                      />
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* ── ROW 2: Opportunities (left) + Threats (right) ── */}
            <div className="mt-2 grid grid-cols-2 gap-2">

              {/* Opportunities */}
              <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5">
                <div className="mb-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--price-up)]">
                  Opportunities
                </div>
                <ul className="space-y-1.5">
                  {(data.opportunities?.length ? data.opportunities : ['No signals yet']).slice(0, 2).map((item, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--price-up)' }} />
                      <span className="line-clamp-2 font-mono text-[9px] leading-snug text-[var(--text)]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Threats */}
              <div className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5">
                <div className="mb-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--price-down)]">
                  Threats
                </div>
                <ul className="space-y-1.5">
                  {(data.threats?.length ? data.threats : data.factors ?? ['No signals yet']).slice(0, 2).map((item, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--price-down)' }} />
                      <span className="line-clamp-2 font-mono text-[9px] leading-snug text-[var(--text)]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* ── ROW 3: Risk Trend — identical to original ── */}
            <div className="mt-2 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Risk Trend</span>
                <span
                  className="font-mono text-[9px] font-bold"
                  style={{ color: data.score >= 60 ? 'var(--price-down)' : data.score >= 30 ? 'var(--warning)' : 'var(--price-up)' }}
                >
                  {data.score >= 60 ? '↑ RISING' : data.score >= 30 ? '→ STABLE' : '↓ EASING'}
                </span>
              </div>
              <div className="mt-1 flex h-1 gap-px overflow-hidden rounded-full">
                {[20, 40, 60, 80, 100].map((threshold, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm transition-all duration-700"
                    style={{
                      background: data.score >= threshold
                        ? scoreColor
                        : 'var(--surface-3)',
                      opacity: data.score >= threshold ? (0.4 + i * 0.15) : 0.3,
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="py-6 text-center">
            <p className="font-mono text-[10px] text-[var(--text-muted)]">Run market brief first</p>
          </div>
        )}
      </div>
    </div>
  )
}
