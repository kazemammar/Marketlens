'use client'

import type { MarketRiskPayload } from '@/app/api/market-risk/route'
import { useFetch } from '@/lib/hooks/useFetch'

// ─── Helpers ──────────────────────────────────────────────────────────────

function ago(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

// ─── Ring gauge (compact, score inside) ───────────────────────────────────

function RingGauge({ score, color }: { score: number; color: string }) {
  const SIZE = 84
  const R    = 31
  const CX   = SIZE / 2
  const CY   = SIZE / 2
  const circ = 2 * Math.PI * R
  const filled = (score / 100) * circ

  // Zone colour segments (green → yellow → orange → red)
  const zones = [
    { pct: 0.30, color: '#22c55e' },
    { pct: 0.25, color: '#f59e0b' },
    { pct: 0.25, color: '#f97316' },
    { pct: 0.20, color: '#ef4444' },
  ]

  let offset = 0
  const zoneEls = zones.map((z, i) => {
    const start = offset * circ
    const len   = z.pct * circ - 1.5
    offset += z.pct
    return (
      <circle
        key={i}
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke={z.color}
        strokeWidth="7"
        strokeDasharray={`${len} ${circ - len}`}
        strokeDashoffset={-(start - circ * 0.25)}
        strokeLinecap="butt"
        opacity="0.18"
        transform={`rotate(-90 ${CX} ${CY})`}
      />
    )
  })

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ width: SIZE, height: SIZE }} aria-hidden>
      <defs>
        <filter id="rg-glow">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Track */}
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--surface-3)" strokeWidth="7" />
      {/* Zone tints */}
      {zoneEls}
      {/* Progress arc */}
      {score > 0 && (
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeDashoffset={circ * 0.25}
          strokeLinecap="round"
          opacity="0.95"
          filter="url(#rg-glow)"
          style={{ transition: 'stroke-dasharray 0.9s cubic-bezier(0.16,1,0.3,1)' }}
          transform={`rotate(-90 ${CX} ${CY})`}
        />
      )}
      {/* Score inside */}
      <text
        x={CX} y={CY - 5}
        textAnchor="middle"
        dominantBaseline="auto"
        fontFamily="var(--font-mono), monospace"
        fontSize="24"
        fontWeight="700"
        fill="var(--text)"
      >
        {score}
      </text>
      <text
        x={CX} y={CY + 12}
        textAnchor="middle"
        dominantBaseline="auto"
        fontFamily="var(--font-mono), monospace"
        fontSize="7.5"
        fontWeight="700"
        letterSpacing="0.08em"
        fill={color}
        style={{ textTransform: 'uppercase' }}
      >
        /100
      </text>
    </svg>
  )
}

// ─── Category breakdown bar ────────────────────────────────────────────────

const BREAKDOWN_ITEMS: { key: keyof MarketRiskPayload['breakdown']; label: string; color: string }[] = [
  { key: 'geopolitical', label: 'Geopolitical', color: '#ef4444' },
  { key: 'market',       label: 'Mkt Stress',   color: '#f97316' },
  { key: 'macro',        label: 'Macro/Credit', color: '#f59e0b' },
  { key: 'commodity',    label: 'Commodity/FX', color: '#22d3ee' },
]

function BreakdownBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[72px] shrink-0 font-mono text-[8px] uppercase tracking-wide text-[var(--text-muted)] opacity-70">
        {label}
      </span>
      <div className="relative flex-1 h-1.5 rounded-full" style={{ background: 'var(--surface-3)' }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width:      `${value}%`,
            background: color,
            opacity:    0.75,
            transition: 'width 0.7s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      </div>
      <span
        className="w-5 shrink-0 text-right font-mono text-[9px] font-bold tabular-nums"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  )
}

