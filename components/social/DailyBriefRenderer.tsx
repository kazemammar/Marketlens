'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

type Edition = 'morning' | 'close'
type SlideType =
  | 'brief' | 'sentiment' | 'why_moved' | 'movers' | 'energy'
  | 'crypto' | 'forex' | 'sectors' | 'radar' | 'watchlist'
  | 'ai_pulse' | 'cta'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SlideData { type: SlideType; title: string; label: string; content: Record<string, any> }

interface BriefPayload {
  slides: SlideData[]
  edition: Edition
  generatedAt: string
  date: string
}

// ─── Design tokens ──────────────────────────────────────────────────────────

const T = {
  bg:          '#09090b',
  card:        '#111113',
  border:      'rgba(255,255,255,0.04)',
  green:       '#10B981',
  red:         '#ef4444',
  amber:       '#f59e0b',
  text:        'rgba(255,255,255,0.85)',
  text2:       'rgba(255,255,255,0.5)',
  muted:       'rgba(255,255,255,0.25)',
  mono:        "ui-monospace, 'JetBrains Mono', monospace",
  sans:        "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as const

// ─── Component ──────────────────────────────────────────────────────────────

export default function DailyBriefRenderer() {
  const [edition, setEdition] = useState<Edition>(() => {
    const h = new Date().getUTCHours()
    return h < 17 ? 'morning' : 'close'
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
      const json: BriefPayload = await r.json()
      setData(json)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBrief(edition) }, [edition, fetchBrief])

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: T.bg, minHeight: '100vh', padding: '24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {(['morning', 'close'] as const).map(e => (
            <button key={e} onClick={() => setEdition(e)} style={{
              fontFamily: T.mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '6px 16px', borderRadius: 6,
              background: edition === e ? T.green : T.card,
              color: edition === e ? '#000' : T.text2,
              border: `1px solid ${edition === e ? T.green : T.border}`,
              cursor: 'pointer',
            }}>
              {e === 'morning' ? 'Morning Brief' : 'Closing Brief'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{
              width: '100%', maxWidth: 540, aspectRatio: '4/5',
              background: T.card, borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
      </div>
    )
  }

  // ─── Error ──────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div style={{
        background: T.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <p style={{ fontFamily: T.mono, fontSize: 13, color: T.text2 }}>
          Could not generate today&apos;s brief. Try refreshing.
        </p>
        <button onClick={() => fetchBrief(edition)} style={{
          fontFamily: T.mono, fontSize: 12, padding: '8px 20px', borderRadius: 6,
          background: T.green, color: '#000', border: 'none', cursor: 'pointer',
        }}>
          Retry
        </button>
      </div>
    )
  }

  // ─── Slides ─────────────────────────────────────────────────────────────
  const total = data.slides.length
  const dateStr = new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div style={{ background: T.bg, minHeight: '100vh', padding: '24px 16px' }}>
      {/* Edition toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
        {(['morning', 'close'] as const).map(e => (
          <button key={e} onClick={() => setEdition(e)} style={{
            fontFamily: T.mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '6px 16px', borderRadius: 6,
            background: edition === e ? T.green : T.card,
            color: edition === e ? '#000' : T.text2,
            border: `1px solid ${edition === e ? T.green : T.border}`,
            cursor: 'pointer', transition: 'all 0.2s',
          }}>
            {e === 'morning' ? 'Morning Brief' : 'Closing Brief'}
          </button>
        ))}
      </div>

      {/* Slides */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        {data.slides.map((slide, idx) => (
          <SlideFrame key={idx} slide={slide} index={idx} total={total}
            date={dateStr} edition={data.edition} />
        ))}
      </div>
    </div>
  )
}

// ─── Slide Frame ────────────────────────────────────────────────────────────

