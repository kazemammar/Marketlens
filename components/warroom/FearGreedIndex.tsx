'use client'

import type { FearGreedData } from '@/lib/api/cnn-fear-greed'
import { useFetch } from '@/lib/hooks/useFetch'

// ─── Fear-Greed color scale (semantic, theme-independent) ─────────────────

const FG_COLORS = {
  extremeFear: 'var(--danger)',
  fear:        '#f97316',
  neutral:     'var(--warning)',
  greed:       'var(--accent)',
  extremeGreed:'var(--price-up)',
} as const

function scoreColor(score: number): string {
  if (score <= 25) return FG_COLORS.extremeFear
  if (score <= 45) return FG_COLORS.fear
  if (score <= 55) return FG_COLORS.neutral
  if (score <= 75) return FG_COLORS.greed
  return FG_COLORS.extremeGreed
}

function ratingLabel(rating: string): string {
  return rating
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── SVG Semicircle Gauge ──────────────────────────────────────────────────

function SemiGauge({ score }: { score: number }) {
  // viewBox 200×110 — semicircle, needle from center
  const cx  = 100
  const cy  = 100
  const r   = 80

  // Track arc: from 180° to 0° (left to right across the bottom)
  // In SVG: 180° = (-r, 0) relative to center = (cx-r, cy)
  //         0°   = (r, 0)  relative to center = (cx+r, cy)
  // We want 0–100 mapped to 0°–180° sweep from left (180°) to right (0°)

  // Colored arc zones: extreme fear, fear, neutral, greed, extreme greed
  type Zone = { from: number; to: number; color: string }
  const zones: Zone[] = [
    { from: 0,   to: 25,  color: FG_COLORS.extremeFear },
    { from: 25,  to: 45,  color: FG_COLORS.fear },
    { from: 45,  to: 55,  color: FG_COLORS.neutral },
    { from: 55,  to: 75,  color: FG_COLORS.greed },
    { from: 75,  to: 100, color: FG_COLORS.extremeGreed },
  ]

  // Convert score 0–100 to angle (0=left=180°, 100=right=0°)
  // angle in radians, measured from positive-x axis
  function scoreToAngle(s: number): number {
    // 0 → π (left), 100 → 0 (right)
    return Math.PI - (s / 100) * Math.PI
  }

  function polarToXY(angle: number, radius: number) {
    return {
      x: cx + radius * Math.cos(angle),
      y: cy - radius * Math.sin(angle),
    }
  }

  // Build arc path segment
  function arcPath(fromScore: number, toScore: number): string {
    const a1 = scoreToAngle(fromScore)
    const a2 = scoreToAngle(toScore)
    const p1 = polarToXY(a1, r)
    const p2 = polarToXY(a2, r)
    // large-arc-flag: 0 since each zone < 180°
    return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }

  // Needle
  const needleAngle = scoreToAngle(score)
  const needleTip   = polarToXY(needleAngle, r - 4)
  const needleBase  = polarToXY(needleAngle, 14) // short tail past center

  const color = scoreColor(score)

  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-[220px]" aria-hidden>
      {/* Track bg */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="var(--surface-3)"
        strokeWidth="10"
        strokeLinecap="butt"
      />

      {/* Colored zone arcs */}
      {zones.map((z) => (
        <path
          key={z.from}
          d={arcPath(z.from, z.to)}
          fill="none"
          stroke={z.color}
          strokeWidth="10"
          strokeLinecap="butt"
          opacity="0.85"
        />
      ))}

      {/* Needle */}
      <line
        x1={needleBase.x.toFixed(2)}
        y1={needleBase.y.toFixed(2)}
        x2={needleTip.x.toFixed(2)}
        y2={needleTip.y.toFixed(2)}
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}90)` }}
      />

      {/* Needle center dot */}
      <circle cx={cx} cy={cy} r="5" fill={color} opacity="0.9" />
      <circle cx={cx} cy={cy} r="2.5" fill="var(--surface)" />
    </svg>
  )
}

// ─── Historical comparison cell ────────────────────────────────────────────

function HistCell({ label, past, current }: { label: string; past: number; current: number }) {
  const delta   = current - past
  const up      = delta > 0
  const color   = up ? 'var(--price-up)' : delta < 0 ? 'var(--price-down)' : 'var(--text-muted)'
  const arrow   = up ? '▲' : delta < 0 ? '▼' : '—'

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--text-muted)]">{label}</span>
      <span className="font-mono text-[13px] font-bold tabular-nums leading-none text-[var(--text)]">{past}</span>
      <span className="font-mono text-[9px] font-semibold tabular-nums" style={{ color }}>
        {arrow} {Math.abs(delta)}
      </span>
    </div>
  )
}

// ─── Indicator card ────────────────────────────────────────────────────────

function IndicatorCard({ name, score, rating }: { name: string; score: number; rating: string }) {
  const color = scoreColor(score)
  return (
    <div
      className="flex flex-col gap-1 rounded border bg-[var(--surface)] p-2.5 transition hover:border-[var(--accent)]/30"
      style={{ borderColor: 'var(--border)' }}
    >
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {name}
      </span>
      <span
        className="font-mono text-[18px] font-bold leading-none tabular-nums"
        style={{ color }}
      >
        {score}
      </span>
      <span
        className="inline-block self-start rounded px-1 py-px font-mono text-[9px] font-bold uppercase"
        style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
      >
        {ratingLabel(rating)}
      </span>
    </div>
  )
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <div className="skeleton h-2 w-20 rounded" />
      <div className="skeleton h-5 w-10 rounded" />
      <div className="skeleton h-3 w-14 rounded" />
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export default function FearGreedIndex() {
  const { data, loading, error } = useFetch<FearGreedData>('/api/fear-greed', {
    refreshInterval: 30 * 60_000,
  })

  const color  = data ? scoreColor(data.score) : 'var(--text-muted)'
  const rating = data ? ratingLabel(data.rating) : '—'

  return (
    <div className="overflow-hidden rounded border border-[var(--border)]">

      {/* Panel header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2">
        {/* Gauge icon */}
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <path d="M2 11 A6 6 0 0 1 14 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="8" y1="11" x2="5" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <circle cx="8" cy="11" r="1" fill="currentColor"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Fear &amp; Greed Index
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        {data && (
          <span
            className="rounded border px-1.5 py-px font-mono text-[9px] font-bold uppercase"
            style={{ color, borderColor: `${color}40`, background: `${color}15` }}
          >
            {rating}
          </span>
        )}
        <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-40">CNN · 30MIN CACHE</span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3">
        {loading ? (
          <>
            {/* Gauge skeleton */}
            <div className="flex flex-col items-center gap-2">
              <div className="skeleton h-[90px] w-[200px] rounded" />
              <div className="skeleton h-8 w-16 rounded" />
              <div className="skeleton h-3 w-24 rounded" />
            </div>
            {/* History row skeleton */}
            <div className="flex justify-around">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="skeleton h-2 w-10 rounded" />
                  <div className="skeleton h-4 w-6 rounded" />
                  <div className="skeleton h-2 w-8 rounded" />
                </div>
              ))}
            </div>
            {/* Indicator cards skeleton */}
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
              {Array.from({ length: 7 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </>
        ) : data ? (
          <>
            {/* ── Gauge + Score ── */}
            <div className="flex flex-col items-center gap-1">
              <SemiGauge score={data.score} />
              <span
                className="font-mono text-[40px] font-bold leading-none tabular-nums"
                style={{ color, textShadow: `0 0 24px ${color}60` }}
              >
                {data.score}
              </span>
              <span
                className="font-mono text-[11px] font-bold uppercase tracking-[0.12em]"
                style={{ color }}
              >
                {rating}
              </span>
            </div>

            {/* ── Historical comparison row ── */}
            <div className="flex items-start justify-around rounded border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
              <HistCell label="Prev Close" past={data.previousClose} current={data.score} />
              <div className="w-px self-stretch bg-[var(--border)]" />
              <HistCell label="1W Ago"     past={data.oneWeekAgo}   current={data.score} />
              <div className="w-px self-stretch bg-[var(--border)]" />
              <HistCell label="1M Ago"     past={data.oneMonthAgo}  current={data.score} />
              <div className="w-px self-stretch bg-[var(--border)]" />
              <HistCell label="1Y Ago"     past={data.oneYearAgo}   current={data.score} />
            </div>

            {/* ── 7 indicator cards ── */}
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
              {data.indicators.map((ind) => (
                <IndicatorCard key={ind.name} {...ind} />
              ))}
            </div>
          </>
        ) : error ? (
          <p className="py-6 text-center font-mono text-[10px] text-[var(--text-muted)]">
            Failed to load Fear &amp; Greed data
          </p>
        ) : (
          <p className="py-6 text-center font-mono text-[10px] text-[var(--text-muted)]">
            Fear &amp; Greed data unavailable
          </p>
        )}
      </div>
    </div>
  )
}