// ─── Sparkline ────────────────────────────────────────────────────────────

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const W   = 200
  const H   = 22
  const min = Math.min(...values)
  const max = Math.max(...values)
  const rng = max - min || 1

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / rng) * H * 0.75 - H * 0.1
    return [x, y] as [number, number]
  })

  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ')
  const area     = `M ${pts[0][0]},${H} L ${polyline} L ${pts[pts.length - 1][0]},${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 22 }} preserveAspectRatio="none">
      <path d={area} fill={color} opacity="0.1" />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      {/* Last point dot */}
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r="2.5"
        fill={color}
        opacity="0.9"
      />
    </svg>
  )
}

// ─── Trend arrow ──────────────────────────────────────────────────────────

const TREND_META = {
  RISING: { label: 'Rising',  arrow: '↑', color: '#ef4444' },
  STABLE: { label: 'Stable',  arrow: '→', color: '#f59e0b' },
  EASING: { label: 'Easing',  arrow: '↓', color: '#22c55e' },
}

// ─── Main component ────────────────────────────────────────────────────────

export default function RiskGauge() {
  const { data, loading } = useFetch<MarketRiskPayload>('/api/market-risk', { refreshInterval: 2 * 60_000 })

  const scoreColor = data
    ? data.score >= 75 ? '#ef4444'
      : data.score >= 55 ? '#f97316'
      : data.score >= 35 ? '#f59e0b'
      : '#22c55e'
    : '#f59e0b'

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-amber-400" aria-hidden>
            <path d="M2 14L8 2l6 12H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <line x1="8" y1="7" x2="8" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <circle cx="8" cy="12" r="0.7" fill="currentColor"/>
          </svg>
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Risk Gauge
          </span>
        </div>
        {data && (
          <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-40">
            {ago(data.updatedAt)}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 overflow-y-auto divide-y divide-[var(--border)]">
        {loading ? (
          // ── Skeleton ──
          <div className="flex gap-4 px-4 py-3">
            <div className="skeleton rounded-full shrink-0" style={{ width: 84, height: 84 }} />
            <div className="flex-1 space-y-2 pt-1">
              {[80, 65, 50, 70].map((w, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="skeleton h-2 w-[72px] rounded shrink-0" />
                  <div className="skeleton flex-1 h-1.5 rounded-full" />
                  <div className="skeleton h-2 w-5 rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : !data ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <p className="font-mono text-[10px] text-[var(--text-muted)] opacity-50">Run market brief first</p>
          </div>
        ) : (
          <>
            {/* ── TOP: Ring + Breakdown ── */}
            <div className="flex items-center gap-4 px-4 py-3">

              {/* Left: ring */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <RingGauge score={data.score} color={scoreColor} />
                <span
                  className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-center"
                  style={{ color: scoreColor }}
                >
                  {data.label}
                </span>
              </div>

              {/* Right: breakdown bars */}
              <div className="flex-1 min-w-0 space-y-2.5">
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] opacity-50 mb-3">
                  Risk Breakdown
                </p>
                {BREAKDOWN_ITEMS.map(({ key, label, color }) => (
                  <BreakdownBar
                    key={key}
                    label={label}
                    value={data.breakdown[key]}
                    color={color}
                  />
                ))}
              </div>
            </div>

            {/* ── MIDDLE: Key factors ── */}
            {data.factors.length > 0 && (
              <div className="px-4 py-2.5">
                <p className="mb-2 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] opacity-50">
                  Key Risk Factors
                </p>
                <ul className="space-y-1.5">
                  {data.factors.slice(0, 3).map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: scoreColor, opacity: 0.7 }} />
                      <span className="font-mono text-[9px] leading-snug text-[var(--text-muted)]">{f}</span>
                    </li>
                  ))}
                </ul>
                {/* Opportunities (subtle) */}
                {data.opportunities?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {data.opportunities.slice(0, 1).map((o, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--price-up)] opacity-60" />
                        <span className="font-mono text-[9px] leading-snug text-[var(--text-muted)] opacity-70">{o}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* ── BOTTOM: Trend sparkline ── */}
            <div className="px-4 py-2.5">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] opacity-50">
                  Risk Trend
                </p>
                <div className="flex items-center gap-1">
                  <span
                    className="font-mono text-[9px] font-bold uppercase tracking-wide"
                    style={{ color: TREND_META[data.trend].color }}
                  >
                    {TREND_META[data.trend].arrow} {TREND_META[data.trend].label}
                  </span>
                </div>
              </div>
              <Sparkline values={data.history} color={scoreColor} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
