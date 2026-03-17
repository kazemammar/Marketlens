'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import type { MarketRiskPayload, BreakdownItem, CategoryDetail, HistoryPoint, AffectedAsset } from '@/app/api/market-risk/route'
import { useFetch } from '@/lib/hooks/useFetch'

// ─── Asset chip (clickable, navigates to asset page) ──────────────────────

const DIR_ARROW: Record<string, string> = { up: '↑', down: '↓', volatile: '↔' }
const DIR_COLOR: Record<string, string> = {
  up: 'var(--price-up)', down: 'var(--price-down)', volatile: 'var(--warning)',
}

function AssetChip({ symbol, type, direction }: AffectedAsset) {
  const color      = DIR_COLOR[direction] ?? 'var(--warning)'
  const assetType  = (type as string) === 'equity' ? 'stock' : type
  return (
    <Link
      href={`/asset/${assetType}/${encodeURIComponent(symbol)}`}
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[8px] font-semibold transition-all duration-100 hover:opacity-70 active:scale-95"
      style={{ color, background: `${color}18`, border: `1px solid ${color}35` }}
      onClick={(e) => e.stopPropagation()}
    >
      <span>{DIR_ARROW[direction] ?? '↔'}</span>
      <span>{symbol}</span>
    </Link>
  )
}

// ─── Category → asset filter ───────────────────────────────────────────────

function filterAssetsForCategory(assets: AffectedAsset[], catKey: string): AffectedAsset[] {
  const seen = new Set<string>()
  const dedup = (arr: AffectedAsset[]) => arr.filter(a => {
    if (seen.has(a.symbol)) return false
    seen.add(a.symbol); return true
  })
  switch (catKey) {
    case 'geo': return dedup(assets.filter(a =>
      ['GLD', 'SLV', 'GC=F', 'USO', 'CL=F', 'USD/JPY'].includes(a.symbol)
    ))
    case 'mkt': return dedup(assets.filter(a =>
      a.type === 'stock' || a.type === 'etf' || (a.type as string) === 'equity'
    ))
    case 'mcr': return dedup(assets.filter(a =>
      a.type === 'forex' || ['TLT', 'VIX'].includes(a.symbol)
    ))
    case 'cmd': return dedup(assets.filter(a =>
      a.type === 'commodity' || ['USO', 'GLD', 'SLV', 'GC=F', 'CL=F'].includes(a.symbol)
    ))
    default: return []
  }
}

// ─── Tooltip portal ────────────────────────────────────────────────────────

interface TooltipState {
  content:     React.ReactNode
  x:           number
  y:           number
  placement:   'top' | 'bottom'
  interactive: boolean
}

function TooltipPortal({
  tip,
  onMouseEnter,
  onMouseLeave,
}: {
  tip:          TooltipState
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  const style: React.CSSProperties = {
    position:      'fixed',
    left:          tip.x,
    zIndex:        9999,
    transform:     'translateX(-50%)',
    pointerEvents: tip.interactive ? 'auto' : 'none',
    ...(tip.placement === 'top'
      ? { bottom: window.innerHeight - tip.y + 10 }
      : { top:    tip.y + 10 }),
  }

  return createPortal(
    <div
      style={style}
      className="animate-fade-up w-[280px]"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]"
        style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.4)' }}
      >
        {tip.content}
      </div>
    </div>,
    document.body
  )
}

// ─── Info indicator ────────────────────────────────────────────────────────

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

// ─── Level colors ──────────────────────────────────────────────────────────

const LEVEL_COLOR: Record<string, string> = {
  LOW: 'var(--price-up)', MODERATE: 'var(--warning)', HIGH: '#f97316', CRITICAL: 'var(--price-down)',
}

// ─── ScoreTooltipContent ──────────────────────────────────────────────────

