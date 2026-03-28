'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

type Edition = 'morning' | 'close' | 'weekend' | 'weekly'
type SlideType =
  | 'cover' | 'scoreboard' | 'sentiment' | 'narrative' | 'movers'
  | 'energy' | 'crypto' | 'forex' | 'sectors' | 'radar'
  | 'outlook' | 'pulse' | 'cta'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SlideData { type: SlideType; title: string; label: string; content: Record<string, any> }
interface BriefPayload { slides: SlideData[]; edition: Edition; generatedAt: string; date: string; slideCount: number }

// ─── Design tokens ──────────────────────────────────────────────────────────

const T = {
  bg:       '#09090b',
  card:     '#111113',
  border:   'rgba(255,255,255,0.06)',
  green:    '#10B981',
  greenDim: 'rgba(16,185,129,0.12)',
  red:      '#ef4444',
  redDim:   'rgba(239,68,68,0.12)',
  amber:    '#f59e0b',
  amberDim: 'rgba(245,158,11,0.12)',
  text:     'rgba(255,255,255,0.92)',
  text2:    'rgba(255,255,255,0.55)',
  muted:    'rgba(255,255,255,0.25)',
  dim:      'rgba(255,255,255,0.08)',
  mono:     "ui-monospace, 'SF Mono', 'JetBrains Mono', monospace",
  sans:     "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
} as const

// ─── Main component ─────────────────────────────────────────────────────────

export default function DailyBriefRenderer() {
  const [edition, setEdition] = useState<Edition>(() => {
    const now = new Date()
    const day = now.getUTCDay()
    const hour = now.getUTCHours()
    if (day === 0 || day === 6 || (day === 1 && hour < 14)) return 'weekend'
    if (day === 5 && hour >= 17) return 'weekly'
    return hour < 17 ? 'morning' : 'close'
  })
  const [data, setData]       = useState<BriefPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  const fetchBrief = useCallback(async (ed: Edition) => {
    setLoading(true)
    setError(false)
    try {
      const r = await fetch(`/api/social/daily-brief?edition=${ed}`)
      if (!r.ok) throw new Error('fetch failed')
      setData(await r.json())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBrief(edition) }, [edition, fetchBrief])

  const editions: { key: Edition; label: string }[] = [
    { key: 'morning', label: 'Morning' },
    { key: 'close',   label: 'Close' },
    { key: 'weekend', label: 'Weekend' },
    { key: 'weekly',  label: 'Weekly' },
  ]

  if (loading) return (
    <PageShell>
      <EditionBar editions={editions} active={edition} onChange={setEdition} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{
            width: '100%', maxWidth: 540, aspectRatio: '4/5',
            background: T.card, borderRadius: 16, animation: 'dbPulse 2s ease-in-out infinite',
            animationDelay: `${i * 80}ms`,
          }} />
        ))}
      </div>
      <style>{`@keyframes dbPulse { 0%,100% { opacity: 0.25; } 50% { opacity: 0.5; } }`}</style>
    </PageShell>
  )

  if (error || !data) return (
    <PageShell>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minHeight: '60vh' }}>
        <p style={{ fontFamily: T.mono, fontSize: 14, color: T.text2 }}>Could not generate today&apos;s brief. Try refreshing.</p>
        <button onClick={() => fetchBrief(edition)} style={{
          fontFamily: T.mono, fontSize: 13, padding: '10px 24px', borderRadius: 8,
          background: T.green, color: '#000', border: 'none', cursor: 'pointer', fontWeight: 600,
        }}>Retry</button>
      </div>
    </PageShell>
  )

  const total = data.slides.length
  const dateStr = new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <PageShell>
      <EditionBar editions={editions} active={edition} onChange={setEdition} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        {data.slides.map((slide, idx) => (
          <SlideFrame key={idx} slide={slide} index={idx} total={total} date={dateStr} edition={data.edition} />
        ))}
      </div>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#050506', minHeight: '100vh', padding: '20px 16px 60px' }}>{children}</div>
}

