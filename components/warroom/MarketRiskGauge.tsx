'use client'

import { useEffect, useState } from 'react'
import { MarketRiskPayload } from '@/app/api/market-risk/route'

// Arc gauge SVG — 180° sweep, clockwise from left
function Gauge({ score }: { score: number }) {
  const r = 38
  const cx = 50, cy = 50
  const startAngle = 180
  const sweepAngle = 180
  const angle = startAngle + (score / 100) * sweepAngle

  function polar(deg: number, radius: number) {
    const rad = (deg * Math.PI) / 180
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    }
  }

  // Background arc
  const bgStart = polar(startAngle, r)
  const bgEnd   = polar(startAngle + sweepAngle, r)

  // Filled arc
  const fgStart = polar(startAngle, r)
  const fgEnd   = polar(angle, r)
  const largeArc = score > 50 ? 1 : 0

  // Needle
  const needleTip  = polar(angle, r - 6)
  const needleBase = polar(angle + 90, 5)
  const needleBase2 = polar(angle - 90, 5)

  // Zone colors: green 0-35, amber 35-55, orange 55-75, red 75-100
  function scoreColor(s: number) {
    if (s >= 75) return '#ef4444'
    if (s >= 55) return '#f97316'
    if (s >= 35) return '#f59e0b'
    return '#22c55e'
  }

  const color = scoreColor(score)

  return (
    <svg viewBox="0 0 100 60" className="h-20 w-full" aria-hidden>
      {/* Background arc */}
      <path
        d={`M ${bgStart.x} ${bgStart.y} A ${r} ${r} 0 1 1 ${bgEnd.x} ${bgEnd.y}`}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Zone gradient ticks */}
      {[0, 35, 55, 75, 100].map((tick, i, arr) => {
        if (i === arr.length - 1) return null
        const zoneColors = ['#22c55e', '#f59e0b', '#f97316', '#ef4444']
        const a1 = startAngle + (tick / 100) * sweepAngle
        const a2 = startAngle + (arr[i + 1] / 100) * sweepAngle
        const p1 = polar(a1, r)
        const p2 = polar(a2, r)
        const la = arr[i + 1] - tick > 50 ? 1 : 0
        return (
          <path
            key={tick}
            d={`M ${p1.x} ${p1.y} A ${r} ${r} 0 ${la} 1 ${p2.x} ${p2.y}`}
            fill="none"
            stroke={zoneColors[i]}
            strokeWidth="6"
            strokeLinecap="butt"
            opacity="0.25"
          />
        )
      })}

      {/* Filled arc */}
      {score > 1 && (
        <path
          d={`M ${fgStart.x} ${fgStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fgEnd.x} ${fgEnd.y}`}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.9"
        />
      )}

      {/* Needle */}
      <polygon
        points={`${needleTip.x},${needleTip.y} ${needleBase.x},${needleBase.y} ${needleBase2.x},${needleBase2.y}`}
        fill={color}
        opacity="0.9"
      />
      <circle cx={cx} cy={cy} r="3" fill={color} />
      <circle cx={cx} cy={cy} r="1.5" fill="rgba(0,0,0,0.5)" />
    </svg>
  )
}

export default function MarketRiskGauge() {
  const [data,    setData]    = useState<MarketRiskPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/market-risk')
      .then((r) => r.ok ? r.json() as Promise<MarketRiskPayload> : null)
      .then((d) => { if (d) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="overflow-hidden rounded-lg border border-[rgba(255,255,255,0.07)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-[rgba(255,255,255,0.06)] px-3 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-red-400" aria-hidden>
          <path d="M2 14L8 2l6 12H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <line x1="8" y1="7" x2="8" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <circle cx="8" cy="12" r="0.7" fill="currentColor"/>
        </svg>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
          Market Risk Score
        </span>
      </div>

      <div className="px-3 py-2">
        {loading ? (
          <div className="animate-pulse space-y-2 py-2">
            <div className="mx-auto h-20 w-4/5 rounded bg-[var(--surface-2)]" />
            <div className="mx-auto h-4 w-16 rounded bg-[var(--surface-2)]" />
          </div>
        ) : data ? (
          <>
            <Gauge score={data.score} />

            {/* Score display */}
            <div className="mt-1 text-center">
              <span className="text-2xl font-bold tabular-nums" style={{ color: data.color }}>
                {data.score}
              </span>
              <span className="ml-1 text-xs text-[var(--text-muted)]">/100</span>
            </div>
            <div className="mt-0.5 text-center">
              <span
                className="rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide"
                style={{ color: data.color, background: `${data.color}18` }}
              >
                {data.level}
              </span>
            </div>

            {/* Top risk factors */}
            {data.factors.length > 0 && (
              <ul className="mt-3 space-y-1">
                {data.factors.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px] text-[var(--text-muted)]">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                    <span className="line-clamp-2">{f}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="py-4 text-center font-mono text-[11px] text-[var(--text-muted)]">
            Generate market brief first
          </p>
        )}
      </div>
    </div>
  )
}
