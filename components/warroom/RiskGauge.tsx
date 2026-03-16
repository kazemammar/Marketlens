'use client'

import { useEffect, useState } from 'react'
import type { MarketRiskPayload } from '@/app/api/market-risk/route'

// ─── SVG Semicircle Gauge ─────────────────────────────────────────────────

function Gauge({ score }: { score: number }) {
  const r  = 40
  const cx = 55, cy = 52

  function polar(deg: number, radius: number) {
    const rad = (deg * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  // 180° arc from left (180°) to right (0°), going clockwise via bottom
  const arcStart = polar(180, r)
  const arcEnd   = polar(0, r)
  const needle   = polar(180 - score * 1.8, r - 8) // 0→180°, 100→0°

  function zoneArc(from: number, to: number, col: string) {
    const a1 = 180 - from * 1.8
    const a2 = 180 - to * 1.8
    const p1 = polar(a1, r)
    const p2 = polar(a2, r)
    const la = (to - from) > 55 ? 1 : 0
    // sweep direction: decreasing angle = counter-clockwise in SVG
    return `<path d="M ${p1.x} ${p1.y} A ${r} ${r} 0 ${la} 0 ${p2.x} ${p2.y}" fill="none" stroke="${col}" stroke-width="8" stroke-linecap="butt" opacity="0.25"/>`
  }

  const zones = [
    zoneArc(0, 30, '#22c55e'),
    zoneArc(30, 60, '#f59e0b'),
    zoneArc(60, 80, '#f97316'),
    zoneArc(80, 100, '#ef4444'),
  ]

  const scoreColor = score >= 80 ? '#ef4444' : score >= 60 ? '#f97316' : score >= 30 ? '#f59e0b' : '#22c55e'

  return (
    <svg viewBox="0 0 110 60" className="h-24 w-full overflow-visible" aria-hidden>
      {/* Background arc */}
      <path
        d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 1 1 ${arcEnd.x} ${arcEnd.y}`}
        fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="butt"
      />
      {/* Zone arcs */}
      {zones.map((d, i) => <path key={i} d={d.match(/d="([^"]+)"/)?.[1] ?? ''} fill="none" stroke={d.match(/stroke="([^"]+)"/)?.[1] ?? ''} strokeWidth="8" strokeLinecap="butt" opacity="0.25" />)}
      {/* Filled arc up to score */}
      {score > 0 && (() => {
        const endA = 180 - score * 1.8
        const end  = polar(endA, r)
        const la   = score > 55 ? 1 : 0
        return (
          <path
            d={`M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${la} 1 ${end.x} ${end.y}`}
            fill="none" stroke={scoreColor} strokeWidth="8" strokeLinecap="round" opacity="0.85"
          />
        )
      })()}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={needle.x} y2={needle.y} stroke={scoreColor} strokeWidth="2" strokeLinecap="round" opacity="0.9"/>
      <circle cx={cx} cy={cy} r="3.5" fill={scoreColor} opacity="0.9"/>
      <circle cx={cx} cy={cy} r="1.5" fill="#0a0e17"/>
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<string, string> = {
  LOW: 'LOW RISK', MODERATE: 'MODERATE', HIGH: 'ELEVATED', CRITICAL: 'CRITICAL',
}

export default function RiskGauge() {
  const [data,    setData]    = useState<MarketRiskPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/market-risk')
      .then((r) => r.ok ? r.json() as Promise<MarketRiskPayload> : null)
      .then((d) => { if (d) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 text-red-400" aria-hidden>
          <path d="M2 14L8 2l6 12H2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <line x1="8" y1="7" x2="8" y2="10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <circle cx="8" cy="12" r="0.7" fill="currentColor"/>
        </svg>
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Risk Gauge
        </span>
      </div>

      <div className="flex-1 px-3 py-2">
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="mx-auto h-24 w-4/5 rounded bg-[var(--surface-2)]" />
            <div className="mx-auto h-5 w-20 rounded bg-[var(--surface-2)]" />
          </div>
        ) : data ? (
          <>
            <Gauge score={data.score} />
            <div className="mt-0.5 text-center">
              <div className="font-mono text-[28px] font-bold leading-none tabular-nums" style={{ color: data.color }}>
                {data.score}
              </div>
              <div className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: data.color }}>
                {LEVEL_LABEL[data.level] ?? data.level}
              </div>
            </div>

            {/* Zone reference */}
            <div className="mt-3 grid grid-cols-4 gap-0.5">
              {([['0–30','#22c55e','LOW'],['30–60','#f59e0b','MOD'],['60–80','#f97316','HIGH'],['80+','#ef4444','CRIT']] as const).map(([range, col, lbl]) => (
                <div key={range} className="text-center">
                  <div className="h-1 rounded-sm" style={{ background: col, opacity: 0.4 }} />
                  <span className="font-mono text-[7px]" style={{ color: col, opacity: 0.6 }}>{lbl}</span>
                </div>
              ))}
            </div>

            {/* Factors */}
            {data.factors?.length > 0 && (
              <ul className="mt-2.5 space-y-1">
                {data.factors.slice(0, 3).map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-red-400" />
                    <span className="line-clamp-2 font-mono text-[9px] text-[var(--text-muted)]">{f}</span>
                  </li>
                ))}
              </ul>
            )}
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
