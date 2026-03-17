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
    position:      'fixed',
    left:          tip.x,
    zIndex:        9999,
    transform:     'translateX(-50%)',
    pointerEvents: 'none',
    ...(tip.placement === 'top'
      ? { bottom: window.innerHeight - tip.y + 10 }
      : { top:    tip.y + 10 }),
  }

  return createPortal(
    <div style={style} className="animate-fade-up w-[240px]">
      <div
        className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
        style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)' }}
      >
        {tip.content}
      </div>
    </div>,
    document.body
  )
}

// ─── Info indicator (fades in on hover via parent group) ───────────────────

function InfoDot() {
  return (
    <span
      className="pointer-events-none hidden sm:flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-3)] font-mono text-[8px] font-bold text-[var(--text-muted)] opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      aria-hidden
    >
      i
    </span>
  )
}

// ─── Tooltip content: AI brief style ──────────────────────────────────────

const LEVEL_COLOR: Record<string, string> = {
  LOW: 'var(--price-up)', MODERATE: 'var(--warning)', HIGH: '#f97316', CRITICAL: 'var(--price-down)',
}

const LEVEL_BRIEF: Record<string, string> = {
  LOW:      'Market conditions are calm. Risk factors remain contained across all major categories. This is a constructive environment for risk assets.',
  MODERATE: 'Some uncertainty is present in the market. At least one category is showing elevated signals. Stay alert but no immediate defensive action is required.',
  HIGH:     'Elevated stress detected across multiple categories. Institutional investors are likely reducing exposure. Consider hedging or rotating into defensive assets.',
  CRITICAL: 'Multiple high-risk signals are firing simultaneously. This typically precedes sharp market moves. Defensive positioning is strongly advised.',
}

const CAT_BRIEF: Record<string, (score: number, detail?: CategoryDetail) => string> = {
  geo: (score) =>
    score >= 75
      ? 'Geopolitical flashpoints are at extreme levels. Active conflicts, sanctions, or diplomatic breakdowns are driving safe-haven demand for gold, yen, and Treasuries.'
      : score >= 55
        ? 'Geopolitical tensions are elevated. Trade disputes, regional conflicts, or election uncertainty are weighing on investor sentiment.'
        : score >= 35
          ? 'Moderate geopolitical noise present. Some headline risk exists but markets are largely pricing it in.'
          : 'Geopolitical conditions are relatively calm. No major flashpoints are currently driving risk premiums.',
  mkt: (score) =>
    score >= 75
      ? 'Market structure is under severe stress. Volatility is spiking, equity selloffs are accelerating, and liquidity conditions are deteriorating.'
      : score >= 55
        ? 'Equity markets are showing signs of stress. Earnings risk, sector rotation, or elevated VIX readings are flagging caution.'
        : score >= 35
          ? 'Markets are mixed. Some sectors are under pressure but broader indices remain contained. Watch volatility closely.'
          : 'Market conditions are healthy. Equities are advancing and volatility is suppressed — a favorable environment.',
  mcr: (score) =>
    score >= 75
      ? 'Macro risk is critical. Central bank policy uncertainty, a potential recession signal, or severe currency stress is dominating the macro landscape.'
      : score >= 55
        ? 'Macro headwinds are building. Inflation, rate expectations, or yield curve dynamics are creating uncertainty for asset allocators.'
        : score >= 35
          ? 'The macro backdrop has some moving parts. Keep an eye on upcoming Fed communications and key economic releases.'
          : 'The macro environment is supportive. Inflation is contained, policy is accommodative, and growth indicators are positive.',
  cmd: (score) =>
    score >= 75
      ? 'Commodity markets are in crisis mode. A severe supply shock or demand collapse is sending ripple effects through energy, metals, and food supply chains.'
      : score >= 55
        ? 'Commodity stress is elevated. Oil, gold, or grain markets are signaling supply/demand imbalances that could feed into broader inflation.'
        : score >= 35
          ? 'Some commodity markets are moving but not yet disruptive. Monitor energy and metals for early warning signals.'
          : 'Commodity markets are stable. Supply chains are functioning normally and no significant disruptions are currently flagged.',
}

