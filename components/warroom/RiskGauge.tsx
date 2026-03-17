'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { MarketRiskPayload, BreakdownItem, CategoryDetail, HistoryPoint } from '@/app/api/market-risk/route'
import { useFetch } from '@/lib/hooks/useFetch'

// ─── Tooltip portal ────────────────────────────────────────────────────────

interface TooltipState {
  content:   React.ReactNode
  x:         number
  y:         number
  placement: 'top' | 'bottom'
}

function TooltipPortal({ tip }: { tip: TooltipState }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const style: React.CSSProperties = {
    position:  'fixed',
    left:      tip.x,
    zIndex:    9999,
    transform: 'translateX(-50%)',
    pointerEvents: 'none',
    ...(tip.placement === 'top'
      ? { bottom: window.innerHeight - tip.y + 8 }
      : { top: tip.y + 8 }),
  }

  return createPortal(
    <div style={style} className="animate-fade-up w-[220px]">
      <div
        className="rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)' }}
      >
        {tip.content}
      </div>
    </div>,
    document.body
  )
}

// ─── Tooltip content builders ──────────────────────────────────────────────

const WEIGHTS: Record<string, number> = { geo: 0.30, mkt: 0.30, mcr: 0.25, cmd: 0.15 }

const CAT_DESC: Record<string, string> = {
  geo: 'Conflict zones, sanctions, trade wars, and geopolitical flashpoints',
  mkt: 'Equity volatility, earnings risk, sector rotation, and market structure',
  mcr: 'Central bank policy, inflation, interest rates, and macroeconomic data',
  cmd: 'Oil, gas, gold, metals, and commodity supply/demand dynamics',
}

const SCORE_LEVEL_DESC: Record<string, string> = {
  LOW:      'Markets are calm. Risk factors are contained across all categories.',
  MODERATE: 'Some uncertainty present. Monitor key categories closely.',
  HIGH:     'Elevated risk signals across multiple categories. Reduce exposure.',
  CRITICAL: 'Multiple high-risk signals detected. Defensive positioning advised.',
}

