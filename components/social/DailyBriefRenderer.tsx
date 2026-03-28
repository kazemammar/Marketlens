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

// ─── Design tokens — Instagram-optimized ────────────────────────────────────

const T = {
  bg:       '#09090b',
  card:     '#111113',
  card2:    '#161618',
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

  // ─── Loading state ──────────────────────────────────────────────────────
  if (loading) return (
    <PageShell>
      <EditionBar editions={editions} active={edition} onChange={setEdition} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{
            width: '100%', maxWidth: 540, aspectRatio: '4/5',
            background: T.card, borderRadius: 16, animation: 'dbPulse 2s ease-in-out infinite',
            animationDelay: `${i * 100}ms`,
          }} />
        ))}
      </div>
      <style>{`@keyframes dbPulse { 0%,100% { opacity: 0.3; } 50% { opacity: 0.6; } }`}</style>
    </PageShell>
  )

  // ─── Error state ────────────────────────────────────────────────────────
  if (error || !data) return (
    <PageShell>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 16, minHeight: '60vh',
      }}>
        <p style={{ fontFamily: T.mono, fontSize: 14, color: T.text2 }}>
          Could not generate today&apos;s brief. Try refreshing.
        </p>
        <button onClick={() => fetchBrief(edition)} style={{
          fontFamily: T.mono, fontSize: 13, padding: '10px 24px', borderRadius: 8,
          background: T.green, color: '#000', border: 'none', cursor: 'pointer',
          fontWeight: 600,
        }}>
          Retry
        </button>
      </div>
    </PageShell>
  )

  // ─── Slides ─────────────────────────────────────────────────────────────
  const total = data.slides.length
  const dateStr = new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })

  return (
    <PageShell>
      <EditionBar editions={editions} active={edition} onChange={setEdition} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        {data.slides.map((slide, idx) => (
          <SlideFrame key={idx} slide={slide} index={idx} total={total}
            date={dateStr} edition={data.edition} />
        ))}
      </div>
    </PageShell>
  )
}

// ─── Page shell ─────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#050506', minHeight: '100vh', padding: '20px 16px 60px' }}>
      {children}
    </div>
  )
}

// ─── Edition bar ────────────────────────────────────────────────────────────