function SlideFrame({ slide, index, total, date, edition }: {
  slide: SlideData; index: number; total: number; date: string; edition: Edition
}) {
  return (
    <div style={{
      width: '100%', maxWidth: 540, aspectRatio: '4/5',
      background: T.bg, borderRadius: 12,
      border: `1px solid ${T.border}`,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px 8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.green, display: 'inline-block' }} />
          <span style={{ fontFamily: T.mono, fontSize: 8, color: T.muted, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            MARKETLENS
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: T.mono, fontSize: 8, color: T.muted }}>{date}</span>
          <span style={{
            fontFamily: T.mono, fontSize: 7, color: T.green, padding: '2px 6px',
            border: `1px solid rgba(16,185,129,0.2)`, borderRadius: 3,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {edition === 'morning' ? 'AM' : 'PM'}
          </span>
        </div>
      </div>

      {/* Section label + green line */}
      <div style={{ padding: '0 16px 8px' }}>
        <span style={{
          fontFamily: T.mono, fontSize: 8, color: T.muted,
          letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          {slide.label}
        </span>
        <div style={{ width: 24, height: 1, background: T.green, marginTop: 4 }} />
      </div>

      {/* Slide content */}
      <div style={{ flex: 1, padding: '0 16px', overflow: 'hidden' }}>
        <SlideContent slide={slide} edition={edition} />
      </div>

      {/* Bottom bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px 10px',
      }}>
        <span style={{ fontFamily: T.mono, fontSize: 8, color: T.muted }}>
          {index + 1} / {total}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} style={{
              width: 4, height: 4, borderRadius: '50%',
              background: i === index ? T.green : T.muted,
              display: 'inline-block',
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Slide content router ───────────────────────────────────────────────────

function SlideContent({ slide, edition }: { slide: SlideData; edition: Edition }) {
  switch (slide.type) {
    case 'brief':     return <BriefSlide c={slide.content} title={slide.title} />
    case 'sentiment': return <SentimentSlide c={slide.content} />
    case 'why_moved': return <WhyMovedSlide c={slide.content} />
    case 'movers':    return <MoversSlide c={slide.content} />
    case 'energy':    return <EnergySlide c={slide.content} />
    case 'crypto':    return <CryptoSlide c={slide.content} />
    case 'forex':     return <ForexSlide c={slide.content} />
    case 'sectors':   return <SectorsSlide c={slide.content} />
    case 'radar':     return <RadarSlide c={slide.content} />
    case 'watchlist': return <WatchlistSlide c={slide.content} edition={edition} />
    case 'ai_pulse':  return <AiPulseSlide c={slide.content} />
    case 'cta':       return <CtaSlide c={slide.content} />
    default:          return null
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number | undefined | null, decimals = 2): string {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function pctColor(n: number | undefined | null): string {
  if (n == null) return T.text2
  return n >= 0 ? T.green : T.red
}

function pctStr(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

// ─── BRIEF ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BriefSlide({ c, title }: { c: Record<string, any>; title: string }) {
  const quotes = c.quotes ?? []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
      <h2 style={{
        fontFamily: T.sans, fontSize: 18, fontWeight: 700, color: T.text,
        margin: '0 0 6px', lineHeight: 1.3,
      }}>
        {title}
      </h2>
      <p style={{
        fontFamily: T.mono, fontSize: 11, color: T.text2,
        margin: '0 0 20px', lineHeight: 1.4,
      }}>
        {c.subtitle}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {quotes.map((q: any) => (
          <div key={q.symbol} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 10px', background: T.card, borderRadius: 6,
            border: `1px solid ${T.border}`,
          }}>
            <div>
              <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.text }}>
                {q.name}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
                ${fmt(q.price)}
              </span>
              <span style={{
                fontFamily: T.mono, fontSize: 11, fontWeight: 600,
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

  // Gauge color
  const gaugeColor = score <= 25 ? T.red : score <= 45 ? T.amber : score <= 55 ? T.text2 : score <= 75 ? T.green : T.green

  // SVG arc
  const r = 60, cx = 80, cy = 80
  const startAngle = Math.PI, endAngle = 0
  const progressAngle = startAngle - (score / 100) * Math.PI
  const sx = cx + r * Math.cos(startAngle), sy = cy + r * Math.sin(startAngle)
  const ex = cx + r * Math.cos(progressAngle), ey = cy + r * Math.sin(progressAngle)
  const largeArc = score > 50 ? 1 : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
      {/* Gauge */}
      <svg width={160} height={100} viewBox="0 0 160 100">
        {/* Track */}
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={T.muted} strokeWidth={6} strokeLinecap="round" />
        {/* Progress */}
        <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 1 ${ex} ${ey}`}
          fill="none" stroke={gaugeColor} strokeWidth={6} strokeLinecap="round" />
        {/* Score */}
        <text x={cx} y={cy - 8} textAnchor="middle" fill={T.text}
          style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 700 }}>{score}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill={gaugeColor}
          style={{ fontFamily: T.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {rating}
        </text>
      </svg>

      {/* Risk level bar */}
      {c.riskLevel && (
        <div style={{ width: '100%', maxWidth: 280 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Risk Level</span>
            <span style={{ fontFamily: T.mono, fontSize: 9, color: T.text2 }}>{c.riskLevel.label}</span>
          </div>
          <div style={{ height: 4, background: T.card, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${Math.min(100, c.riskLevel.score)}%`,
              background: c.riskLevel.score > 70 ? T.red : c.riskLevel.score > 40 ? T.amber : T.green,
            }} />
          </div>
        </div>
      )}

      {/* Radar verdict */}
      {c.radarVerdict && (
        <div style={{
          padding: '8px 16px', borderRadius: 6, marginTop: 4,
          border: `1px solid ${T.border}`, background: T.card,
          textAlign: 'center',
        }}>
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: '0.1em' }}>RADAR: </span>
          <span style={{
            fontFamily: T.mono, fontSize: 12, fontWeight: 700,
            color: c.radarVerdict === 'BUY' ? T.green : c.radarVerdict === 'SELL' ? T.red : c.radarVerdict === 'CASH' ? T.amber : T.text2,
          }}>
            {c.radarVerdict}
          </span>
        </div>
      )}

      {/* Sentiment verdict */}
      {c.sentimentVerdict && (
        <p style={{ fontFamily: T.sans, fontSize: 12, color: T.text2, textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
          {c.sentimentVerdict}
        </p>
      )}
    </div>
  )
}