function ScoreTooltipContent({ data }: { data: MarketRiskPayload }) {
  const sorted   = [...data.breakdown].sort((a, b) => b.score - a.score)
  const dominant = sorted[0]
  const elevated = sorted.filter((c) => c.score >= 55)

  const totalSignals = data.categoryDetails
    ? Object.values(data.categoryDetails).reduce((n, d) => n + d.keywords.length, 0)
    : 0

  const topKeywords = (dominant && data.categoryDetails?.[dominant.key])?.keywords.slice(0, 3) ?? []

  // AI brief excerpt — first ~130 chars
  const briefExcerpt = data.briefText
    ? data.briefText.length > 130
      ? data.briefText.slice(0, 130).replace(/\s+\S*$/, '') + '…'
      : data.briefText
    : null

  const assets = data.affectedAssets ?? []

  return (
    <div>
      <div className="h-[3px] w-full" style={{ background: `linear-gradient(90deg, ${data.color}, ${data.color}50)` }} />
      <div className="p-3 space-y-2.5">

        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: data.color }}>
            {data.label} · {data.score}/100
          </span>
          <span className="rounded px-1.5 py-px font-mono text-[8px] font-bold uppercase" style={{ color: data.color, background: `${data.color}20` }}>
            {data.level}
          </span>
        </div>

        {/* Signal narrative */}
        <p className="font-mono text-[10px] leading-relaxed text-[var(--text)]">
          {totalSignals > 0
            ? `${totalSignals} signal${totalSignals !== 1 ? 's' : ''} · ${elevated.length > 0 ? `${elevated.length} elevated categor${elevated.length === 1 ? 'y' : 'ies'}` : 'all categories normal'}. `
            : ''}
          {dominant && topKeywords.length > 0
            ? `${dominant.category} leads on ${topKeywords.join(', ')}.`
            : ''}
        </p>

        {/* AI brief excerpt */}
        {briefExcerpt && (
          <p
            className="font-mono text-[9px] leading-snug text-[var(--text-muted)] italic border-l-2 pl-2"
            style={{ borderColor: `${data.color}60` }}
          >
            "{briefExcerpt}"
          </p>
        )}

        {/* Category mini-chart */}
        <div className="border-t border-[var(--border)] pt-2 space-y-1.5">
          {sorted.map((cat) => (
            <div key={cat.key} className="flex items-center gap-2">
              <span className="h-1 w-1 shrink-0 rounded-full" style={{ background: cat.color }} />
              <span className="flex-1 font-mono text-[9px] text-[var(--text-muted)]">{cat.category}</span>
              <div className="w-16 h-1 rounded-full bg-[var(--surface-3)] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${cat.score}%`, background: cat.color }} />
              </div>
              <span className="w-5 font-mono text-[9px] font-bold tabular-nums text-right" style={{ color: cat.color }}>
                {cat.score}
              </span>
            </div>
          ))}
        </div>

        {/* Moving Now — all affected assets */}
        {assets.length > 0 && (
          <div className="border-t border-[var(--border)] pt-2 space-y-1.5">
            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Moving Now
            </span>
            <div className="flex flex-wrap gap-1">
              {assets.map((a, i) => <AssetChip key={i} {...a} />)}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── CategoryTooltipContent ───────────────────────────────────────────────

function CategoryTooltipContent({
  cat, detail, allAssets,
}: {
  cat:       BreakdownItem
  detail?:   CategoryDetail
  allAssets?: AffectedAsset[]
}) {
  const level      = cat.score >= 75 ? 'CRITICAL' : cat.score >= 55 ? 'HIGH' : cat.score >= 35 ? 'MODERATE' : 'LOW'
  const levelColor = LEVEL_COLOR[level]
  const filtered   = allAssets ? filterAssetsForCategory(allAssets, cat.key) : []

  return (
    <div>
      <div className="h-[3px] w-full" style={{ background: cat.color }} />
      <div className="p-3 space-y-2.5">

        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
            {cat.category}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] font-bold tabular-nums" style={{ color: cat.color }}>{cat.score}</span>
            <span className="rounded px-1.5 py-px font-mono text-[8px] font-bold uppercase" style={{ color: levelColor, background: `${levelColor}20` }}>
              {level}
            </span>
          </div>
        </div>

        {/* Score bar */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
          <div className="h-full rounded-full" style={{ width: `${cat.score}%`, background: cat.color }} />
        </div>

        {/* Keyword chips */}
        {detail?.keywords && detail.keywords.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {detail.keywords.map((kw) => (
              <span
                key={kw}
                className="rounded px-1.5 py-0.5 font-mono text-[8px] font-semibold"
                style={{ color: cat.color, background: `${cat.color}18`, border: `1px solid ${cat.color}30` }}
              >
                {kw}
              </span>
            ))}
          </div>
        ) : (
          <p className="font-mono text-[9px] text-[var(--text-muted)]">No active signals detected.</p>
        )}

        {/* Driver sentences */}
        {detail?.drivers && detail.drivers.length > 0 && (
          <div className="border-t border-[var(--border)] pt-2 space-y-1.5">
            {detail.drivers.map((d, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full" style={{ background: cat.color }} />
                <span className="font-mono text-[10px] leading-snug text-[var(--text)]">{d}</span>
              </div>
            ))}
          </div>
        )}

        {/* Exposed assets for this category */}
        {filtered.length > 0 && (
          <div className="border-t border-[var(--border)] pt-2 space-y-1.5">
            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Exposed Assets
            </span>
            <div className="flex flex-wrap gap-1">
              {filtered.map((a, i) => <AssetChip key={i} {...a} />)}
            </div>
          </div>
        )}

        {/* Weight footer */}
        {detail && (
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-1.5">
            <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-60">
              Weight {Math.round(detail.weight * 100)}% of overall score
            </span>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── ItemTooltipContent ────────────────────────────────────────────────────

function ItemTooltipContent({
  text, kind, allAssets,
}: {
  text:       string
  kind:       'opportunity' | 'threat'
  allAssets?: AffectedAsset[]
}) {
  const isOpp = kind === 'opportunity'
  const color = isOpp ? 'var(--price-up)' : 'var(--price-down)'
  const lower = text.toLowerCase()

  // Severity badge
  const severeWords   = ['invasion', 'war', 'crash', 'collapse', 'default', 'emergency', 'explosion']
  const moderateWords = ['escalat', 'sanction', 'conflict', 'recession', 'tariff', 'shortage']
  const severity = severeWords.some((w) => lower.includes(w)) ? 'SEVERE'
    : moderateWords.some((w) => lower.includes(w))            ? 'MODERATE'
    : 'MONITOR'
  const sevColor = severity === 'SEVERE' ? 'var(--price-down)' : severity === 'MODERATE' ? '#f97316' : 'var(--warning)'

  // Category linkage
  const related: string[] = []
  if (/gold|oil|crude|commodit|metal|energy|lng|opec/.test(lower))                related.push('Commodity')
  if (/fed|rate|inflation|bond|yield|dollar|macro|gdp|cpi/.test(lower))           related.push('Macro')
  if (/equity|stock|market|nasdaq|earnings|vix|volatil/.test(lower))              related.push('Market')
  if (/geopolit|conflict|sanction|war|china|russia|iran|tariff|tension/.test(lower)) related.push('Geopolitical')

  // Matching assets for impact vector
  const impactAssets = (allAssets ?? []).filter((a) => {
    const sl = a.symbol.toLowerCase()
    return (related.includes('Commodity') && ['gld', 'uso', 'gc=f', 'cl=f', 'slv'].includes(sl))
      || (related.includes('Macro')       && (a.type === 'forex' || ['tlt', 'vix'].includes(sl)))
      || (related.includes('Market')      && (a.type === 'stock' || a.type === 'etf'))
      || (related.includes('Geopolitical') && ['gld', 'uso', 'gc=f', 'cl=f', 'usd/jpy'].includes(sl))
  })

  return (
    <div>
      <div className="h-[3px] w-full" style={{ background: color }} />
      <div className="p-3 space-y-2">

        {/* Header row */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color }}>
            {isOpp ? 'Opportunity' : 'Threat'}
          </span>
          <span
            className="rounded px-1.5 py-px font-mono text-[8px] font-bold uppercase"
            style={{ color: sevColor, background: `${sevColor}18` }}
          >
            {severity}
          </span>
        </div>

        {/* Full verbatim text */}
        <p className="font-mono text-[10px] leading-relaxed text-[var(--text)]">{text}</p>

        {/* Trade expression / impact vector */}
        {impactAssets.length > 0 && (
          <div className="border-t border-[var(--border)] pt-2 space-y-1.5">
            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              {isOpp ? 'Trade Expression' : 'Impact Vector'}
            </span>
            <div className="flex flex-wrap gap-1">
              {impactAssets.map((a, i) => <AssetChip key={i} {...a} />)}
            </div>
          </div>
        )}

        {/* Category linkage */}
        {related.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 border-t border-[var(--border)] pt-2">
            <span className="font-mono text-[8px] text-[var(--text-muted)]">Linked to:</span>
            {related.map((r) => (
              <span
                key={r}
                className="rounded px-1.5 py-0.5 font-mono text-[8px]"
                style={{ color, background: `${color}18`, border: `1px solid ${color}30` }}
              >
                {r}
              </span>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

// ─── TrendTooltipContent ──────────────────────────────────────────────────

function TrendTooltipContent({
  score, history, data,
}: {
  score:    number
  history?: HistoryPoint[]
  data:     MarketRiskPayload
}) {
  const now   = Date.now()
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

  const points      = SLOTS.map((s) => ({ label: s.label, value: s.ms === 0 ? score : closest(s.ms) }))
  const validPoints = points.filter((p) => p.value !== null)
  const oldest      = validPoints[validPoints.length - 1]?.value ?? score
  const delta       = score - oldest
  const direction   = validPoints.length < 2 ? '→ Collecting' : delta > 3 ? '↑ Rising' : delta < -3 ? '↓ Easing' : '→ Stable'
  const dirColor    = validPoints.length < 2 ? 'var(--text-muted)' : delta > 3 ? 'var(--price-down)' : delta < -3 ? 'var(--price-up)' : 'var(--warning)'

  const allScores  = validPoints.map((p) => p.value as number)
  const sessionMin = allScores.length > 1 ? Math.min(...allScores) : null
  const sessionMax = allScores.length > 1 ? Math.max(...allScores) : null

  const topCat  = [...data.breakdown].sort((a, b) => b.score - a.score)[0]
  const outlook = validPoints.length < 2
    ? 'History accumulates every 5 minutes. Check back shortly for trend analysis.'
    : delta > 5  ? `Risk building — driven by ${topCat?.category ?? 'multiple factors'}.`
    : delta < -5 ? 'Risk is easing. Market conditions may be improving.'
    : `Risk stable. ${topCat?.category ?? 'No single category'} remains the primary contributor.`

  return (
    <div>
      <div className="h-[3px] w-full" style={{ background: 'var(--accent)' }} />
      <div className="p-3 space-y-2.5">

        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Risk Trend
          </span>
          <span className="font-mono text-[10px] font-bold" style={{ color: dirColor }}>{direction}</span>
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          {points.map((pt) => {
            const v        = pt.value
            const barColor = v != null
              ? (v >= 75 ? 'var(--price-down)' : v >= 55 ? '#f97316' : v >= 35 ? 'var(--warning)' : 'var(--price-up)')
              : 'var(--surface-3)'
            return (
              <div key={pt.label} className="flex items-center gap-2">
                <span className="w-9 font-mono text-[9px] tabular-nums text-[var(--text-muted)]">{pt.label}</span>
                <div className="flex-1 h-1 overflow-hidden rounded-full bg-[var(--surface-3)]">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${v ?? 0}%`, background: barColor, opacity: v != null ? 1 : 0 }} />
                </div>
                <span className="w-6 font-mono text-[9px] tabular-nums text-right font-bold"
                  style={{ color: v != null ? barColor : 'var(--text-muted)' }}>
                  {v ?? '—'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Session range */}
        {sessionMin !== null && sessionMax !== null && (
          <div className="flex items-center gap-2 border-t border-[var(--border)] pt-2">
            <div className="flex items-center gap-1">
              <span className="font-mono text-[8px] text-[var(--text-muted)]">Session Low</span>
              <span className="font-mono text-[9px] font-bold tabular-nums" style={{ color: 'var(--price-up)' }}>{sessionMin}</span>
            </div>
            <div className="h-px flex-1 bg-[var(--border)]" />
            <div className="flex items-center gap-1">
              <span className="font-mono text-[8px] text-[var(--text-muted)]">High</span>
              <span className="font-mono text-[9px] font-bold tabular-nums" style={{ color: 'var(--price-down)' }}>{sessionMax}</span>
            </div>
          </div>
        )}

        {/* Outlook */}
        <p className="font-mono text-[10px] leading-relaxed text-[var(--text)] border-t border-[var(--border)] pt-2">
          {outlook}
        </p>

        {validPoints.length >= 2 && delta !== 0 && (
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
    <svg viewBox="0 0 96 96" className="h-[140px] w-[140px]" aria-hidden>
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
  const assets    = data?.affectedAssets ?? []

  // ── Tooltip state ──────────────────────────────────────────────────────
  const [tip, setTip]  = useState<TooltipState | null>(null)
  const enterTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showTip = useCallback((
    e: React.MouseEvent,
    content: React.ReactNode,
    interactive = false,
  ) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    if (enterTimer.current) clearTimeout(enterTimer.current)
    const rect       = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const TOOLTIP_W  = 280
    const MARGIN     = 8
    const rawCx      = rect.left + rect.width / 2
    const cx         = Math.min(Math.max(rawCx, TOOLTIP_W / 2 + MARGIN), window.innerWidth - TOOLTIP_W / 2 - MARGIN)
    const spaceBelow = window.innerHeight - rect.bottom
    const placement: 'top' | 'bottom' = spaceBelow < 240 ? 'top' : 'bottom'
    enterTimer.current = setTimeout(() => {
      setTip({ content, x: cx, y: placement === 'top' ? rect.top : rect.bottom, placement, interactive })
    }, 130)
  }, [])

  const hideTip = useCallback(() => {
    if (enterTimer.current) clearTimeout(enterTimer.current)
    // Short delay so interactive tooltips can receive pointer
    leaveTimer.current = setTimeout(() => setTip(null), 80)
  }, [])

  const cancelHide = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
  }, [])

  const immediateHide = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
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

              {/* Ring — hoverable, interactive tooltip */}
              <div
                className="group relative h-[140px] w-[140px] shrink-0 cursor-default"
                onMouseEnter={(e) => showTip(e, <ScoreTooltipContent data={data} />, true)}
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
                  <span className="mt-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: scoreColor }}>
                    {LEVEL_LABEL[data.level] ?? data.level}
                  </span>
                </div>
                <div className="absolute bottom-2 right-2 pointer-events-none">
                  <InfoDot />
                </div>
              </div>

              {/* Category bars — each has interactive tooltip */}
              <div className="flex flex-1 flex-col justify-center gap-3">
                {breakdown.map((cat) => (
                  <div
                    key={cat.key}
                    className="group cursor-default"
                    onMouseEnter={(e) => showTip(e,
                      <CategoryTooltipContent cat={cat} detail={data.categoryDetails?.[cat.key]} allAssets={assets} />,
                      true,
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
                      className="group flex items-center gap-1 cursor-default"
                      onMouseEnter={(e) => showTip(e,
                        <ItemTooltipContent text={item} kind="opportunity" allAssets={assets} />,
                        true,
                      )}
                      onMouseLeave={hideTip}
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full self-center" style={{ background: 'var(--price-up)' }} />
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
                      className="group flex items-center gap-1 cursor-default"
                      onMouseEnter={(e) => showTip(e,
                        <ItemTooltipContent text={item} kind="threat" allAssets={assets} />,
                        true,
                      )}
                      onMouseLeave={hideTip}
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full self-center" style={{ background: 'var(--price-down)' }} />
                      <span className="line-clamp-2 font-mono text-[9px] leading-snug text-[var(--text)] group-hover:text-[var(--price-down)] transition-colors duration-150">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* ── ROW 3: Risk Trend ── */}
            <div
              className="group mt-2 rounded border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 cursor-default hover:border-[var(--accent)]/30 transition-colors duration-150"
              onMouseEnter={(e) => showTip(e,
                <TrendTooltipContent score={data.score} history={data.history} data={data} />,
                false,
              )}
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
      {tip && (
        <TooltipPortal
          tip={tip}
          onMouseEnter={cancelHide}
          onMouseLeave={immediateHide}
        />
      )}
    </div>
  )
}