function EditionBar({ editions, active, onChange }: {
  editions: { key: Edition; label: string }[]
  active: Edition
  onChange: (e: Edition) => void
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 28,
      padding: '4px', background: T.card, borderRadius: 10,
      maxWidth: 400, margin: '0 auto 28px',
      border: `1px solid ${T.border}`,
    }}>
      {editions.map(({ key, label }) => (
        <button key={key} onClick={() => onChange(key)} style={{
          fontFamily: T.mono, fontSize: 11, fontWeight: active === key ? 700 : 500,
          letterSpacing: '0.03em',
          padding: '8px 14px', borderRadius: 7, flex: 1,
          background: active === key ? T.green : 'transparent',
          color: active === key ? '#000' : T.text2,
          border: 'none', cursor: 'pointer', transition: 'all 0.2s',
        }}>
          {label}
        </button>
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
      background: `radial-gradient(ellipse at 50% 30%, #0d0d10 0%, ${T.bg} 70%)`,
      borderRadius: 16, border: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.green, display: 'inline-block', boxShadow: `0 0 6px ${T.green}` }} />
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: '0.15em' }}>
            MARKETLENS
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted }}>{date}</span>
          <EditionBadge edition={edition} />
        </div>
      </div>

      {/* Label + accent line */}
      <div style={{ padding: '10px 20px 0' }}>
        <span style={{
          fontFamily: T.mono, fontSize: 9, color: T.muted,
          letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          {slide.label}
        </span>
        <div style={{ width: 28, height: 2, background: T.green, marginTop: 5, borderRadius: 1 }} />
      </div>

      {/* Content area */}
      <div style={{ flex: 1, padding: '12px 20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <SlideContent slide={slide} edition={edition} />
      </div>

      {/* Bottom bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px 14px',
      }}>
        <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>
          {index + 1} / {total}
        </span>

        {!isLast && (
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.text2, opacity: 0.5 }}>
            swipe &rarr;
          </span>
        )}

        <div style={{ display: 'flex', gap: 5 }}>
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} style={{
              width: i === index ? 12 : 4, height: 4, borderRadius: 2,
              background: i === index ? T.green : T.dim,
              display: 'inline-block', transition: 'all 0.2s',
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function EditionBadge({ edition }: { edition: Edition }) {
  const labels: Record<Edition, string> = { morning: 'AM', close: 'PM', weekend: 'WEEK', weekly: 'WRAP' }
  return (
    <span style={{
      fontFamily: T.mono, fontSize: 8, fontWeight: 700, color: T.green,
      padding: '2px 7px', borderRadius: 4,
      background: T.greenDim, letterSpacing: '0.08em',
    }}>
      {labels[edition]}
    </span>
  )
}

// ─── Slide router ───────────────────────────────────────────────────────────

function SlideContent({ slide, edition }: { slide: SlideData; edition: Edition }) {
  switch (slide.type) {
    case 'cover':      return <CoverSlide c={slide.content} title={slide.title} label={slide.label} />
    case 'scoreboard': return <ScoreboardSlide c={slide.content} />
    case 'sentiment':  return <SentimentSlide c={slide.content} />
    case 'narrative':  return <NarrativeSlide c={slide.content} title={slide.title} />
    case 'movers':     return <MoversSlide c={slide.content} />
    case 'energy':     return <EnergySlide c={slide.content} />
    case 'crypto':     return <CryptoSlide c={slide.content} />
    case 'forex':      return <ForexSlide c={slide.content} />
    case 'sectors':    return <SectorsSlide c={slide.content} />
    case 'radar':      return <RadarSlide c={slide.content} />
    case 'outlook':    return <OutlookSlide c={slide.content} edition={edition} />
    case 'pulse':      return <PulseSlide c={slide.content} />
    case 'cta':        return <CtaSlide c={slide.content} />
    default:           return null
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, d = 2): string {
  if (n == null || isNaN(n)) return '\u2014'
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}
function pctColor(n: number | null | undefined): string { return (n ?? 0) >= 0 ? T.green : T.red }
function pctBg(n: number | null | undefined): string { return (n ?? 0) >= 0 ? T.greenDim : T.redDim }
function pctStr(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '\u2014'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}
function arrow(n: number | null | undefined): string { return (n ?? 0) >= 0 ? '\u25B2' : '\u25BC' }

// ─── COVER ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CoverSlide({ c, title, label }: { c: Record<string, any>; title: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 16 }}>
      <div style={{
        fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
        color: T.green, padding: '4px 14px', borderRadius: 20,
        border: '1px solid rgba(16,185,129,0.2)',
      }}>
        {label}
      </div>

      <h1 style={{
        fontFamily: T.sans, fontSize: 28, fontWeight: 800, color: T.text,
        lineHeight: 1.2, margin: 0, maxWidth: 420, letterSpacing: '-0.3px',
      }}>
        {title}
      </h1>

      {c.subtitle && (
        <div style={{
          fontFamily: T.mono, fontSize: 13, color: T.text2,
          padding: '10px 20px', borderRadius: 10,
          background: T.card, border: `1px solid ${T.border}`,
          lineHeight: 1.6, maxWidth: 380,
        }}>
          {c.subtitle}
        </div>
      )}

      <div style={{ width: 40, height: 2, background: T.green, borderRadius: 1, opacity: 0.4, marginTop: 8 }} />
    </div>
  )
}

// ─── SCOREBOARD ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ScoreboardSlide({ c }: { c: Record<string, any> }) {
  const quotes = c.quotes ?? []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {quotes.map((q: any) => (
          <div key={q.symbol} style={{
            background: T.card, borderRadius: 10, padding: '14px 14px 12px',
            border: `1px solid ${T.border}`,
          }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: '0.08em', marginBottom: 6 }}>
              {q.name}
            </div>
            <div style={{
              fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: T.text,
              fontVariantNumeric: 'tabular-nums', lineHeight: 1,
            }}>
              ${fmt(q.price)}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6,
              padding: '3px 8px', borderRadius: 5, background: pctBg(q.changePercent),
            }}>
              <span style={{ fontSize: 8, color: pctColor(q.changePercent) }}>{arrow(q.changePercent)}</span>
              <span style={{
                fontFamily: T.mono, fontSize: 12, fontWeight: 700,
                color: pctColor(q.changePercent), fontVariantNumeric: 'tabular-nums',
              }}>
                {pctStr(q.changePercent)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SENTIMENT ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SentimentSlide({ c }: { c: Record<string, any> }) {
  const fg = c.fearGreed
  const score = fg?.score ?? 50
  const rating = fg?.rating ?? 'Neutral'
  const gaugeColor = score <= 25 ? T.red : score <= 45 ? T.amber : score <= 55 ? T.text2 : T.green

  const r = 70, cx = 90, cy = 85
  const startAngle = Math.PI
  const progressAngle = startAngle - (score / 100) * Math.PI
  const sx = cx + r * Math.cos(startAngle)
  const sy = cy + r * Math.sin(startAngle)
  const ex = cx + r * Math.cos(progressAngle)
  const ey = cy + r * Math.sin(progressAngle)
  const largeArc = score > 50 ? 1 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
      <svg width={180} height={110} viewBox="0 0 180 110">
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={T.dim} strokeWidth={8} strokeLinecap="round" />
        <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`}
          fill="none" stroke={gaugeColor} strokeWidth={8} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${gaugeColor})` }} />
        <text x={cx} y={cy - 12} textAnchor="middle" fill={T.text}
          style={{ fontFamily: T.mono, fontSize: 36, fontWeight: 800 }}>{score}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill={gaugeColor}
          style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
          {rating}
        </text>
      </svg>

      {c.riskLevel && (
        <div style={{ width: '100%', maxWidth: 300 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: '0.1em' }}>RISK LEVEL</span>
            <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: T.text2 }}>{c.riskLevel.label}</span>
          </div>
          <div style={{ height: 6, background: T.card, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.border}` }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${Math.min(100, c.riskLevel.score)}%`,
              background: c.riskLevel.score > 70 ? T.red : c.riskLevel.score > 40 ? T.amber : T.green,
              boxShadow: `0 0 8px ${c.riskLevel.score > 70 ? T.red : c.riskLevel.score > 40 ? T.amber : T.green}`,
            }} />
          </div>
        </div>
      )}

      {c.radarVerdict && c.radarVerdict !== 'MIXED' && (
        <div style={{
          padding: '8px 20px', borderRadius: 8, marginTop: 4,
          border: `1px solid ${T.border}`, background: T.card,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontFamily: T.mono, fontSize: 10, color: T.muted }}>RADAR</span>
          <span style={{
            fontFamily: T.mono, fontSize: 14, fontWeight: 800,
            color: c.radarVerdict === 'BUY' ? T.green : c.radarVerdict === 'SELL' ? T.red : T.amber,
          }}>
            {c.radarVerdict}
          </span>
        </div>
      )}

      {c.sentimentVerdict && (
        <p style={{
          fontFamily: T.sans, fontSize: 14, color: T.text2, textAlign: 'center',
          margin: 0, lineHeight: 1.5, fontStyle: 'italic', maxWidth: 320,
        }}>
          &ldquo;{c.sentimentVerdict}&rdquo;
        </p>
      )}
    </div>
  )
}

// ─── NARRATIVE ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NarrativeSlide({ c, title }: { c: Record<string, any>; title: string }) {
  const chokepoints = c.chokepoints ?? []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 16 }}>
      <h3 style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>
        {title}
      </h3>
      <div style={{ position: 'relative', paddingLeft: 16 }}>
        <div style={{
          position: 'absolute', left: 0, top: -4,
          fontFamily: 'Georgia, serif', fontSize: 48, color: T.green, opacity: 0.2, lineHeight: 1,
        }}>
          &ldquo;
        </div>
        <p style={{
          fontFamily: T.sans, fontSize: 15, color: 'rgba(255,255,255,0.78)',
          lineHeight: 1.65, margin: 0,
        }}>
          {c.narrative}
        </p>
      </div>

      {chokepoints.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {chokepoints.slice(0, 3).map((cp: any, i: number) => {
            const color = cp.status === 'DISRUPTED' ? T.red : cp.status === 'ELEVATED' ? T.amber : T.green
            return (
              <div key={i} style={{
                padding: '8px 12px', background: T.card, borderRadius: 8,
                borderLeft: `3px solid ${color}`, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.text }}>{cp.name}</span>
                <span style={{
                  fontFamily: T.mono, fontSize: 9, padding: '2px 6px', borderRadius: 4,
                  background: `${color}18`, color, fontWeight: 700, letterSpacing: '0.05em',
                }}>
                  {cp.status}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── MOVERS ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MoversSlide({ c }: { c: Record<string, any> }) {
  const gainers = c.gainers ?? []
  const losers = c.losers ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MoverRow = ({ m, color, bg }: { m: any; color: string; bg: string }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 12px', background: T.card, borderRadius: 8, border: `1px solid ${T.border}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: T.text }}>{m.symbol}</span>
        <span style={{ fontFamily: T.sans, fontSize: 10, color: T.muted, marginLeft: 8 }}>{m.name}</span>
      </div>
      <span style={{
        fontFamily: T.mono, fontSize: 14, fontWeight: 800, color,
        fontVariantNumeric: 'tabular-nums', padding: '2px 8px', borderRadius: 5, background: bg,
      }}>
        {pctStr(m.changePercent)}
      </span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <div style={{ width: 3, height: 14, background: T.green, borderRadius: 2 }} />
        <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.green, letterSpacing: '0.12em' }}>WINNERS</span>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {gainers.slice(0, 4).map((m: any, i: number) => <MoverRow key={i} m={m} color={T.green} bg={T.greenDim} />)}

      <div style={{ height: 1, background: T.border, margin: '6px 0' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <div style={{ width: 3, height: 14, background: T.red, borderRadius: 2 }} />
        <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.red, letterSpacing: '0.12em' }}>LOSERS</span>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {losers.slice(0, 4).map((m: any, i: number) => <MoverRow key={i} m={m} color={T.red} bg={T.redDim} />)}
    </div>
  )
}

// ─── ENERGY ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EnergySlide({ c }: { c: Record<string, any> }) {
  const oil = c.oil
  const isUp = oil && oil.changePercent >= 0
  const upPts   = '0,28 20,24 40,20 60,22 80,14 100,10 120,6'
  const downPts = '0,6 20,10 40,16 60,12 80,20 100,24 120,28'

  const items = [
    { name: 'Gold', data: c.gold },
    { name: 'Silver', data: c.silver },
    { name: 'Nat Gas', data: c.natgas },
  ].filter(o => o.data)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 12 }}>
      {oil && (
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: '0.15em', marginBottom: 6 }}>CRUDE OIL</div>
          <div style={{
            fontFamily: T.mono, fontSize: 42, fontWeight: 800, color: T.text,
            fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          }}>
            ${fmt(oil.price)}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8,
            padding: '4px 12px', borderRadius: 6, background: pctBg(oil.changePercent),
          }}>
            <span style={{ fontSize: 10, color: pctColor(oil.changePercent) }}>{arrow(oil.changePercent)}</span>
            <span style={{
              fontFamily: T.mono, fontSize: 16, fontWeight: 700,
              color: pctColor(oil.changePercent), fontVariantNumeric: 'tabular-nums',
            }}>
              {pctStr(oil.changePercent)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
            <svg width={120} height={32} viewBox="0 0 120 32" style={{ opacity: 0.5 }}>
              <polyline points={isUp ? upPts : downPts}
                fill="none" stroke={isUp ? T.green : T.red} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}

      {items.map(({ name, data }) => (
        <div key={name} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`,
        }}>
          <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.text }}>{name}</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 600, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
              ${fmt(data.price)}
            </span>
            <span style={{
              fontFamily: T.mono, fontSize: 12, fontWeight: 700,
              color: pctColor(data.changePercent), fontVariantNumeric: 'tabular-nums',
              padding: '2px 6px', borderRadius: 4, background: pctBg(data.changePercent),
            }}>
              {pctStr(data.changePercent)}
            </span>
          </div>
        </div>
      ))}

      {c.narrative && (
        <p style={{ fontFamily: T.sans, fontSize: 13, color: T.text2, margin: '4px 0 0', lineHeight: 1.5, textAlign: 'center' }}>
          {c.narrative}
        </p>
      )}
    </div>
  )
}

// ─── CRYPTO ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CryptoSlide({ c }: { c: Record<string, any> }) {
  const btc = c.btc
  const others = [
    { name: 'Ethereum', sym: 'ETH', data: c.eth },
    { name: 'Solana', sym: 'SOL', data: c.sol },
  ].filter(o => o.data)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 12 }}>
      {btc && (
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: '0.15em', marginBottom: 6 }}>BITCOIN</div>
          <div style={{
            fontFamily: T.mono, fontSize: 36, fontWeight: 800, color: T.text,
            fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          }}>
            ${fmt(btc.price)}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8,
            padding: '4px 12px', borderRadius: 6, background: pctBg(btc.changePercent),
          }}>
            <span style={{ fontSize: 10, color: pctColor(btc.changePercent) }}>{arrow(btc.changePercent)}</span>
            <span style={{
              fontFamily: T.mono, fontSize: 16, fontWeight: 700,
              color: pctColor(btc.changePercent), fontVariantNumeric: 'tabular-nums',
            }}>
              {pctStr(btc.changePercent)}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {others.map(({ name, sym, data }) => (
          <div key={sym} style={{
            background: T.card, borderRadius: 10, padding: '12px', border: `1px solid ${T.border}`,
          }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, marginBottom: 4 }}>{name}</div>
            <div style={{ fontFamily: T.mono, fontSize: 18, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
              ${fmt(data.price)}
            </div>
            <span style={{
              fontFamily: T.mono, fontSize: 11, fontWeight: 700,
              color: pctColor(data.changePercent), fontVariantNumeric: 'tabular-nums',
            }}>
              {pctStr(data.changePercent)}
            </span>
          </div>
        ))}
      </div>

      {c.cryptoFearGreed && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '10px 16px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`,
        }}>
          <span style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, letterSpacing: '0.08em' }}>CRYPTO F&G</span>
          <span style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 800, color: T.text }}>{c.cryptoFearGreed.score}</span>
          <span style={{
            fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: T.text2,
            padding: '2px 8px', borderRadius: 4, background: T.dim,
          }}>
            {c.cryptoFearGreed.label}
          </span>
        </div>
      )}

      {c.narrative && (
        <p style={{ fontFamily: T.sans, fontSize: 13, color: T.text2, margin: 0, lineHeight: 1.5, textAlign: 'center' }}>
          {c.narrative}
        </p>
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 8 }}>
      {dxy && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', background: T.card, borderRadius: 10, border: `1px solid ${T.border}`,
          marginBottom: 4,
        }}>
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 10, color: T.muted, marginBottom: 2 }}>US DOLLAR INDEX</div>
            <div style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 800, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(dxy.price)}
            </div>
          </div>
          <span style={{
            fontFamily: T.mono, fontSize: 14, fontWeight: 700,
            color: pctColor(dxy.changePercent), fontVariantNumeric: 'tabular-nums',
            padding: '4px 10px', borderRadius: 6, background: pctBg(dxy.changePercent),
          }}>
            {pctStr(dxy.changePercent)}
          </span>
        </div>
      )}

      {currencies.slice(0, 9).map((f: { currency: string; score: number }) => {
        const barWidth = (Math.abs(f.score) / maxScore) * 100
        return (
          <div key={f.currency} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: T.text, width: 30 }}>
              {f.currency}
            </span>
            <div style={{ flex: 1, height: 8, background: T.card, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: f.score >= 0 ? T.green : T.red,
                width: `${Math.max(barWidth, 3)}%`,
              }} />
            </div>
            <span style={{
              fontFamily: T.mono, fontSize: 10, fontWeight: 600,
              color: pctColor(f.score), width: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
            }}>
              {f.score > 0 ? '+' : ''}{f.score.toFixed(1)}
            </span>
          </div>
        )
      })}

      {c.narrative && (
        <p style={{ fontFamily: T.sans, fontSize: 13, color: T.text2, margin: '4px 0 0', lineHeight: 1.5, textAlign: 'center' }}>
          {c.narrative}
        </p>
      )}
    </div>
  )
}

// ─── SECTORS ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectorsSlide({ c }: { c: Record<string, any> }) {
  const sectors = c.sectors ?? []
  const maxScore = Math.max(...sectors.map((s: { score: number }) => Math.abs(s.score)), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 7 }}>
      {sectors.map((s: { sector: string; score: number }) => {
        const barWidth = (Math.abs(s.score) / maxScore) * 45
        return (
          <div key={s.sector} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: T.mono, fontSize: 10, color: T.text2, fontWeight: 600,
              width: 90, textAlign: 'right', flexShrink: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
            }}>
              {s.sector}
            </span>
            <div style={{
              flex: 1, height: 10, position: 'relative', background: T.card, borderRadius: 5,
            }}>
              <div style={{
                position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: T.muted,
              }} />
              <div style={{
                position: 'absolute', height: '100%', borderRadius: 5,
                background: s.score >= 0 ? T.green : T.red,
                width: `${Math.max(barWidth, 1)}%`,
                ...(s.score >= 0 ? { left: '50%' } : { right: '50%' }),
              }} />
            </div>
            <span style={{
              fontFamily: T.mono, fontSize: 10, fontWeight: 700,
              color: pctColor(s.score), width: 32, textAlign: 'right',
              fontVariantNumeric: 'tabular-nums', flexShrink: 0,
            }}>
              {s.score > 0 ? '+' : ''}{s.score.toFixed(1)}
            </span>
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
  const vColor = verdict === 'BUY' ? T.green : verdict === 'SELL' ? T.red : verdict === 'CASH' ? T.amber : T.text2
  const vBg = verdict === 'BUY' ? T.greenDim : verdict === 'SELL' ? T.redDim : verdict === 'CASH' ? T.amberDim : T.dim

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 12 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{
          display: 'inline-block', padding: '12px 32px', borderRadius: 12,
          background: vBg, border: `1px solid ${vColor}30`,
        }}>
          <div style={{ fontFamily: T.sans, fontSize: 32, fontWeight: 800, color: vColor, letterSpacing: '0.05em' }}>
            {verdict}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {signals.slice(0, 5).map((s: any, i: number) => {
          const sigVerdict = s.verdict ?? s.signal ?? 'HOLD'
          const sColor = sigVerdict === 'BUY' ? T.green : sigVerdict === 'SELL' ? T.red : T.amber
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', background: T.card, borderRadius: 8, border: `1px solid ${T.border}`,
            }}>
              <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.text, flex: 1 }}>
                {s.name ?? s.label ?? s.asset ?? `Signal ${i + 1}`}
              </span>
              <span style={{
                fontFamily: T.mono, fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                background: `${sColor}18`, color: sColor, letterSpacing: '0.05em',
              }}>
                {sigVerdict}
              </span>
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item: string, i: number) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{
              fontFamily: T.mono, fontSize: 14, fontWeight: 800, color: T.green,
              width: 24, textAlign: 'right', flexShrink: 0,
            }}>
              {i + 1}
            </span>
            <span style={{ fontFamily: T.sans, fontSize: 15, color: T.text, lineHeight: 1.45 }}>
              {item}
            </span>
          </div>
        ))}
      </div>

      {(econ.length > 0 || earnings.length > 0) && (
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {econ.length > 0 && (
            <div>
              <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: '0.1em' }}>
                {edition === 'morning' ? 'ECONOMIC EVENTS TODAY' : 'UPCOMING EVENTS'}
              </span>
              <p style={{ fontFamily: T.mono, fontSize: 12, color: T.text2, margin: '4px 0 0', lineHeight: 1.5 }}>
                {econ.join(' \u00B7 ')}
              </p>
            </div>
          )}
          {earnings.length > 0 && (
            <div>
              <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: '0.1em' }}>EARNINGS</span>
              <p style={{ fontFamily: T.mono, fontSize: 12, color: T.text2, margin: '4px 0 0', lineHeight: 1.5 }}>
                {earnings.join(' \u00B7 ')}
              </p>
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 14 }}>
      {c.pulseText && (
        <div style={{
          padding: '16px', borderRadius: 12,
          background: 'rgba(16,185,129,0.04)',
          border: '1px solid rgba(16,185,129,0.1)',
          position: 'relative',
        }}>
          <span style={{
            position: 'absolute', top: 10, right: 12,
            fontFamily: T.mono, fontSize: 8, color: T.green, letterSpacing: '0.1em', opacity: 0.5,
          }}>
            AI ANALYSIS
          </span>
          <p style={{ fontFamily: T.sans, fontSize: 15, color: T.text, lineHeight: 1.65, margin: 0 }}>
            {c.pulseText}
          </p>
        </div>
      )}

      {headlines.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: '0.1em' }}>TOP HEADLINES</span>
          {headlines.map((h: string, i: number) => (
            <div key={i} style={{
              padding: '8px 12px', background: T.card, borderRadius: 8, border: `1px solid ${T.border}`,
            }}>
              <p style={{ fontFamily: T.sans, fontSize: 13, color: T.text2, margin: 0, lineHeight: 1.4 }}>{h}</p>
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
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center',
    }}>
      <svg width={72} height={72} viewBox="0 0 100 100" fill="none">
        <defs>
          <filter id="ctaGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect x="5" y="5" width="90" height="90" rx="18"
          stroke="#00FF88" strokeWidth="2" fill="none" opacity="0.25" />
        <line x1="14" y1="78" x2="86" y2="78" stroke="#00FF88" strokeWidth="1" opacity="0.1" />
        <polygon points="14,68 28,52 40,58 54,28 66,38 78,18 86,24 86,78 14,78"
          fill="#00FF88" opacity="0.15" />
        <polyline points="14,68 28,52 40,58 54,28 66,38 78,18 86,24"
          stroke="#00FF88" strokeWidth="3.5" strokeLinejoin="round" fill="none" filter="url(#ctaGlow)" />
      </svg>

      <div style={{ fontFamily: T.sans, fontSize: 28, fontWeight: 700, color: '#F0F0F5', letterSpacing: '-0.3px' }}>
        Market<span style={{ color: '#00FF88', fontWeight: 800 }}>Lens</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%', background: T.green,
          display: 'inline-block', boxShadow: `0 0 8px ${T.green}`,
        }} />
        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text2, letterSpacing: '0.12em', fontWeight: 600 }}>LIVE</span>
      </div>

      <p style={{ fontFamily: T.sans, fontSize: 14, color: T.text2, margin: 0, lineHeight: 1.5, maxWidth: 300 }}>
        {c.tagline}
      </p>

      <p style={{ fontFamily: T.mono, fontSize: 13, color: T.green, margin: 0, fontWeight: 700 }}>
        100% free. No signup needed.
      </p>

      <div style={{
        padding: '12px 36px', borderRadius: 10,
        background: T.green, color: '#000',
        fontFamily: T.mono, fontSize: 15, fontWeight: 800,
        boxShadow: '0 0 20px rgba(16,185,129,0.3)',
      }}>
        marketlens.live
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: T.mono, fontSize: 10, color: T.muted }}>Link in bio</span>
        <span style={{ fontFamily: T.sans, fontSize: 12, color: T.text2, fontStyle: 'italic' }}>
          {c.followCta}
        </span>
      </div>
    </div>
  )
}