function ScoreTooltipContent({ data }: { data: MarketRiskPayload }) {
  const parts = data.breakdown.map((cat) => {
    const w = WEIGHTS[cat.key] ?? 0
    return { ...cat, weight: w, contrib: +(cat.score * w).toFixed(1) }
  })
  const weightedAvg = +(parts.reduce((s, p) => s + p.contrib, 0)).toFixed(1)
  const maxCat      = Math.max(...parts.map((p) => p.score))
  const amplified   = +(maxCat * 0.85).toFixed(1)
  const usedAmp     = amplified > weightedAvg

  return (
    <div className="p-2.5 space-y-2">
      {/* Title */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Score Breakdown
        </span>
        <span className="font-mono text-[11px] font-bold" style={{ color: data.color }}>
          {data.score} / 100
        </span>
      </div>

      {/* Weighted table */}
      <div className="space-y-1">
        {parts.map((p) => (
          <div key={p.key} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="flex-1 font-mono text-[8px] text-[var(--text-muted)]">{p.category}</span>
            <span className="font-mono text-[8px] tabular-nums text-[var(--text-muted)]">
              {(p.weight * 100).toFixed(0)}% ×
            </span>
            <span className="font-mono text-[8px] tabular-nums font-bold text-[var(--text)]" style={{ minWidth: 18, textAlign: 'right' }}>
              {p.score}
            </span>
            <span className="font-mono text-[8px] tabular-nums text-[var(--text-muted)]">=</span>
            <span className="font-mono text-[8px] tabular-nums" style={{ color: p.color, minWidth: 26, textAlign: 'right' }}>
              {p.contrib}
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--border)] pt-1.5 space-y-0.5">
        <div className="flex justify-between font-mono text-[8px]">
          <span className="text-[var(--text-muted)]">Weighted avg</span>
          <span className="tabular-nums text-[var(--text)]">{weightedAvg}</span>
        </div>
        <div className="flex justify-between font-mono text-[8px]">
          <span className="text-[var(--text-muted)]">Crisis amplifier (max×0.85)</span>
          <span className="tabular-nums" style={{ color: usedAmp ? data.color : 'var(--text-muted)' }}>
            {amplified}{usedAmp ? ' ✓' : ''}
          </span>
        </div>
        <div className="flex justify-between font-mono text-[9px] font-bold mt-1">
          <span style={{ color: data.color }}>Final score</span>
          <span style={{ color: data.color }}>{data.score}</span>
        </div>
      </div>

      {/* Level description */}
      <p className="font-mono text-[8px] text-[var(--text-muted)] leading-snug border-t border-[var(--border)] pt-1.5">
        {SCORE_LEVEL_DESC[data.level]}
      </p>
    </div>
  )
}

function CategoryTooltipContent({
  cat, detail, color,
}: { cat: BreakdownItem; detail?: CategoryDetail; color: string }) {
  const level = cat.score >= 75 ? 'CRITICAL' : cat.score >= 55 ? 'HIGH' : cat.score >= 35 ? 'MODERATE' : 'LOW'
  const levelColor = level === 'CRITICAL' ? 'var(--price-down)' : level === 'HIGH' ? '#f97316' : level === 'MODERATE' ? 'var(--warning)' : 'var(--price-up)'

  return (
    <div className="overflow-hidden">
      {/* Colored accent bar */}
      <div className="h-[2px] w-full rounded-t" style={{ background: color }} />
      <div className="p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text)]">
            {cat.category}
          </span>
          <span className="font-mono text-[9px] font-bold tabular-nums" style={{ color }}>
            {cat.score}
          </span>
        </div>

        {/* Score bar */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
          <div className="h-full rounded-full" style={{ width: `${cat.score}%`, background: color, opacity: 0.9 }} />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="rounded px-1.5 py-px font-mono text-[7px] font-bold uppercase" style={{ color: levelColor, background: `${levelColor}20` }}>
            {level}
          </span>
          <span className="font-mono text-[8px] text-[var(--text-muted)]">
            {(WEIGHTS[cat.key] ?? 0) * 100}% of total score
          </span>
        </div>

        <p className="font-mono text-[8px] text-[var(--text-muted)] leading-snug">
          {CAT_DESC[cat.key]}
        </p>

        {detail?.keywords && detail.keywords.length > 0 && (
          <div className="border-t border-[var(--border)] pt-1.5 space-y-1">
            <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Active signals
            </span>
            <div className="flex flex-wrap gap-1">
              {detail.keywords.map((kw) => (
                <span key={kw} className="rounded bg-[var(--surface-3)] px-1 py-px font-mono text-[7px] text-[var(--text)]">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {detail?.drivers && detail.drivers.length > 0 && (
          <div className="space-y-1">
            {detail.drivers.map((d, i) => (
              <div key={i} className="flex items-start gap-1">
                <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full" style={{ background: color }} />
                <span className="font-mono text-[8px] text-[var(--text)] leading-snug">{d}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ItemTooltipContent({ text, kind }: { text: string; kind: 'opportunity' | 'threat' }) {
  const isOpp = kind === 'opportunity'
  const color = isOpp ? 'var(--price-up)' : 'var(--price-down)'

  // Simple category inference from text
  const lower = text.toLowerCase()
  const related: string[] = []
  if (/gold|oil|crude|commodit|metal|energy/.test(lower)) related.push('Commodity')
  if (/fed|rate|inflation|bond|yield|dollar|macro/.test(lower)) related.push('Macro')
  if (/equity|stock|market|nasdaq|earnings|vix/.test(lower)) related.push('Market')
  if (/geopolit|conflict|sanction|war|china|russia|iran|tariff/.test(lower)) related.push('Geopolitical')

  return (
    <div className="overflow-hidden">
      <div className="h-[2px] w-full rounded-t" style={{ background: color }} />
      <div className="p-2.5 space-y-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color }}>
          {isOpp ? 'Opportunity' : 'Threat'}
        </span>
        <p className="font-mono text-[9px] text-[var(--text)] leading-snug">{text}</p>
        {related.length > 0 && (
          <div className="flex items-center gap-1.5 border-t border-[var(--border)] pt-1.5">
            <span className="font-mono text-[8px] text-[var(--text-muted)]">Related:</span>
            {related.map((r) => (
              <span key={r} className="rounded bg-[var(--surface-3)] px-1 py-px font-mono text-[7px] text-[var(--text)]">{r}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TrendTooltipContent({ score, history }: { score: number; history?: HistoryPoint[] }) {
  const now = Date.now()
  const SLOTS = [
    { label: 'Now',   ms: 0 },
    { label: '−5m',   ms: 5  * 60_000 },
    { label: '−10m',  ms: 10 * 60_000 },
    { label: '−30m',  ms: 30 * 60_000 },
    { label: '−1h',   ms: 60 * 60_000 },
  ]

  // Find closest history point to each slot
  function closest(targetMs: number): number | null {
    if (!history || history.length === 0) return null
    const target = now - targetMs
    const margin = targetMs === 0 ? 0 : targetMs * 0.6
    let best: HistoryPoint | null = null
    let bestDist = Infinity
    for (const h of history) {
      const dist = Math.abs(h.timestamp - target)
      if (dist < bestDist && (targetMs === 0 || dist < margin)) {
        bestDist = dist
        best = h
      }
    }
    return best?.score ?? null
  }

  const points = SLOTS.map((s) => ({
    label: s.label,
    value: s.ms === 0 ? score : closest(s.ms),
  }))

  const hasHistory = points.slice(1).some((p) => p.value !== null)
  const maxScore   = Math.max(...points.filter((p) => p.value !== null).map((p) => p.value as number))
  const minScore   = Math.min(...points.filter((p) => p.value !== null).map((p) => p.value as number))
  const delta      = hasHistory ? score - (points[points.length - 1]?.value ?? score) : 0
  const direction  = delta > 3 ? '↑ Rising' : delta < -3 ? '↓ Easing' : '→ Stable'
  const dirColor   = delta > 3 ? 'var(--price-down)' : delta < -3 ? 'var(--price-up)' : 'var(--warning)'

  return (
    <div className="overflow-hidden">
      <div className="h-[2px] w-full rounded-t" style={{ background: 'var(--accent)' }} />
      <div className="p-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Risk Trend History
          </span>
          <span className="font-mono text-[9px] font-bold" style={{ color: dirColor }}>
            {direction}
          </span>
        </div>

        {!hasHistory ? (
          <p className="font-mono text-[8px] text-[var(--text-muted)] leading-snug">
            Collecting data — trend will appear after ~10 minutes of activity.
          </p>
        ) : (
          <div className="space-y-1.5">
            {points.map((pt) => {
              const v = pt.value
              const barPct = v != null ? (v / 100) * 100 : 0
              const barColor = v != null
                ? (v >= 75 ? 'var(--price-down)' : v >= 55 ? '#f97316' : v >= 35 ? 'var(--warning)' : 'var(--price-up)')
                : 'var(--surface-3)'
              return (
                <div key={pt.label} className="flex items-center gap-2">
                  <span className="w-8 font-mono text-[8px] tabular-nums text-[var(--text-muted)]">{pt.label}</span>
                  <div className="flex-1 h-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                    <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: barColor }} />
                  </div>
                  <span className="w-6 font-mono text-[8px] tabular-nums text-right" style={{ color: barColor }}>
                    {v ?? '—'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {hasHistory && (
          <div className="border-t border-[var(--border)] pt-1.5 flex justify-between">
            <span className="font-mono text-[8px] text-[var(--text-muted)]">
              Range: {minScore}–{maxScore}
            </span>
            {delta !== 0 && (
              <span className="font-mono text-[8px] font-bold tabular-nums" style={{ color: dirColor }}>
                {delta > 0 ? '+' : ''}{delta.toFixed(0)} pts / 1h
              </span>
            )}
          </div>
        )}

        <p className="font-mono text-[8px] text-[var(--text-muted)] leading-snug border-t border-[var(--border)] pt-1.5">
          {score >= 60
            ? 'Risk is elevated. Consider hedging positions and monitoring closely.'
            : score >= 35
              ? 'Moderate risk. Watch for catalyst events that could accelerate momentum.'
              : 'Risk is easing. Conditions may be improving for risk assets.'}
        </p>
      </div>
    </div>
  )
}

// ─── Circular Ring Gauge ───────────────────────────────────────────────────

function RingGauge({ score, color }: { score: number; color: string }) {
  const R            = 38
  const CX           = 48
  const CY           = 48
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
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--surface-3)" strokeWidth="6" />

      {/* Zone ticks */}
      {([
        { pct: 0.30, color: '#00ff88' },
        { pct: 0.30, color: '#f59e0b' },
        { pct: 0.20, color: '#f97316' },
        { pct: 0.20, color: '#ff4444' },
      ] as { pct: number; color: string }[]).reduce<{ els: React.ReactNode[]; offset: number }>((acc, z, i) => {
        const start = acc.offset * circumference
        const len   = z.pct * circumference - 1
        acc.els.push(
          <circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={z.color}
            strokeWidth="6"
            strokeDasharray={`${len} ${circumference - len}`}
            strokeDashoffset={-(start - circumference * 0.25)}
            strokeLinecap="butt" opacity="0.2"
            transform={`rotate(-90 ${CX} ${CY})`}
          />
        )
        acc.offset += z.pct
        return acc
      }, { els: [], offset: 0 }).els}

      {/* Filled arc */}
      {score > 0 && (
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={color}
          strokeWidth="6"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round" opacity="0.92"
          filter="url(#ring-glow)"
          style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)' }}
          transform={`rotate(-90 ${CX} ${CY})`}
        />
      )}
    </svg>
  )
}

// ─── Staleness helpers ─────────────────────────────────────────────────────

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

// ─── Main component ────────────────────────────────────────────────────────

export default function RiskGauge() {
  const { data, loading } = useFetch<MarketRiskPayload>('/api/market-risk', { refreshInterval: 5 * 60_000 })

  const scoreColor = data
    ? (data.score >= 80 ? 'var(--price-down)' : data.score >= 60 ? 'var(--danger)' : data.score >= 30 ? 'var(--warning)' : 'var(--price-up)')
    : 'var(--price-up)'

  const breakdown = data?.breakdown ?? []

  // ── Tooltip state ──────────────────────────────────────────────────────
  const [tip, setTip] = useState<TooltipState | null>(null)
  const enterTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showTip = useCallback((e: React.MouseEvent, content: React.ReactNode) => {
    if (enterTimer.current) clearTimeout(enterTimer.current)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const cx   = rect.left + rect.width / 2
    const spaceBelow = window.innerHeight - rect.bottom
    const placement: 'top' | 'bottom' = spaceBelow < 180 ? 'top' : 'bottom'
    enterTimer.current = setTimeout(() => {
      setTip({ content, x: cx, y: placement === 'top' ? rect.top : rect.bottom, placement })
    }, 120)
  }, [])

  const hideTip = useCallback(() => {
    if (enterTimer.current) clearTimeout(enterTimer.current)
    setTip(null)
  }, [])

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
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="skeleton h-2 w-20 rounded" />
                <div className="grid grid-cols-3 gap-x-3">
                  <div className="skeleton h-2 w-full rounded" />
                  <div className="skeleton h-2 w-full rounded" />
                  <div className="skeleton h-2 w-4/5 rounded" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="skeleton h-2 w-14 rounded" />
                <div className="grid grid-cols-3 gap-x-3">
                  <div className="skeleton h-2 w-full rounded" />
                  <div className="skeleton h-2 w-full rounded" />
                  <div className="skeleton h-2 w-3/4 rounded" />
                </div>
              </div>
            </div>
            <div className="skeleton h-8 w-full rounded" />
          </div>
        ) : data ? (
          <>
            {/* ── ROW 1: Ring + Breakdown ── */}
            <div className="flex gap-3">

              {/* Ring + score — hoverable */}
              <div
                className="relative h-[140px] w-[140px] shrink-0 cursor-help"
                onMouseEnter={(e) => data && showTip(e, <ScoreTooltipContent data={data} />)}
                onMouseLeave={hideTip}
              >
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

              {/* Category breakdown — each bar hoverable */}
              <div className="flex flex-1 flex-col justify-center gap-3">
                {breakdown.map((cat) => (
                  <div
                    key={cat.key}
                    className="cursor-help"
                    onMouseEnter={(e) => showTip(e,
                      <CategoryTooltipContent
                        cat={cat}
                        detail={data.categoryDetails?.[cat.key]}
                        color={cat.color}
                      />
                    )}
                    onMouseLeave={hideTip}
                  >
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

            {/* ── ROW 2: Opportunities + Threats ── */}
            <div className="mt-2 space-y-2">

              {/* Opportunities */}
              <div>
                <div className="mb-1 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--price-up)]">
                  Opportunities
                </div>
                <div className="grid grid-cols-3 gap-x-3">
                  {(data.opportunities?.length ? data.opportunities : ['No signals yet']).slice(0, 3).map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-1 cursor-help"
                      onMouseEnter={(e) => showTip(e, <ItemTooltipContent text={item} kind="opportunity" />)}
                      onMouseLeave={hideTip}
                    >
                      <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--price-up)' }} />
                      <span className="line-clamp-2 font-mono text-[9px] leading-snug text-[var(--text)]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Threats */}
              <div>
                <div className="mb-1 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--price-down)]">
                  Threats
                </div>
                <div className="grid grid-cols-3 gap-x-3">
                  {(data.threats?.length ? data.threats : data.factors ?? ['No signals yet']).slice(0, 3).map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-1 cursor-help"
                      onMouseEnter={(e) => showTip(e, <ItemTooltipContent text={item} kind="threat" />)}
                      onMouseLeave={hideTip}
                    >
                      <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--price-down)' }} />
                      <span className="line-clamp-2 font-mono text-[9px] leading-snug text-[var(--text)]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* ── ROW 3: Risk Trend — hoverable ── */}
            <div
              className="mt-2 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 cursor-help"
              onMouseEnter={(e) => showTip(e, <TrendTooltipContent score={data.score} history={data.history} />)}
              onMouseLeave={hideTip}
            >
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
                      background: data.score >= threshold ? scoreColor : 'var(--surface-3)',
                      opacity:    data.score >= threshold ? (0.4 + i * 0.15) : 0.3,
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

      {/* Portal tooltip */}
      {tip && <TooltipPortal tip={tip} />}
    </div>
  )
}
