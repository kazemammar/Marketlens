'use client'

import { useEffect, useState } from 'react'
import type { MarketRiskPayload } from '@/app/api/market-risk/route'

// ─── Circular Ring Gauge ──────────────────────────────────────────────────

function RingGauge({ score, color }: { score: number; color: string }) {
  const R   = 38
  const CX  = 48
  const CY  = 48
  const circumference = 2 * Math.PI * R
  const filled        = (score / 100) * circumference

  return (
    <svg viewBox="0 0 96 96" className="h-28 w-28" aria-hidden>
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
        stroke="rgba(255,255,255,0.05)"
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

export default function RiskGauge() {
  const [data,    setData]    = useState<MarketRiskPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/market-risk')
      .then((r) => r.ok ? r.json() as Promise<MarketRiskPayload> : null)
      .then((d) => { if (d) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const scoreColor = data
    ? (data.score >= 80 ? '#ff4444' : data.score >= 60 ? '#f97316' : data.score >= 30 ? '#f59e0b' : '#00ff88')
    : '#00ff88'

  return (
    <div className="flex flex-col">
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
      </div>

      <div className="flex-1 px-3 py-3">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="skeleton h-28 w-28 rounded-full" />
            <div className="skeleton h-4 w-16 rounded" />
          </div>
        ) : data ? (
          <>
            {/* Ring + center number */}
            <div className="relative flex justify-center">
              <RingGauge score={data.score} color={scoreColor} />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="font-mono text-[48px] font-bold leading-none tabular-nums"
                  style={{ color: '#ffffff', textShadow: `0 0 24px ${scoreColor}70` }}
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

            {/* Factors */}
            {data.factors?.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {data.factors.slice(0, 3).map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span
                      className="mt-1.5 h-1 w-1 shrink-0 rounded-full"
                      style={{ background: scoreColor, opacity: 0.7 }}
                    />
                    <span className="line-clamp-2 font-mono text-[9px] leading-snug text-[var(--text-muted)]">{f}</span>
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