function EditionBar({ editions, active, onChange }: {
  editions: { key: Edition; label: string }[]; active: Edition; onChange: (e: Edition) => void
}) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: '3px', background: T.card, borderRadius: 10,
      maxWidth: 380, margin: '0 auto 24px', border: `1px solid ${T.border}`,
    }}>
      {editions.map(({ key, label }) => (
        <button key={key} onClick={() => onChange(key)} style={{
          fontFamily: T.mono, fontSize: 11, fontWeight: active === key ? 700 : 500,
          padding: '7px 12px', borderRadius: 7, flex: 1,
          background: active === key ? T.green : 'transparent',
          color: active === key ? '#000' : T.text2,
          border: 'none', cursor: 'pointer', transition: 'all 0.15s',
        }}>{label}</button>
      ))}
    </div>
  )
}

// ─── Slide frame ────────────────────────────────────────────────────────────

function SlideFrame({ slide, index, total, date, edition }: {
  slide: SlideData; index: number; total: number; date: string; edition: Edition
}) {
  const isLast = index === total - 1
  return (
    <div style={{
      width: '100%', maxWidth: 540, aspectRatio: '4/5',
      background: `radial-gradient(ellipse at 50% 20%, #0e0e12 0%, ${T.bg} 60%)`,
      borderRadius: 16, border: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.green, display: 'inline-block', boxShadow: `0 0 6px ${T.green}` }} />
          <span style={{ fontFamily: T.mono, fontSize: 8, color: T.muted, letterSpacing: '0.15em' }}>MARKETLENS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: T.mono, fontSize: 8, color: T.muted }}>{date}</span>
          <span style={{
            fontFamily: T.mono, fontSize: 7, fontWeight: 700, color: T.green,
            padding: '2px 6px', borderRadius: 3, background: T.greenDim, letterSpacing: '0.08em',
          }}>
            {{ morning: 'AM', close: 'PM', weekend: 'WEEK', weekly: 'WRAP' }[edition]}
          </span>
        </div>
      </div>

      {/* Label + line */}
      <div style={{ padding: '8px 18px 0' }}>
        <span style={{ fontFamily: T.mono, fontSize: 8, color: T.muted, letterSpacing: '0.15em' }}>{slide.label}</span>
        <div style={{ width: 24, height: 2, background: T.green, marginTop: 4, borderRadius: 1 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '8px 18px 4px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <SlideContent slide={slide} edition={edition} />
      </div>

      {/* Bottom bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px 10px' }}>
        <span style={{ fontFamily: T.mono, fontSize: 8, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{index + 1}/{total}</span>
        {!isLast && <span style={{ fontFamily: T.mono, fontSize: 8, color: T.muted, opacity: 0.6 }}>swipe &rarr;</span>}
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} style={{
              width: i === index ? 10 : 4, height: 3, borderRadius: 2,
              background: i === index ? T.green : T.dim, display: 'inline-block',
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Slide router ───────────────────────────────────────────────────────────

function SlideContent({ slide, edition }: { slide: SlideData; edition: Edition }) {
  const c = slide.content
  switch (slide.type) {
    case 'cover':      return <CoverSlide c={c} title={slide.title} label={slide.label} edition={edition} />
    case 'scoreboard': return <ScoreboardSlide c={c} />
    case 'sentiment':  return <SentimentSlide c={c} />
    case 'narrative':  return <NarrativeSlide c={c} title={slide.title} />
    case 'movers':     return <MoversSlide c={c} />
    case 'energy':     return <EnergySlide c={c} />
    case 'crypto':     return <CryptoSlide c={c} />
    case 'forex':      return <ForexSlide c={c} />
    case 'sectors':    return <SectorsSlide c={c} />
    case 'radar':      return <RadarSlide c={c} />
    case 'outlook':    return <OutlookSlide c={c} edition={edition} />
    case 'pulse':      return <PulseSlide c={c} />
    case 'cta':        return <CtaSlide c={c} />
    default:           return null
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, d = 2): string {
  if (n == null || isNaN(n)) return '\u2014'
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}
function pc(n: number | null | undefined): string { return (n ?? 0) >= 0 ? T.green : T.red }
function pb(n: number | null | undefined): string { return (n ?? 0) >= 0 ? T.greenDim : T.redDim }
function ps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '\u2014'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}
function ar(n: number | null | undefined): string { return (n ?? 0) >= 0 ? '\u25B2' : '\u25BC' }

const tabNums = { fontVariantNumeric: 'tabular-nums' as const }

// ─── COVER — edition-specific layouts ───────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CoverSlide({ c, title, label, edition }: { c: Record<string, any>; title: string; label: string; edition: Edition }) {
  const heroes = c.heroQuotes ?? []
  const topG = c.topGainer
  const topL = c.topLoser
  const fgScore = c.fearGreedScore

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 4 }}>
      {/* Top: edition pill */}
      <div style={{ textAlign: 'center' }}>
        <span style={{
          fontFamily: T.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.2em',
          color: T.green, padding: '3px 12px', borderRadius: 20,
          border: '1px solid rgba(16,185,129,0.2)',
        }}>{label}</span>
      </div>

      {/* Middle: headline */}
      <div style={{ textAlign: 'center', padding: '0 8px' }}>
        <h1 style={{
          fontFamily: T.sans, fontSize: 26, fontWeight: 800, color: T.text,
          lineHeight: 1.15, margin: '0 0 8px', letterSpacing: '-0.4px',
        }}>{title}</h1>
        {c.subtitle && (
          <div style={{
            fontFamily: T.mono, fontSize: 12, color: T.text2, lineHeight: 1.5,
            padding: '8px 16px', borderRadius: 8, background: T.card,
            border: `1px solid ${T.border}`, display: 'inline-block',
          }}>{c.subtitle}</div>
        )}
      </div>

      {/* Bottom: hero price grid + movers strip */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Hero prices */}
        <div style={{ display: 'flex', gap: 4 }}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {heroes.map((q: any) => (
            <div key={q.symbol} style={{
              flex: 1, background: T.card, borderRadius: 8, padding: '8px 6px',
              border: `1px solid ${T.border}`, textAlign: 'center',
            }}>
              <div style={{ fontFamily: T.mono, fontSize: 8, color: T.muted, marginBottom: 3, letterSpacing: '0.05em' }}>{q.name}</div>
              <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: T.text, ...tabNums }}>${fmt(q.price)}</div>
              <div style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: pc(q.changePercent), ...tabNums, marginTop: 2 }}>
                {ps(q.changePercent)}
              </div>
            </div>
          ))}
        </div>

        {/* Movers + F&G strip */}
        <div style={{ display: 'flex', gap: 4 }}>
          {topG && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 6, background: T.greenDim }}>
              <span style={{ fontFamily: T.mono, fontSize: 7, color: T.muted }}>TOP</span>
              <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.green }}>{topG.symbol}</span>
              <span style={{ fontFamily: T.mono, fontSize: 9, color: T.green, ...tabNums, marginLeft: 'auto' }}>+{topG.changePercent?.toFixed(1)}%</span>
            </div>
          )}
          {topL && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 6, background: T.redDim }}>
              <span style={{ fontFamily: T.mono, fontSize: 7, color: T.muted }}>BOT</span>
              <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.red }}>{topL.symbol}</span>
              <span style={{ fontFamily: T.mono, fontSize: 9, color: T.red, ...tabNums, marginLeft: 'auto' }}>{topL.changePercent?.toFixed(1)}%</span>
            </div>
          )}
          {fgScore != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px', borderRadius: 6, background: T.dim }}>
              <span style={{ fontFamily: T.mono, fontSize: 7, color: T.muted }}>F&G</span>
              <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 800, color: fgScore <= 30 ? T.red : fgScore <= 55 ? T.amber : T.green }}>{fgScore}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── SCOREBOARD — 2x4 dense grid ───────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ScoreboardSlide({ c }: { c: Record<string, any> }) {
  const quotes = c.quotes ?? []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {quotes.map((q: any) => (
          <div key={q.symbol} style={{
            background: T.card, borderRadius: 8, padding: '10px 10px 8px',
            border: `1px solid ${T.border}`,
            borderLeft: `3px solid ${pc(q.changePercent)}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: '0.05em' }}>{q.name}</span>
              <span style={{
                fontFamily: T.mono, fontSize: 8, color: pc(q.changePercent), fontWeight: 700,
                padding: '1px 5px', borderRadius: 3, background: pb(q.changePercent),
              }}>{ar(q.changePercent)}</span>
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 700, color: T.text, ...tabNums, lineHeight: 1 }}>
              ${fmt(q.price)}
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: pc(q.changePercent), ...tabNums, marginTop: 3 }}>
              {ps(q.changePercent)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SENTIMENT — fixed gauge colors ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SentimentSlide({ c }: { c: Record<string, any> }) {
  const fg = c.fearGreed
  const score = fg?.score ?? 50
  const rating = fg?.rating ?? 'Neutral'
  const gColor = score <= 25 ? T.red : score <= 45 ? T.amber : score <= 55 ? T.text2 : T.green
  // Track uses a dim version of the SAME color so they look cohesive
  const gTrack = score <= 25 ? 'rgba(239,68,68,0.15)' : score <= 45 ? 'rgba(245,158,11,0.15)' : score <= 55 ? 'rgba(255,255,255,0.06)' : 'rgba(16,185,129,0.15)'

  const r = 64, cx = 80, cy = 76
  const startA = Math.PI
  const progA = startA - (score / 100) * Math.PI
  const sx = cx + r * Math.cos(startA), sy = cy + r * Math.sin(startA)
  const ex = cx + r * Math.cos(progA), ey = cy + r * Math.sin(progA)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 2 }}>
      {/* Gauge */}
      <div style={{ textAlign: 'center' }}>
        <svg width={160} height={96} viewBox="0 0 160 96">
          <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke={gTrack} strokeWidth={8} strokeLinecap="round" />
          <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${score > 50 ? 1 : 0} 1 ${ex} ${ey}`}
            fill="none" stroke={gColor} strokeWidth={8} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${gColor})` }} />
          <text x={cx} y={cy - 10} textAnchor="middle" fill={T.text}
            style={{ fontFamily: T.mono, fontSize: 32, fontWeight: 800 }}>{score}</text>
          <text x={cx} y={cy + 8} textAnchor="middle" fill={gColor}
            style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>{rating.toUpperCase()}</text>
        </svg>
      </div>

      {/* Crypto F&G side by side */}
      {c.cryptoFearGreed && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 6, background: T.card, border: `1px solid ${T.border}`,
        }}>
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted }}>CRYPTO F&G</span>
          <span style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 800, color: T.text }}>{c.cryptoFearGreed.score}</span>
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.text2, padding: '1px 6px', borderRadius: 3, background: T.dim }}>{c.cryptoFearGreed.label}</span>
        </div>
      )}

      {/* Risk bar */}
      {c.riskLevel && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: '0.1em' }}>RISK LEVEL</span>
            <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 600, color: T.text2 }}>{c.riskLevel.label}</span>
          </div>
          <div style={{ height: 5, background: T.card, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.border}` }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${Math.min(100, c.riskLevel.score)}%`,
              background: c.riskLevel.score > 70 ? T.red : c.riskLevel.score > 40 ? T.amber : T.green,
              boxShadow: `0 0 6px ${c.riskLevel.score > 70 ? T.red : c.riskLevel.score > 40 ? T.amber : T.green}`,
            }} />
          </div>
        </div>
      )}

      {/* Radar + verdict */}
      <div style={{ display: 'flex', gap: 6 }}>
        {c.radarVerdict && c.radarVerdict !== 'MIXED' && (
          <div style={{
            padding: '6px 14px', borderRadius: 6, background: T.card, border: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted }}>RADAR</span>
            <span style={{
              fontFamily: T.mono, fontSize: 13, fontWeight: 800,
              color: c.radarVerdict === 'BUY' ? T.green : c.radarVerdict === 'SELL' ? T.red : T.amber,
            }}>{c.radarVerdict}</span>
          </div>
        )}
        {c.sentimentVerdict && (
          <div style={{ flex: 1, padding: '6px 10px', borderRadius: 6, background: T.card, border: `1px solid ${T.border}` }}>
            <p style={{ fontFamily: T.sans, fontSize: 11, color: T.text2, margin: 0, lineHeight: 1.4, fontStyle: 'italic' }}>
              &ldquo;{c.sentimentVerdict}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── NARRATIVE ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NarrativeSlide({ c, title }: { c: Record<string, any>; title: string }) {
  const cps = c.chokepoints ?? []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 10 }}>
      <h3 style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 700, color: T.text, margin: 0 }}>{title}</h3>
      <div style={{ position: 'relative', paddingLeft: 14 }}>
        <div style={{ position: 'absolute', left: 0, top: -6, fontFamily: 'Georgia, serif', fontSize: 40, color: T.green, opacity: 0.15, lineHeight: 1 }}>&ldquo;</div>
        <p style={{ fontFamily: T.sans, fontSize: 14, color: 'rgba(255,255,255,0.78)', lineHeight: 1.6, margin: 0 }}>{c.narrative}</p>
      </div>
      {cps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {cps.slice(0, 3).map((cp: any, i: number) => {
            const clr = cp.status === 'DISRUPTED' ? T.red : cp.status === 'ELEVATED' ? T.amber : T.green
            return (
              <div key={i} style={{
                padding: '6px 10px', background: T.card, borderRadius: 6,
                borderLeft: `3px solid ${clr}`, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: T.text }}>{cp.name}</span>
                <span style={{ fontFamily: T.mono, fontSize: 8, padding: '1px 5px', borderRadius: 3, background: `${clr}18`, color: clr, fontWeight: 700 }}>{cp.status}</span>
                {cp.description && <span style={{ fontFamily: T.sans, fontSize: 9, color: T.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{cp.description}</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── MOVERS — 5 per side, compact ───────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MoversSlide({ c }: { c: Record<string, any> }) {
  const gainers = c.gainers ?? []
  const losers = c.losers ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Row = ({ m, clr, bg }: { m: any; clr: string; bg: string }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '5px 8px', background: T.card, borderRadius: 6, border: `1px solid ${T.border}`,
    }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.text }}>{m.symbol}</span>
        <span style={{ fontFamily: T.sans, fontSize: 9, color: T.muted }}>{m.name}</span>
      </div>
      <span style={{
        fontFamily: T.mono, fontSize: 12, fontWeight: 800, color: clr,
        ...tabNums, padding: '1px 6px', borderRadius: 4, background: bg, flexShrink: 0,
      }}>{ps(m.changePercent)}</span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1 }}>
        <div style={{ width: 3, height: 12, background: T.green, borderRadius: 2 }} />
        <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 700, color: T.green, letterSpacing: '0.12em' }}>WINNERS</span>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {gainers.slice(0, 5).map((m: any, i: number) => <Row key={i} m={m} clr={T.green} bg={T.greenDim} />)}

      <div style={{ height: 1, background: T.border, margin: '3px 0' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1 }}>
        <div style={{ width: 3, height: 12, background: T.red, borderRadius: 2 }} />
        <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 700, color: T.red, letterSpacing: '0.12em' }}>LOSERS</span>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {losers.slice(0, 5).map((m: any, i: number) => <Row key={i} m={m} clr={T.red} bg={T.redDim} />)}
    </div>
  )
}

// ─── ENERGY — hero + 2-col grid ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EnergySlide({ c }: { c: Record<string, any> }) {
  const oil = c.oil
  const isUp = oil && oil.changePercent >= 0
  const items = [
    { name: 'Gold', data: c.gold },
    { name: 'Silver', data: c.silver },
    { name: 'Nat Gas', data: c.natgas },
  ].filter(o => o.data)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 2 }}>
      {oil && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: '0.15em', marginBottom: 4 }}>CRUDE OIL</div>
          <div style={{ fontFamily: T.mono, fontSize: 40, fontWeight: 800, color: T.text, ...tabNums, lineHeight: 1 }}>${fmt(oil.price)}</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
            padding: '3px 10px', borderRadius: 5, background: pb(oil.changePercent),
          }}>
            <span style={{ fontSize: 9, color: pc(oil.changePercent) }}>{ar(oil.changePercent)}</span>
            <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: pc(oil.changePercent), ...tabNums }}>{ps(oil.changePercent)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
            <svg width={100} height={24} viewBox="0 0 100 24" style={{ opacity: 0.4 }}>
              <polyline points={isUp ? '0,20 16,17 33,14 50,16 66,10 83,7 100,4' : '0,4 16,7 33,12 50,9 66,15 83,18 100,20'}
                fill="none" stroke={isUp ? T.green : T.red} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: items.length === 3 ? '1fr 1fr 1fr' : '1fr 1fr', gap: 6 }}>
        {items.map(({ name, data }) => (
          <div key={name} style={{
            background: T.card, borderRadius: 8, padding: '8px', border: `1px solid ${T.border}`, textAlign: 'center',
          }}>
            <div style={{ fontFamily: T.mono, fontSize: 8, color: T.muted, marginBottom: 3 }}>{name.toUpperCase()}</div>
            <div style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 700, color: T.text, ...tabNums }}>${fmt(data.price)}</div>
            <div style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: pc(data.changePercent), ...tabNums, marginTop: 2 }}>{ps(data.changePercent)}</div>
          </div>
        ))}
      </div>

      {c.narrative && (
        <p style={{ fontFamily: T.sans, fontSize: 12, color: T.text2, margin: 0, lineHeight: 1.4, textAlign: 'center' }}>{c.narrative}</p>
      )}
    </div>
  )
}

// ─── CRYPTO ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CryptoSlide({ c }: { c: Record<string, any> }) {
  const btc = c.btc
  const alts = [
    { name: 'Ethereum', sym: 'ETH', data: c.eth },
    { name: 'Solana', sym: 'SOL', data: c.sol },
  ].filter(o => o.data)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 2 }}>
      {btc && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: '0.15em', marginBottom: 4 }}>BITCOIN</div>
          <div style={{ fontFamily: T.mono, fontSize: 34, fontWeight: 800, color: T.text, ...tabNums, lineHeight: 1 }}>${fmt(btc.price)}</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
            padding: '3px 10px', borderRadius: 5, background: pb(btc.changePercent),
          }}>
            <span style={{ fontSize: 9, color: pc(btc.changePercent) }}>{ar(btc.changePercent)}</span>
            <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: pc(btc.changePercent), ...tabNums }}>{ps(btc.changePercent)}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {alts.map(({ name, sym, data }) => (
          <div key={sym} style={{ background: T.card, borderRadius: 8, padding: '10px', border: `1px solid ${T.border}` }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, marginBottom: 3 }}>{name.toUpperCase()}</div>
            <div style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 700, color: T.text, ...tabNums }}>${fmt(data.price)}</div>
            <div style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: pc(data.changePercent), ...tabNums, marginTop: 2 }}>{ps(data.changePercent)}</div>
          </div>
        ))}
      </div>

      {c.cryptoFearGreed && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '8px 12px', background: T.card, borderRadius: 8, border: `1px solid ${T.border}`,
        }}>
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: '0.08em' }}>CRYPTO F&G</span>
          <span style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 800, color: T.text }}>{c.cryptoFearGreed.score}</span>
          <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 600, color: T.text2, padding: '1px 6px', borderRadius: 3, background: T.dim }}>{c.cryptoFearGreed.label}</span>
        </div>
      )}

      {c.narrative && (
        <p style={{ fontFamily: T.sans, fontSize: 12, color: T.text2, margin: 0, lineHeight: 1.4, textAlign: 'center' }}>{c.narrative}</p>
      )}
    </div>
  )
}

// ─── FOREX ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ForexSlide({ c }: { c: Record<string, any> }) {
  const dxy = c.dxy
  const currencies = c.currencies ?? []
  const maxScore = Math.max(...currencies.map((f: { score: number }) => Math.abs(f.score)), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', paddingTop: 2, paddingBottom: 2 }}>
      {dxy && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 12px', background: T.card, borderRadius: 8, border: `1px solid ${T.border}`,
        }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, marginBottom: 1 }}>US DOLLAR INDEX</div>
            <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 800, color: T.text, ...tabNums }}>{fmt(dxy.price)}</div>
          </div>
          <span style={{
            fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: pc(dxy.changePercent),
            ...tabNums, padding: '3px 8px', borderRadius: 5, background: pb(dxy.changePercent),
          }}>{ps(dxy.changePercent)}</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {currencies.slice(0, 9).map((f: { currency: string; score: number }) => {
          const bw = (Math.abs(f.score) / maxScore) * 100
          return (
            <div key={f.currency} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.text, width: 28 }}>{f.currency}</span>
              <div style={{ flex: 1, height: 7, background: T.card, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 4, background: f.score >= 0 ? T.green : T.red, width: `${Math.max(bw, 3)}%` }} />
              </div>
              <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 600, color: pc(f.score), width: 32, textAlign: 'right', ...tabNums }}>
                {f.score > 0 ? '+' : ''}{f.score.toFixed(1)}
              </span>
            </div>
          )
        })}
      </div>

      {c.narrative && (
        <p style={{ fontFamily: T.sans, fontSize: 12, color: T.text2, margin: 0, lineHeight: 1.4, textAlign: 'center' }}>{c.narrative}</p>
      )}
    </div>
  )
}

// ─── SECTORS ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectorsSlide({ c }: { c: Record<string, any> }) {
  const sectors = c.sectors ?? []
  const mx = Math.max(...sectors.map((s: { score: number }) => Math.abs(s.score)), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 5 }}>
      {sectors.map((s: { sector: string; score: number }) => {
        const bw = (Math.abs(s.score) / mx) * 42
        return (
          <div key={s.sector} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              fontFamily: T.mono, fontSize: 9, color: T.text2, fontWeight: 600,
              width: 82, textAlign: 'right', flexShrink: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
            }}>{s.sector}</span>
            <div style={{ flex: 1, height: 9, position: 'relative', background: T.card, borderRadius: 5 }}>
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: T.muted }} />
              <div style={{
                position: 'absolute', height: '100%', borderRadius: 5,
                background: s.score >= 0 ? T.green : T.red,
                width: `${Math.max(bw, 1)}%`,
                ...(s.score >= 0 ? { left: '50%' } : { right: '50%' }),
              }} />
            </div>
            <span style={{
              fontFamily: T.mono, fontSize: 9, fontWeight: 700, color: pc(s.score),
              width: 30, textAlign: 'right', ...tabNums, flexShrink: 0,
            }}>{s.score > 0 ? '+' : ''}{s.score.toFixed(1)}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── RADAR ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RadarSlide({ c }: { c: Record<string, any> }) {
  const verdict = c.verdict ?? 'MIXED'
  const signals = c.signals ?? []
  const vc = verdict === 'BUY' ? T.green : verdict === 'SELL' ? T.red : verdict === 'CASH' ? T.amber : T.text2
  const vb = verdict === 'BUY' ? T.greenDim : verdict === 'SELL' ? T.redDim : verdict === 'CASH' ? T.amberDim : T.dim

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 8 }}>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ display: 'inline-block', padding: '10px 28px', borderRadius: 10, background: vb, border: `1px solid ${vc}30` }}>
          <div style={{ fontFamily: T.sans, fontSize: 28, fontWeight: 800, color: vc, letterSpacing: '0.04em' }}>{verdict}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {signals.slice(0, 6).map((s: any, i: number) => {
          const sv = s.verdict ?? s.signal ?? 'HOLD'
          const sc = sv === 'BUY' ? T.green : sv === 'SELL' ? T.red : T.amber
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', background: T.card, borderRadius: 6, border: `1px solid ${T.border}`,
            }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: T.text, flex: 1 }}>{s.name ?? s.label ?? s.asset ?? `Signal ${i + 1}`}</span>
              <span style={{
                fontFamily: T.mono, fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
                background: `${sc}18`, color: sc, letterSpacing: '0.04em',
              }}>{sv}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── OUTLOOK ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OutlookSlide({ c, edition }: { c: Record<string, any>; edition: Edition }) {
  const items = c.watchItems ?? []
  const econ = c.econEvents ?? []
  const earnings = c.earnings ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item: string, i: number) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 800, color: T.green, width: 20, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontFamily: T.sans, fontSize: 14, color: T.text, lineHeight: 1.4 }}>{item}</span>
          </div>
        ))}
      </div>

      {(econ.length > 0 || earnings.length > 0) && (
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {econ.length > 0 && (
            <div>
              <span style={{ fontFamily: T.mono, fontSize: 8, color: T.muted, letterSpacing: '0.1em' }}>
                {edition === 'morning' ? 'ECONOMIC EVENTS TODAY' : 'UPCOMING EVENTS'}
              </span>
              <p style={{ fontFamily: T.mono, fontSize: 11, color: T.text2, margin: '3px 0 0', lineHeight: 1.5 }}>{econ.join(' \u00B7 ')}</p>
            </div>
          )}
          {earnings.length > 0 && (
            <div>
              <span style={{ fontFamily: T.mono, fontSize: 8, color: T.muted, letterSpacing: '0.1em' }}>EARNINGS</span>
              <p style={{ fontFamily: T.mono, fontSize: 11, color: T.text2, margin: '3px 0 0', lineHeight: 1.5 }}>{earnings.join(' \u00B7 ')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── PULSE ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PulseSlide({ c }: { c: Record<string, any> }) {
  const headlines = c.headlines ?? []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 10 }}>
      {c.pulseText && (
        <div style={{
          padding: '14px 14px', borderRadius: 10,
          background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)',
          position: 'relative',
        }}>
          <span style={{ position: 'absolute', top: 8, right: 10, fontFamily: T.mono, fontSize: 7, color: T.green, letterSpacing: '0.1em', opacity: 0.5 }}>AI ANALYSIS</span>
          <p style={{ fontFamily: T.sans, fontSize: 14, color: T.text, lineHeight: 1.6, margin: 0 }}>{c.pulseText}</p>
        </div>
      )}
      {headlines.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: T.mono, fontSize: 8, color: T.muted, letterSpacing: '0.1em' }}>TOP HEADLINES</span>
          {headlines.map((h: string, i: number) => (
            <div key={i} style={{ padding: '6px 10px', background: T.card, borderRadius: 6, border: `1px solid ${T.border}` }}>
              <p style={{ fontFamily: T.sans, fontSize: 12, color: T.text2, margin: 0, lineHeight: 1.35 }}>{h}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── CTA ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CtaSlide({ c }: { c: Record<string, any> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
      <svg width={64} height={64} viewBox="0 0 100 100" fill="none">
        <defs>
          <filter id="ctaG" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect x="5" y="5" width="90" height="90" rx="18" stroke="#00FF88" strokeWidth="2" fill="none" opacity="0.25" />
        <line x1="14" y1="78" x2="86" y2="78" stroke="#00FF88" strokeWidth="1" opacity="0.1" />
        <polygon points="14,68 28,52 40,58 54,28 66,38 78,18 86,24 86,78 14,78" fill="#00FF88" opacity="0.15" />
        <polyline points="14,68 28,52 40,58 54,28 66,38 78,18 86,24" stroke="#00FF88" strokeWidth="3.5" strokeLinejoin="round" fill="none" filter="url(#ctaG)" />
      </svg>
      <div style={{ fontFamily: T.sans, fontSize: 26, fontWeight: 700, color: '#F0F0F5', letterSpacing: '-0.3px' }}>
        Market<span style={{ color: '#00FF88', fontWeight: 800 }}>Lens</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, display: 'inline-block', boxShadow: `0 0 8px ${T.green}` }} />
        <span style={{ fontFamily: T.mono, fontSize: 10, color: T.text2, letterSpacing: '0.12em', fontWeight: 600 }}>LIVE</span>
      </div>
      <p style={{ fontFamily: T.sans, fontSize: 13, color: T.text2, margin: 0, lineHeight: 1.5, maxWidth: 280 }}>{c.tagline}</p>
      <p style={{ fontFamily: T.mono, fontSize: 12, color: T.green, margin: 0, fontWeight: 700 }}>100% free. No signup needed.</p>
      <div style={{
        padding: '11px 32px', borderRadius: 10, background: T.green, color: '#000',
        fontFamily: T.mono, fontSize: 14, fontWeight: 800, boxShadow: '0 0 20px rgba(16,185,129,0.3)',
      }}>marketlens.live</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted }}>Link in bio</span>
        <span style={{ fontFamily: T.sans, fontSize: 11, color: T.text2, fontStyle: 'italic' }}>{c.followCta}</span>
      </div>
    </div>
  )
}