function ScoreTooltipContent({ data }: { data: MarketRiskPayload }) {
  const dominant = [...data.breakdown].sort((a, b) => b.score - a.score)[0]
  const isAmpActive = dominant && Math.round(dominant.score * 0.85) > data.breakdown.reduce((s, c) => {
    const w = { geo: 0.30, mkt: 0.30, mcr: 0.25, cmd: 0.15 }[c.key] ?? 0
    return s + c.score * w
  }, 0)

  return (
    <div>
      <div className="h-[3px] w-full" style={{ background: data.color }} />
      <div className="p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: data.color }}>
            {data.label} · {data.score}/100
          </span>
          <span className="rounded px-1.5 py-px font-mono text-[8px] font-bold uppercase" style={{ color: data.color, background: `${data.color}20` }}>
            {data.level}
          </span>
        </div>

        <p className="font-mono text-[10px] leading-relaxed text-[var(--text)]">
          {LEVEL_BRIEF[data.level]}
        </p>

        {dominant && (
          <div className="border-t border-[var(--border)] pt-2 space-y-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Top driver
            </span>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dominant.color }} />
              <span className="font-mono text-[10px] text-[var(--text)]">{dominant.category}</span>
              <span className="font-mono text-[10px] font-bold tabular-nums" style={{ color: dominant.color }}>
                {dominant.score}
              </span>
            </div>
            {isAmpActive && (
              <p className="font-mono text-[9px] text-[var(--warning)] leading-snug">
                ⚡ Crisis amplifier active — a dominant category is pulling the overall score higher.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryTooltipContent({ cat, detail }: { cat: BreakdownItem; detail?: CategoryDetail }) {
  const level = cat.score >= 75 ? 'CRITICAL' : cat.score >= 55 ? 'HIGH' : cat.score >= 35 ? 'MODERATE' : 'LOW'
  const levelColor = LEVEL_COLOR[level]
  const briefFn = CAT_BRIEF[cat.key]
  const brief = briefFn ? briefFn(cat.score, detail) : ''

  return (
    <div>
      <div className="h-[3px] w-full" style={{ background: cat.color }} />
      <div className="p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
            {cat.category}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold tabular-nums" style={{ color: cat.color }}>
              {cat.score}
            </span>
            <span className="rounded px-1.5 py-px font-mono text-[8px] font-bold uppercase" style={{ color: levelColor, background: `${levelColor}20` }}>
              {level}
            </span>
          </div>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
          <div className="h-full rounded-full" style={{ width: `${cat.score}%`, background: cat.color }} />
        </div>

        <p className="font-mono text-[10px] leading-relaxed text-[var(--text)]">
          {brief}
        </p>

        {detail?.keywords && detail.keywords.length > 0 && (
          <div className="border-t border-[var(--border)] pt-2 space-y-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Active signals
            </span>
            <div className="flex flex-wrap gap-1">
              {detail.keywords.map((kw) => (
                <span key={kw} className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 font-mono text-[8px] text-[var(--text)]">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {detail?.drivers && detail.drivers.length > 0 && (
          <div className="space-y-1">
            {detail.drivers.map((d, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="mt-[4px] h-1 w-1 shrink-0 rounded-full" style={{ background: cat.color }} />
                <span className="font-mono text-[9px] leading-snug text-[var(--text-muted)]">{d}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ItemTooltipContent({ text, kind }: { text: string; kind: 'opportunity' | 'threat' }) {
  const isOpp  = kind === 'opportunity'
  const color  = isOpp ? 'var(--price-up)' : 'var(--price-down)'
  const label  = isOpp ? 'Opportunity' : 'Threat'

  const lower    = text.toLowerCase()
  const related: string[] = []
  if (/gold|oil|crude|commodit|metal|energy|lng|opec/.test(lower)) related.push('Commodity')
  if (/fed|rate|inflation|bond|yield|dollar|macro|gdp|cpi/.test(lower)) related.push('Macro')
  if (/equity|stock|market|nasdaq|earnings|vix|volatil/.test(lower)) related.push('Market')
  if (/geopolit|conflict|sanction|war|china|russia|iran|tariff|tension/.test(lower)) related.push('Geopolitical')

  const why = isOpp
    ? 'This signal suggests a potential alpha opportunity given current market conditions. Monitor closely for confirmation before acting.'
    : 'This risk factor has been identified in the latest market brief as a potential headwind. Consider its impact on your current positions.'

  return (
    <div>
      <div className="h-[3px] w-full" style={{ background: color }} />
      <div className="p-3 space-y-2.5">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color }}>
          {label} Signal
        </span>
        <p className="font-mono text-[10px] leading-relaxed text-[var(--text)]">
          {text}
        </p>
        <p className="font-mono text-[9px] leading-snug text-[var(--text-muted)] border-t border-[var(--border)] pt-2">
          {why}
        </p>
        {related.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-mono text-[9px] text-[var(--text-muted)]">Linked to:</span>
            {related.map((r) => (
              <span key={r} className="rounded bg-[var(--surface-3)] px-1.5 py-0.5 font-mono text-[8px] text-[var(--text)]">{r}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TrendTooltipContent({ score, history }: { score: number; history?: HistoryPoint[] }) {
  const now  = Date.now()
  const SLOTS = [
    { label: 'Now',  ms: 0 },
    { label: '−5m',  ms: 5  * 60_000 },
    { label: '−10m', ms: 10 * 60_000 },
    { label: '−30m', ms: 30 * 60_000 },
    { label: '−1h',  ms: 60 * 60_000 },
  ]

  function closest(targetMs: number): number | null {
    if (!history || history.length === 0) return null
    const target = now - targetMs
    const margin = targetMs * 0.65
    let best: HistoryPoint | null = null
    let bestDist = Infinity
    for (const h of history) {
      const dist = Math.abs(h.timestamp - target)
      if (dist < bestDist && dist < margin) { bestDist = dist; best = h }
    }
    return best?.score ?? null
  }

  const points = SLOTS.map((s) => ({
    label: s.label,
    value: s.ms === 0 ? score : closest(s.ms),
  }))

  const validPoints = points.filter((p) => p.value !== null)
  const hasHistory  = validPoints.length >= 2
  const oldest      = validPoints[validPoints.length - 1]?.value ?? score
  const delta       = score - oldest
  const direction   = delta > 3 ? '↑ Rising' : delta < -3 ? '↓ Easing' : '→ Stable'
  const dirColor    = delta > 3 ? 'var(--price-down)' : delta < -3 ? 'var(--price-up)' : 'var(--warning)'

  const outlook = delta > 5
    ? 'Risk momentum is building. If geopolitical or macro catalysts persist, expect further elevation. Consider reducing exposure to volatile assets.'
    : delta < -5
      ? 'Risk is easing. The market is digesting earlier stress signals. Conditions may be improving for risk assets over the near term.'
      : 'Risk is relatively stable. No strong directional momentum. Continue monitoring key categories for any sudden shifts.'

  return (
    <div>
      <div className="h-[3px] w-full" style={{ background: 'var(--accent)' }} />
      <div className="p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Risk Trend
          </span>
          <span className="font-mono text-[10px] font-bold" style={{ color: dirColor }}>
            {direction}
          </span>
        </div>

        {!hasHistory ? (
          <p className="font-mono text-[10px] text-[var(--text-muted)] leading-relaxed">
            Collecting historical data — trend will appear after ~10 minutes of activity.
          </p>
        ) : (
          <div className="space-y-2">
            {points.map((pt) => {
              const v        = pt.value
              const barPct   = v != null ? v : 0
              const barColor = v != null
                ? (v >= 75 ? 'var(--price-down)' : v >= 55 ? '#f97316' : v >= 35 ? 'var(--warning)' : 'var(--price-up)')
                : 'var(--surface-3)'
              return (
                <div key={pt.label} className="flex items-center gap-2">
                  <span className="w-9 font-mono text-[9px] tabular-nums text-[var(--text-muted)]">{pt.label}</span>
                  <div className="flex-1 h-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barPct}%`, background: barColor }} />
                  </div>
                  <span className="w-6 font-mono text-[9px] tabular-nums text-right font-bold" style={{ color: barColor }}>
                    {v ?? '—'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <p className="font-mono text-[10px] leading-relaxed text-[var(--text)] border-t border-[var(--border)] pt-2">
          {outlook}
        </p>

        {hasHistory && delta !== 0 && (
          <span className="font-mono text-[9px] font-bold tabular-nums" style={{ color: dirColor }}>
            {delta > 0 ? '+' : ''}{delta.toFixed(0)} pts over tracked period
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Ring Gauge ────────────────────────────────────────────────────────────

function RingGauge({ score, color }: { score: number; color: string }) {
  const R             = 38
  const CX            = 48
  const CY            = 48
  const circumference = 2 * Math.PI * R
  const filled        = (score / 100) * circumference

  return (
    <svg viewBox="0 0 96 96" className="h-[110px] w-[110px] sm:h-[140px] sm:w-[140px]" aria-hidden>
      <defs>
        <filter id="ring-glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--surface-3)" strokeWidth="6" />
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

// ─── Helpers ───────────────────────────────────────────────────────────────

const LEVEL_LABEL: Record<string, string> = {
  LOW: 'LOW RISK', MODERATE: 'MODERATE', HIGH: 'ELEVATED', CRITICAL: 'CRITICAL',
}

function dataAge(updatedAt: number): string {
  const m = Math.floor((Date.now() - updatedAt) / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
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

  // ── Tooltip ──────────────────────────────────────────────────────────
  const [tip, setTip]  = useState<TooltipState | null>(null)
  const enterTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showTip = useCallback((e: React.MouseEvent, content: React.ReactNode) => {
    if (enterTimer.current) clearTimeout(enterTimer.current)
    const rect        = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const TOOLTIP_W   = 240
    const MARGIN      = 8
    const rawCx       = rect.left + rect.width / 2
    // Clamp so tooltip never overflows either edge of the viewport
    const cx          = Math.min(Math.max(rawCx, TOOLTIP_W / 2 + MARGIN), window.innerWidth - TOOLTIP_W / 2 - MARGIN)
    const spaceBelow  = window.innerHeight - rect.bottom
    const placement: 'top' | 'bottom' = spaceBelow < 200 ? 'top' : 'bottom'
    enterTimer.current = setTimeout(() => {
      setTip({ content, x: cx, y: placement === 'top' ? rect.top : rect.bottom, placement })
    }, 130)
  }, [])

  const hideTip = useCallback(() => {
    if (enterTimer.current) clearTimeout(enterTimer.current)
    setTip(null)
  }, [])

  return (
    <div className="flex flex-col h-full min-h-[260px] sm:min-h-0">
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
              <div className="skeleton h-[110px] w-[110px] sm:h-[140px] sm:w-[140px] shrink-0 rounded-full" />
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
              {[1,2].map((i) => (
                <div key={i} className="space-y-1">
                  <div className="skeleton h-2 w-20 rounded" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
                    {[1,2,3].map((j) => <div key={j} className="skeleton h-2 w-full rounded" />)}
                  </div>
                </div>
              ))}
            </div>
            <div className="skeleton h-8 w-full rounded" />
          </div>
        ) : data ? (
          <>
            {/* ── ROW 1: Ring + Breakdown ── */}
            <div className="flex gap-3">

              {/* Ring — hoverable */}
              <div
                className="group relative h-[110px] w-[110px] sm:h-[140px] sm:w-[140px] shrink-0 cursor-default"
                onMouseEnter={(e) => showTip(e, <ScoreTooltipContent data={data} />)}
                onMouseLeave={hideTip}
              >
                <RingGauge score={data.score} color={scoreColor} />
                {/* Score overlay */}
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="font-mono text-[36px] sm:text-[48px] font-bold leading-none tabular-nums"
                    style={{ color: 'var(--text)', textShadow: `0 0 24px ${scoreColor}70` }}
                  >
                    {data.score}
                  </span>
                  <span className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: scoreColor }}>
                    {LEVEL_LABEL[data.level] ?? data.level}
                  </span>
                </div>
                {/* Info indicator bottom-right of ring */}
                <div className="absolute bottom-2 right-2 pointer-events-none">
                  <InfoDot />
                </div>
              </div>

              {/* Category bars — each hoverable */}
              <div className="flex flex-1 flex-col justify-center gap-3">
                {breakdown.map((cat) => (
                  <div
                    key={cat.key}
                    className="group cursor-default"
                    onMouseEnter={(e) => showTip(e,
                      <CategoryTooltipContent cat={cat} detail={data.categoryDetails?.[cat.key]} />
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
                      <InfoDot />
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

              <div>
                <div className="mb-1 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--price-up)]">
                  Opportunities
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 gap-x-3">
                  {(data.opportunities?.length ? data.opportunities : ['No signals yet']).slice(0, 3).map((item, i) => (
                    <div
                      key={i}
                      className="group flex items-start gap-1 cursor-default"
                      onMouseEnter={(e) => showTip(e, <ItemTooltipContent text={item} kind="opportunity" />)}
                      onMouseLeave={hideTip}
                    >
                      <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--price-up)' }} />
                      <span className="line-clamp-2 font-mono text-[9px] leading-snug text-[var(--text)] group-hover:text-[var(--price-up)] transition-colors duration-150">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1 font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--price-down)]">
                  Threats
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 gap-x-3">
                  {(data.threats?.length ? data.threats : data.factors ?? ['No signals yet']).slice(0, 3).map((item, i) => (
                    <div
                      key={i}
                      className="group flex items-start gap-1 cursor-default"
                      onMouseEnter={(e) => showTip(e, <ItemTooltipContent text={item} kind="threat" />)}
                      onMouseLeave={hideTip}
                    >
                      <span className="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--price-down)' }} />
                      <span className="line-clamp-2 font-mono text-[9px] leading-snug text-[var(--text)] group-hover:text-[var(--price-down)] transition-colors duration-150">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* ── ROW 3: Risk Trend — hoverable ── */}
            <div
              className="group mt-2 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 cursor-default hover:border-[var(--accent)]/30 transition-colors duration-150"
              onMouseEnter={(e) => showTip(e, <TrendTooltipContent score={data.score} history={data.history} />)}
              onMouseLeave={hideTip}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--text-muted)]">Risk Trend</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-mono text-[9px] font-bold"
                    style={{ color: data.score >= 60 ? 'var(--price-down)' : data.score >= 30 ? 'var(--warning)' : 'var(--price-up)' }}
                  >
                    {data.score >= 60 ? '↑ RISING' : data.score >= 30 ? '→ STABLE' : '↓ EASING'}
                  </span>
                  <InfoDot />
                </div>
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

      {/* Portal tooltip — always last, rendered outside overflow */}
      {tip && <TooltipPortal tip={tip} />}
    </div>
  )
}
