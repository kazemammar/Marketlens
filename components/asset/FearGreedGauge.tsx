'use client'

import { useFetch } from '@/lib/hooks/useFetch'

interface FngDataPoint {
  value:                string
  value_classification: string
  timestamp:            string
}

interface FngResponse {
  current: FngDataPoint | null
  history: FngDataPoint[]
}

function getColor(score: number): string {
  if (score <= 25) return 'var(--danger)'
  if (score <= 45) return '#f97316'
  if (score <= 55) return 'var(--warning)'
  if (score <= 75) return '#a3e635'
  return 'var(--accent)'
}

function SemicircleGauge({ score, color }: { score: number; color: string }) {
  // SVG semicircle gauge (top half of circle)
  // viewBox 0 0 120 70 — semicircle
  const R    = 50
  const CX   = 60
  const CY   = 60
  const circ = Math.PI * R // half circumference for semicircle
  const filled = (score / 100) * circ

  return (
    <svg viewBox="0 0 120 70" className="w-32 mx-auto" aria-hidden>
      <defs>
        <filter id="fg-glow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Track (gray semicircle) */}
      <circle
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke="var(--border)"
        strokeWidth="10"
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(180 ${CX} ${CY})`}
      />
      {/* Filled arc */}
      <circle
        cx={CX} cy={CY} r={R}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={`${filled} ${circ}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        opacity="0.9"
        filter="url(#fg-glow)"
        transform={`rotate(180 ${CX} ${CY})`}
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)' }}
      />
      {/* Zone tick marks */}
      {[25, 45, 55, 75].map((pct, i) => {
        const angle = (pct / 100) * Math.PI // 0 to PI
        const x1 = CX - (R - 6) * Math.cos(angle)
        const y1 = CY - (R - 6) * Math.sin(angle)
        const x2 = CX - (R + 6) * Math.cos(angle)
        const y2 = CY - (R + 6) * Math.sin(angle)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border)" strokeWidth="1"/>
      })}
    </svg>
  )
}

function Sparkline({ history }: { history: FngDataPoint[] }) {
  if (history.length < 2) return null
  const vals  = [...history].reverse().map(h => parseInt(h.value))
  const min   = Math.min(...vals)
  const max   = Math.max(...vals)
  const range = max - min || 1
  const W     = 120
  const H     = 24
  const coords = vals.map((v, i) => ({
    x: (i / (vals.length - 1)) * W,
    y: H - ((v - min) / range) * H,
  }))
  let d = `M ${coords[0].x},${coords[0].y}`
  for (let i = 1; i < coords.length; i++) {
    const cp = (coords[i-1].x + coords[i].x) / 2
    d += ` C ${cp},${coords[i-1].y} ${cp},${coords[i].y} ${coords[i].x},${coords[i].y}`
  }
  const lastColor = getColor(vals[vals.length - 1])
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
      <path d={d} fill="none" stroke={lastColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
    </svg>
  )
}

export default function FearGreedGauge() {
  const { data, loading, error } = useFetch<FngResponse>('/api/crypto/fear-greed', { refreshInterval: 15 * 60_000 })

  const score = data?.current ? parseInt(data.current.value) : 0
  const color = getColor(score)
  const label = data?.current?.value_classification ?? '—'

  return (
    <div className="border-b border-[var(--border)] lg:border-b-0">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 mb-2.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <path d="M8 2v2M2 8h2M14 8h-2M8 14v-2M4.22 4.22l1.41 1.41M10.36 10.36l1.42 1.42M4.22 11.78l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Fear &amp; Greed
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      </div>

      <div className="bg-[var(--surface)] px-4 py-3">
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="skeleton h-20 w-32 rounded" />
            <div className="skeleton h-4 w-16 rounded" />
            <div className="skeleton h-3 w-24 rounded" />
          </div>
        ) : error && !data ? (
          <p className="py-4 text-center font-mono text-[10px] text-[var(--text-muted)]">Failed to load data</p>
        ) : !data?.current ? (
          <p className="py-4 text-center font-mono text-[10px] text-[var(--text-muted)]">Unavailable</p>
        ) : (
          <div className="flex flex-col items-center">
            <div className="relative w-32">
              <SemicircleGauge score={score} color={color} />
              {/* Score overlay */}
              <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
                <span
                  className="font-mono text-[28px] font-bold leading-none tabular-nums"
                  style={{ color, textShadow: `0 0 16px ${color}60` }}
                >
                  {score}
                </span>
              </div>
            </div>
            <span className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color }}>
              {label}
            </span>
            {/* 30-day sparkline */}
            <div className="mt-3 w-full">
              <p className="mb-1 text-center font-mono text-[8px] text-[var(--text-muted)] opacity-50">
                30-DAY HISTORY
              </p>
              <Sparkline history={data.history} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