// ─── WHY MOVED ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WhyMovedSlide({ c }: { c: Record<string, any> }) {
  const chokepoints = c.chokepoints ?? []
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 16 }}>
      <p style={{
        fontFamily: T.sans, fontSize: 14, color: 'rgba(255,255,255,0.75)',
        lineHeight: 1.6, margin: 0,
      }}>
        {c.narrative}
      </p>
      {chokepoints.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {chokepoints.map((cp: any, i: number) => {
            const borderColor = cp.status === 'DISRUPTED' ? T.red : cp.status === 'ELEVATED' ? T.amber : T.green
            return (
              <div key={i} style={{
                padding: '6px 10px', background: T.card, borderRadius: 4,
                borderLeft: `3px solid ${borderColor}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: T.text }}>
                    {cp.name}
                  </span>
                  <span style={{
                    fontFamily: T.mono, fontSize: 8, padding: '1px 5px', borderRadius: 3,
                    background: `${borderColor}20`, color: borderColor,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {cp.status}
                  </span>
                </div>
                {cp.description && (
                  <span style={{ fontFamily: T.sans, fontSize: 10, color: T.text2, lineHeight: 1.3 }}>
                    {cp.description}
                  </span>
                )}
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
  const Row = ({ m, color }: { m: any; color: string }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '5px 0',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.text }}>{m.symbol}</span>
        <span style={{ fontFamily: T.sans, fontSize: 9, color: T.muted, marginLeft: 6 }}>{m.name}</span>
      </div>
      <span style={{
        fontFamily: T.mono, fontSize: 14, fontWeight: 700, color,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {pctStr(m.changePercent)}
      </span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
      <span style={{ fontFamily: T.mono, fontSize: 9, color: T.green, letterSpacing: '0.15em', marginBottom: 6 }}>
        WINNERS
      </span>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {gainers.map((m: any, i: number) => <Row key={i} m={m} color={T.green} />)}

      <div style={{ height: 1, background: T.border, margin: '10px 0' }} />

      <span style={{ fontFamily: T.mono, fontSize: 9, color: T.red, letterSpacing: '0.15em', marginBottom: 6 }}>
        LOSERS
      </span>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {losers.map((m: any, i: number) => <Row key={i} m={m} color={T.red} />)}
    </div>
  )
}

// ─── ENERGY ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EnergySlide({ c }: { c: Record<string, any> }) {
  const oil = c.oil
  const isUp = oil && oil.changePercent >= 0

  // Simple trend polyline (upward or downward suggestion)
  const upPoints   = '0,30 20,28 40,22 60,25 80,18 100,12 120,8'
  const downPoints = '0,8 20,12 40,18 60,15 80,22 100,28 120,30'

  const others = [
    { name: 'Gold', data: c.gold },
    { name: 'Silver', data: c.silver },
    { name: 'Nat Gas', data: c.natgas },
  ].filter(o => o.data)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 12 }}>
      {oil && (
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: '0.15em', marginBottom: 4 }}>CRUDE OIL</div>
          <div style={{ fontFamily: T.mono, fontSize: 32, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
            ${fmt(oil.price)}
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 14, color: pctColor(oil.changePercent), fontVariantNumeric: 'tabular-nums' }}>
            {pctStr(oil.changePercent)}
          </div>
          <svg width={120} height={36} viewBox="0 0 120 36" style={{ marginTop: 8, opacity: 0.6 }}>
            <polyline points={isUp ? upPoints : downPoints}
              fill="none" stroke={isUp ? T.green : T.red} strokeWidth={2} strokeLinejoin="round" />
          </svg>
        </div>
      )}

      {others.map(({ name, data }) => (
        <div key={name} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 10px', background: T.card, borderRadius: 6, border: `1px solid ${T.border}`,
        }}>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text }}>{name}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
              ${fmt(data.price)}
            </span>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: pctColor(data.changePercent), fontVariantNumeric: 'tabular-nums' }}>
              {pctStr(data.changePercent)}
            </span>
          </div>
        </div>
      ))}

      {c.narrative && (
        <p style={{ fontFamily: T.sans, fontSize: 11, color: T.text2, margin: '4px 0 0', lineHeight: 1.4, textAlign: 'center' }}>
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
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: '0.15em', marginBottom: 4 }}>BITCOIN</div>
          <div style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 700, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
            ${fmt(btc.price)}
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 14, color: pctColor(btc.changePercent), fontVariantNumeric: 'tabular-nums' }}>
            {pctStr(btc.changePercent)}
          </div>
        </div>
      )}

      {others.map(({ name, sym, data }) => (
        <div key={sym} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 10px', background: T.card, borderRadius: 6, border: `1px solid ${T.border}`,
        }}>
          <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text }}>{name}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ fontFamily: T.mono, fontSize: 12, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
              ${fmt(data.price)}
            </span>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: pctColor(data.changePercent), fontVariantNumeric: 'tabular-nums' }}>
              {pctStr(data.changePercent)}
            </span>
          </div>
        </div>
      ))}

      {c.cryptoFearGreed && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '8px 12px', background: T.card, borderRadius: 6, border: `1px solid ${T.border}`,
        }}>
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: '0.1em' }}>CRYPTO F&G:</span>
          <span style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 700, color: T.text }}>{c.cryptoFearGreed.score}</span>
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.text2, textTransform: 'uppercase' }}>{c.cryptoFearGreed.label}</span>
        </div>
      )}

      {c.narrative && (
        <p style={{ fontFamily: T.sans, fontSize: 11, color: T.text2, margin: '4px 0 0', lineHeight: 1.4, textAlign: 'center' }}>
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
          padding: '8px 10px', background: T.card, borderRadius: 6, border: `1px solid ${T.border}`,
          marginBottom: 4,
        }}>
          <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.text }}>DXY</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
            <span style={{ fontFamily: T.mono, fontSize: 14, color: T.text, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(dxy.price)}
            </span>
            <span style={{ fontFamily: T.mono, fontSize: 12, color: pctColor(dxy.changePercent), fontVariantNumeric: 'tabular-nums' }}>
              {pctStr(dxy.changePercent)}
            </span>
          </div>
        </div>
      )}

      {currencies.map((f: { currency: string; score: number }) => {
        const barWidth = (Math.abs(f.score) / maxScore) * 100
        return (
          <div key={f.currency} style={{
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 600, color: T.text, width: 28 }}>
              {f.currency}
            </span>
            <div style={{ flex: 1, height: 6, background: T.card, borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                position: 'absolute',
                height: '100%', borderRadius: 3,
                background: f.score >= 0 ? T.green : T.red,
                width: `${Math.max(barWidth, 2)}%`,
                left: f.score >= 0 ? 0 : undefined,
                right: f.score < 0 ? 0 : undefined,
              }} />
            </div>
            <span style={{
              fontFamily: T.mono, fontSize: 9, color: pctColor(f.score),
              width: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
            }}>
              {f.score > 0 ? '+' : ''}{f.score.toFixed(1)}
            </span>
          </div>
        )
      })}

      {c.narrative && (
        <p style={{ fontFamily: T.sans, fontSize: 11, color: T.text2, margin: '4px 0 0', lineHeight: 1.4, textAlign: 'center' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 6 }}>
      {sectors.map((s: { sector: string; score: number }) => {
        const barWidth = (Math.abs(s.score) / maxScore) * 50
        return (
          <div key={s.sector} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: T.mono, fontSize: 9, color: T.text2,
              width: 80, textAlign: 'right', flexShrink: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {s.sector}
            </span>
            <div style={{
              flex: 1, height: 8, position: 'relative',
              background: T.card, borderRadius: 4,
            }}>
              {/* Center line */}
              <div style={{
                position: 'absolute', left: '50%', top: 0, bottom: 0,
                width: 1, background: T.muted,
              }} />
              {/* Bar */}
              <div style={{
                position: 'absolute', height: '100%', borderRadius: 4,
                background: s.score >= 0 ? T.green : T.red,
                width: `${Math.max(barWidth, 1)}%`,
                ...(s.score >= 0
                  ? { left: '50%' }
                  : { right: '50%' }),
              }} />
            </div>
            <span style={{
              fontFamily: T.mono, fontSize: 9,
              color: pctColor(s.score), width: 28, textAlign: 'right',
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
  const verdictColor = verdict === 'BUY' ? T.green : verdict === 'SELL' ? T.red : verdict === 'CASH' ? T.amber : T.text2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 12 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontFamily: T.sans, fontSize: 24, fontWeight: 700, color: verdictColor }}>
          {verdict}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {signals.map((s: any, i: number) => {
          const sigColor = s.verdict === 'BUY' || s.signal === 'BUY' ? T.green
            : s.verdict === 'SELL' || s.signal === 'SELL' ? T.red
            : T.amber
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 10px', background: T.card, borderRadius: 4, border: `1px solid ${T.border}`,
            }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, color: T.text, flex: 1 }}>
                {s.name ?? s.label ?? s.asset ?? `Signal ${i + 1}`}
              </span>
              <span style={{
                fontFamily: T.mono, fontSize: 8, padding: '2px 6px', borderRadius: 3,
                background: `${sigColor}20`, color: sigColor,
                fontWeight: 600, textTransform: 'uppercase',
              }}>
                {s.verdict ?? s.signal ?? 'HOLD'}
              </span>
              {s.reason && (
                <span style={{ fontFamily: T.sans, fontSize: 9, color: T.text2, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.reason}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── WATCHLIST ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WatchlistSlide({ c, edition }: { c: Record<string, any>; edition: Edition }) {
  const items = c.watchItems ?? []
  const econ = c.econEvents ?? []
  const earnings = c.earnings ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item: string, i: number) => (
          <div key={i} style={{ display: 'flex', gap: 8 }}>
            <span style={{ fontFamily: T.mono, fontSize: 12, color: T.green, fontWeight: 700, flexShrink: 0 }}>
              {i + 1}.
            </span>
            <span style={{ fontFamily: T.sans, fontSize: 14, color: T.text, lineHeight: 1.4 }}>
              {item}
            </span>
          </div>
        ))}
      </div>

      {econ.length > 0 && (
        <div>
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: '0.1em' }}>
            {edition === 'morning' ? 'ECONOMIC EVENTS TODAY:' : 'UPCOMING EVENTS:'}
          </span>
          <p style={{ fontFamily: T.mono, fontSize: 10, color: T.text2, margin: '4px 0 0', lineHeight: 1.5 }}>
            {econ.join(' · ')}
          </p>
        </div>
      )}

      {earnings.length > 0 && (
        <div>
          <span style={{ fontFamily: T.mono, fontSize: 9, color: T.muted, letterSpacing: '0.1em' }}>EARNINGS:</span>
          <p style={{ fontFamily: T.mono, fontSize: 10, color: T.text2, margin: '4px 0 0', lineHeight: 1.5 }}>
            {earnings.join(' · ')}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── AI PULSE ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AiPulseSlide({ c }: { c: Record<string, any> }) {
  const headlines = c.headlines ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 12 }}>
      {c.pulseText && (
        <div style={{
          padding: '12px 14px', borderRadius: 6,
          background: 'rgba(16,185,129,0.03)',
          border: '1px solid rgba(16,185,129,0.08)',
          position: 'relative',
        }}>
          <span style={{
            position: 'absolute', top: 8, right: 10,
            fontFamily: T.mono, fontSize: 7, color: T.muted, letterSpacing: '0.1em',
          }}>
            GROQ AI
          </span>
          <p style={{ fontFamily: T.sans, fontSize: 13, color: T.text, lineHeight: 1.6, margin: 0 }}>
            {c.pulseText}
          </p>
        </div>
      )}

      {headlines.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {headlines.map((h: string, i: number) => (
            <p key={i} style={{ fontFamily: T.sans, fontSize: 11, color: T.text2, margin: 0, lineHeight: 1.4 }}>
              {h}
            </p>
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
      alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center',
    }}>
      {/* Logo mark */}
      <svg width={64} height={64} viewBox="0 0 100 100" fill="none">
        <defs>
          <filter id="ctaGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect x="5" y="5" width="90" height="90" rx="18"
          stroke="#00FF88" strokeWidth="2" fill="none" opacity="0.2" />
        <line x1="14" y1="78" x2="86" y2="78" stroke="#00FF88" strokeWidth="1" opacity="0.1" />
        <polygon points="14,68 28,52 40,58 54,28 66,38 78,18 86,24 86,78 14,78"
          fill="#00FF88" opacity="0.12" />
        <polyline points="14,68 28,52 40,58 54,28 66,38 78,18 86,24"
          stroke="#00FF88" strokeWidth="3" strokeLinejoin="round" fill="none" filter="url(#ctaGlow)" />
      </svg>

      {/* Wordmark */}
      <div>
        <span style={{
          fontFamily: T.sans, fontSize: 24, fontWeight: 700, color: '#F0F0F5',
        }}>
          Market<span style={{ color: '#00FF88', fontWeight: 800 }}>Lens</span>
        </span>
      </div>

      {/* LIVE dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.green, display: 'inline-block' }} />
        <span style={{ fontFamily: T.mono, fontSize: 10, color: T.text2, letterSpacing: '0.1em' }}>LIVE</span>
      </div>

      {/* Tagline */}
      <p style={{ fontFamily: T.sans, fontSize: 12, color: T.text2, margin: 0, lineHeight: 1.5, maxWidth: 280 }}>
        {c.tagline}
      </p>

      {/* Free badge */}
      <p style={{ fontFamily: T.mono, fontSize: 11, color: T.green, margin: 0, fontWeight: 600 }}>
        100% free. No signup needed.
      </p>

      {/* Button */}
      <div style={{
        padding: '10px 28px', borderRadius: 8,
        background: T.green, color: '#000',
        fontFamily: T.mono, fontSize: 13, fontWeight: 700,
      }}>
        marketlens.live
      </div>

      {/* Link in bio */}
      <span style={{ fontFamily: T.mono, fontSize: 10, color: T.muted }}>Link in bio</span>

      {/* Follow CTA */}
      <p style={{ fontFamily: T.sans, fontSize: 11, color: T.text2, margin: 0, fontStyle: 'italic' }}>
        {c.followCta}
      </p>
    </div>
  )
}
