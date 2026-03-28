'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

type Edition = 'morning' | 'close' | 'weekend' | 'weekly'
type SlideType =
  | 'cover' | 'scoreboard' | 'sentiment' | 'narrative' | 'movers'
  | 'energy' | 'crypto' | 'forex' | 'sectors' | 'radar'
  | 'outlook' | 'pulse' | 'cta' | 'heatmap' | 'headlines' | 'signals'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SlideData { type: SlideType; title: string; label: string; content: Record<string, any> }
interface BriefPayload { slides: SlideData[]; edition: Edition; generatedAt: string; date: string; slideCount: number }

// ─── Design System ──────────────────────────────────────────────────────────

const C = {
  bg:        '#07070a',
  surface:   '#0e0e13',
  surface2:  '#16161d',
  surface3:  '#1e1e27',
  border:    'rgba(255,255,255,0.06)',
  borderMed: 'rgba(255,255,255,0.10)',

  green:     '#00FF88',
  greenMed:  '#10B981',
  greenDim:  'rgba(0,255,136,0.10)',
  red:       '#FF4444',
  redDim:    'rgba(255,68,68,0.10)',
  amber:     '#F59E0B',
  amberDim:  'rgba(245,158,11,0.10)',

  text:      '#FAFAFA',
  text2:     'rgba(255,255,255,0.65)',
  text3:     'rgba(255,255,255,0.38)',
  muted:     'rgba(255,255,255,0.20)',
  dim:       'rgba(255,255,255,0.06)',

  mono:      "ui-monospace, 'SF Mono', 'JetBrains Mono', monospace",
  sans:      "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', sans-serif",
} as const

const EDITION_ACCENT: Record<Edition, string> = {
  morning: '#60A5FA', close: '#F59E0B', weekend: '#A78BFA', weekly: '#22D3EE',
}
const EDITION_LABELS: Record<Edition, string> = {
  morning: 'MORNING BRIEF', close: 'CLOSING BRIEF', weekend: 'WEEKEND BRIEF', weekly: 'WEEKLY WRAP',
}
const EDITION_TAGS: Record<Edition, string> = {
  morning: 'PRE-MKT', close: 'CLOSE', weekend: 'RECAP', weekly: 'WRAP',
}

// Edition icons — small SVG next to the label on the cover
function EditionIcon({ edition, size = 14 }: { edition: Edition; size?: number }) {
  const s = { width: size, height: size, display: 'block' as const }
  switch (edition) {
    case 'morning': return (
      <svg {...s} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="14" r="5" stroke="currentColor" strokeWidth="2" />
        <path d="M12 3v3M4.22 7.22l2.12 2.12M1 14h3M4.22 20.78l2.12-2.12M19.78 20.78l-2.12-2.12M23 14h-3M19.78 7.22l-2.12 2.12M12 25v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
    case 'close': return (
      <svg {...s} viewBox="0 0 24 24" fill="none">
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
    case 'weekend': return (
      <svg {...s} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
    case 'weekly': return (
      <svg {...s} viewBox="0 0 24 24" fill="none">
        <polyline points="3,17 8,12 13,15 21,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="16,6 21,6 21,11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
}

// Share/save prompt — a subtle psychological nudge rendered into the PNG
function SharePrompt({ text, color }: { text: string; color: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: '5px 0', flexShrink: 0,
    }}>
      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
        <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7M16 6l-4-4-4 4M12 2v13"
          stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{
        fontFamily: C.mono, fontSize: 7, fontWeight: 600,
        color, opacity: 0.4, letterSpacing: '0.1em',
      }}>{text}</span>
    </div>
  )
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, d = 2): string {
  if (n == null || isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
}
const price = (n: number | null | undefined) => {
  if (n == null || isNaN(n) || n === 0) return '—'
  if (Math.abs(n) >= 10000) return '$' + (n / 1000).toFixed(1) + 'K'
  return '$' + fmt(n)
}
const clr = (n: number | null | undefined) => (n ?? 0) >= 0 ? C.green : C.red
const clrDim = (n: number | null | undefined) => (n ?? 0) >= 0 ? C.greenDim : C.redDim
const pct = (n: number | null | undefined) => n == null || isNaN(n) ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
const arrow = (n: number | null | undefined) => (n ?? 0) >= 0 ? '▲' : '▼'
const glow = (c: string, blur = 20): React.CSSProperties => ({ textShadow: `0 0 ${blur}px ${c}80` })
const tab: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' }


function sparklinePath(values: number[], w: number, h: number, padding = 4): { line: string; area: string } {
  if (values.length < 2) return { line: '', area: '' }
  const min = Math.min(...values) - 2, max = Math.max(...values) + 2
  const range = max - min || 1
  const pts = values.map((v, i) => ({
    x: padding + (i / (values.length - 1)) * (w - padding * 2),
    y: padding + (1 - (v - min) / range) * (h - padding * 2),
  }))
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const cp = (pts[i - 1].x + pts[i].x) / 2
    d += ` C ${cp.toFixed(1)},${pts[i - 1].y.toFixed(1)} ${cp.toFixed(1)},${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`
  }
  const last = pts[pts.length - 1]
  const area = d + ` L ${last.x.toFixed(1)},${h} L ${pts[0].x.toFixed(1)},${h} Z`
  return { line: d, area }
}

function heatColor(pctVal: number): { bg: string; fg: string } {
  const abs = Math.abs(pctVal)
  const op = abs >= 2 ? 0.88 : abs >= 1 ? 0.52 : abs >= 0.01 ? 0.22 : 0.05
  if (pctVal > 0) return { bg: `rgba(34,197,94,${op})`, fg: abs >= 1.5 ? '#fff' : 'rgba(255,255,255,0.85)' }
  if (pctVal < 0) return { bg: `rgba(239,68,68,${op})`, fg: abs >= 1.5 ? '#fff' : 'rgba(255,255,255,0.85)' }
  return { bg: 'rgba(255,255,255,0.04)', fg: 'rgba(255,255,255,0.5)' }
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function DailyBriefRenderer() {
  const [edition, setEdition] = useState<Edition>(() => {
    const now = new Date()
    const day = now.getUTCDay(), hour = now.getUTCHours()
    if (day === 0 || day === 6 || (day === 1 && hour < 14)) return 'weekend'
    if (day === 5 && hour >= 17) return 'weekly'
    return hour < 17 ? 'morning' : 'close'
  })
  const [data, setData] = useState<BriefPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchBrief = useCallback(async (ed: Edition, refresh = false) => {
    setLoading(true); setError(false)
    try {
      const url = `/api/social/daily-brief?edition=${ed}${refresh ? '&refresh=1' : ''}`
      const r = await fetch(url)
      if (!r.ok) throw new Error('fetch failed')
      setData(await r.json())
    } catch { setError(true) } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchBrief(edition) }, [edition, fetchBrief])

  const editions: { key: Edition; label: string }[] = [
    { key: 'morning', label: 'Morning' },
    { key: 'close',   label: 'Close' },
    { key: 'weekend', label: 'Weekend' },
    { key: 'weekly',  label: 'Weekly' },
  ]

  if (loading) return (
    <Shell>
      <EditionBar editions={editions} active={edition} onChange={setEdition} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        {[...Array(7)].map((_, i) => (
          <div key={i} style={{
            width: '100%', maxWidth: 540, aspectRatio: '4/5',
            background: `linear-gradient(135deg, ${C.surface} 0%, ${C.bg} 100%)`,
            borderRadius: 20, animation: 'dbPulse 2s ease-in-out infinite',
            animationDelay: `${i * 120}ms`,
          }} />
        ))}
      </div>
      <style>{`@keyframes dbPulse{0%,100%{opacity:.15}50%{opacity:.35}}`}</style>
    </Shell>
  )

  if (error || !data) return (
    <Shell>
      <EditionBar editions={editions} active={edition} onChange={setEdition} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, minHeight: '60vh' }}>
        <p style={{ fontFamily: C.mono, fontSize: 14, color: C.text2 }}>Could not generate brief. Try refreshing.</p>
        <button onClick={() => fetchBrief(edition)} style={{
          fontFamily: C.mono, fontSize: 13, padding: '10px 28px', borderRadius: 10,
          background: C.green, color: '#000', border: 'none', cursor: 'pointer', fontWeight: 700,
        }}>Retry</button>
      </div>
    </Shell>
  )

  const total = data.slides.length
  const dateStr = new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <Shell>
      <EditionBar editions={editions} active={edition} onChange={setEdition} />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <button
          onClick={() => fetchBrief(edition, true)}
          style={{
            fontFamily: C.mono, fontSize: 11, fontWeight: 600,
            padding: '6px 18px', borderRadius: 8,
            background: 'transparent', color: C.text3,
            border: `1px solid ${C.border}`, cursor: 'pointer',
          }}
        >
          ↻ Regenerate
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        {data.slides.map((slide, idx) => (
          <SlideFrame key={idx} slide={slide} index={idx} total={total} date={dateStr} edition={data.edition} />
        ))}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ background: '#030305', minHeight: '100vh', padding: '20px 16px 80px' }}>{children}</div>
}

function EditionBar({ editions, active, onChange }: {
  editions: { key: Edition; label: string }[]; active: Edition; onChange: (e: Edition) => void
}) {
  return (
    <div style={{
      display: 'flex', gap: 3, padding: 3, background: C.surface, borderRadius: 12,
      maxWidth: 400, margin: '0 auto 28px', border: `1px solid ${C.border}`,
    }}>
      {editions.map(({ key, label }) => {
        const isActive = active === key
        const accent = EDITION_ACCENT[key]
        return (
          <button key={key} onClick={() => onChange(key)} style={{
            fontFamily: C.mono, fontSize: 11, fontWeight: isActive ? 700 : 500,
            padding: '8px 14px', borderRadius: 9, flex: 1,
            background: isActive ? accent : 'transparent',
            color: isActive ? '#000' : C.text3,
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
          }}>{label}</button>
        )
      })}
    </div>
  )
}

// ─── Slide frame with download ──────────────────────────────────────────────

function SlideFrame({ slide, index, total, date, edition }: {
  slide: SlideData; index: number; total: number; date: string; edition: Edition
}) {
  const accent = EDITION_ACCENT[edition]
  const isCover = slide.type === 'cover'
  const isCta = slide.type === 'cta'
  const slideRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!slideRef.current || downloading) return
    setDownloading(true)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(slideRef.current, { pixelRatio: 3, backgroundColor: C.bg })
      const link = document.createElement('a')
      link.download = `marketlens-${edition}-${index + 1}-${slide.type}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 540 }}>
      <div ref={slideRef} style={{
        width: '100%', aspectRatio: '4/5',
        background: C.bg, borderRadius: 20,
        border: `1px solid ${C.borderMed}`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: `0 4px 40px rgba(0,0,0,0.6), 0 0 60px ${accent}08`,
        position: 'relative',
      }}>
        {/* Background gradient layers */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 20, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 20%, #101018 0%, ${C.bg} 70%)` }} />
          <div style={{ position: 'absolute', inset: 0, background: isCover
            ? `radial-gradient(circle at 50% 85%, ${accent}08 0%, transparent 45%), radial-gradient(circle at 30% 10%, ${accent}05 0%, transparent 40%)`
            : `radial-gradient(circle at 50% 0%, ${accent}05 0%, transparent 50%)`
          }} />
{/* clean bg — no scan lines */}
        </div>

        {/* Accent top stripe */}
        <div style={{
          height: 2, flexShrink: 0, position: 'relative', zIndex: 1,
          background: `linear-gradient(90deg, transparent 5%, ${accent}50 30%, ${accent} 50%, ${accent}50 70%, transparent 95%)`,
        }} />

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 20px 0', position: 'relative', zIndex: 1, flexShrink: 0,
        }}>
          {/* Logo lockup — mark + wordmark + LIVE (matches navbar) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width={18} height={Math.round(18 * 48 / 56)} viewBox="0 0 56 48" fill="#22c55e" style={{ flexShrink: 0 }}>
              <path d="M28,0 L56,14 L28,28 L0,14 Z" />
              <path d="M0,22 L28,36 L56,22" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinejoin="round" />
              <path d="M0,32 L28,46 L56,32" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinejoin="round" opacity="0.4" />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{
                fontFamily: C.sans, fontSize: 12, fontWeight: 700, color: '#F0F0F5',
                letterSpacing: '-0.3px', whiteSpace: 'nowrap' as const,
              }}>MarketLens</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 1.5 }}>
                <span style={{
                  width: 3, height: 3, borderRadius: '50%', background: '#22c55e',
                  display: 'inline-block',
                }} />
                <span style={{
                  fontFamily: C.sans, fontSize: 5.5, fontWeight: 400, color: '#C8C8D0',
                  letterSpacing: '0.8px', opacity: 0.5,
                }}>LIVE</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3 }}>{date}</span>
            <span style={{
              fontFamily: C.mono, fontSize: 8, fontWeight: 800, color: accent,
              padding: '2px 8px', borderRadius: 4,
              background: `${accent}15`, border: `1px solid ${accent}30`,
              letterSpacing: '0.1em', ...glow(accent, 8),
            }}>
              {EDITION_TAGS[edition]}
            </span>
          </div>
        </div>

        {/* Label + gradient divider */}
        {!isCover && !isCta && (
          <div style={{ padding: '10px 20px 0', position: 'relative', zIndex: 1, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: C.mono, fontSize: 9, fontWeight: 700, color: accent, letterSpacing: '0.15em' }}>{slide.label}</span>
              <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${accent}40, transparent)` }} />
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{
          flex: 1, padding: isCover || isCta ? '0 20px' : '4px 20px 0',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          position: 'relative', zIndex: 1,
        }}>
          <SlideContent slide={slide} edition={edition} />
        </div>

        {/* Bottom bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px 12px', position: 'relative', zIndex: 1, flexShrink: 0,
        }}>
          <span style={{ fontFamily: C.mono, fontSize: 9, fontWeight: 600, color: C.muted, ...tab }}>
            {index + 1}/{total}
          </span>
          {index < total - 1 && (
            <span style={{
              fontFamily: C.mono,
              fontSize: index === 0 ? 10 : 8,
              fontWeight: index === 0 ? 700 : 400,
              color: index === 0 ? accent : C.muted,
              opacity: index === 0 ? 0.8 : 0.5,
              letterSpacing: index === 0 ? '0.08em' : undefined,
            }}>{index === 0 ? 'SWIPE' : 'swipe'} &rarr;</span>
          )}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {[...Array(total)].map((_, i) => (
              <span key={i} style={{
                width: i === index ? 16 : 4, height: 3, borderRadius: 2,
                background: i === index ? accent : C.dim,
                boxShadow: i === index ? `0 0 6px ${accent}60` : 'none',
                display: 'inline-block', transition: 'all 0.3s',
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Download button overlay */}
      <button onClick={handleDownload} style={{
        position: 'absolute', top: 12, right: 12, zIndex: 10,
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        border: `1px solid ${C.borderMed}`, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: downloading ? 0.5 : 0.7, transition: 'opacity 0.2s',
      }} title="Download as PNG">
        <svg width={16} height={16} viewBox="0 0 16 16" fill="none">
          <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 12h10" stroke={C.text} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  )
}

// ─── Slide router ───────────────────────────────────────────────────────────

function SlideContent({ slide, edition }: { slide: SlideData; edition: Edition }) {
  const c = slide.content
  switch (slide.type) {
    case 'cover':      return <CoverSlide c={c} title={slide.title} edition={edition} />
    case 'heatmap':    return <HeatmapSlide c={c} />
    case 'headlines':  return <HeadlinesSlide c={c} edition={edition} />
    case 'signals':    return <SignalsSlide c={c} />
    case 'scoreboard': return <ScoreboardSlide c={c} />
    case 'sentiment':  return <SentimentSlide c={c} />
    case 'narrative':  return <NarrativeSlide c={c} title={slide.title} edition={edition} />
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

// ─── COVER ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CoverSlide({ c, title, edition }: { c: Record<string, any>; title: string; edition: Edition }) {
  const accent = EDITION_ACCENT[edition]
  const heroes = c.heroQuotes ?? []
  const topG = c.topGainer
  const topL = c.topLoser
  const fgScore = c.fearGreedScore
  const fgClr = fgScore != null ? (fgScore <= 25 ? C.red : fgScore <= 45 ? C.amber : fgScore <= 55 ? C.text2 : C.green) : C.text3
  const verdict = c.radarVerdict
  // Sentiment tint for the cover — red glow for extreme fear, green for greed
  const sentTint = fgScore != null
    ? fgScore <= 25 ? 'rgba(239,68,68,0.06)' : fgScore >= 75 ? 'rgba(34,197,94,0.06)' : 'transparent'
    : 'transparent'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 12, padding: '0',
      background: sentTint !== 'transparent' ? `radial-gradient(ellipse at 50% 40%, ${sentTint} 0%, transparent 70%)` : undefined,
    }}>
      {/* Edition label with icon + flanking gradient lines */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 1, background: `linear-gradient(90deg, transparent, ${accent}60)` }} />
          <span style={{
            fontFamily: C.mono, fontSize: 10, fontWeight: 800, letterSpacing: '0.25em',
            color: accent, ...glow(accent, 14),
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ color: accent, display: 'flex' }}><EditionIcon edition={edition} /></span>
            {EDITION_LABELS[edition]}
          </span>
          <div style={{ width: 36, height: 1, background: `linear-gradient(90deg, ${accent}60, transparent)` }} />
        </div>
        {/* Date range for weekly editions */}
        {c.dateRange && (
          <div style={{ marginTop: 4 }}>
            <span style={{
              fontFamily: C.mono, fontSize: 11, fontWeight: 600,
              color: C.text3, letterSpacing: '0.06em',
            }}>{c.dateRange}</span>
          </div>
        )}
      </div>

      {/* Headline */}
      <div style={{ textAlign: 'center', padding: '0 4px' }}>
        <h1 style={{
          fontFamily: C.sans, fontSize: 34, fontWeight: 900, color: C.text,
          lineHeight: 1.06, margin: 0, letterSpacing: '-0.8px',
        }}>{title}</h1>
      </div>

      {/* Subtitle + signal badges */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        {c.subtitle && (
          <span style={{ fontFamily: C.mono, fontSize: 12, color: C.text2, letterSpacing: '0.02em', lineHeight: 1.5 }}>{c.subtitle}</span>
        )}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          {verdict && verdict !== 'MIXED' && (
            <span style={{
              fontFamily: C.mono, fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
              padding: '3px 10px', borderRadius: 5,
              color: verdict === 'BUY' ? C.green : C.red,
              background: verdict === 'BUY' ? C.greenDim : C.redDim,
              border: `1px solid ${verdict === 'BUY' ? C.green : C.red}25`,
              ...glow(verdict === 'BUY' ? C.green : C.red, 8),
            }}>RADAR: {verdict}</span>
          )}
          {fgScore != null && (
            <span style={{
              fontFamily: C.mono, fontSize: 9, fontWeight: 800,
              padding: '3px 10px', borderRadius: 5,
              color: fgClr, background: `${fgClr}14`, border: `1px solid ${fgClr}25`,
            }}>F&amp;G {fgScore}</span>
          )}
          {c.riskScore != null && (
            <span style={{
              fontFamily: C.mono, fontSize: 9, fontWeight: 800,
              padding: '3px 10px', borderRadius: 5,
              color: c.riskScore > 70 ? C.red : c.riskScore > 40 ? C.amber : C.green,
              background: c.riskScore > 70 ? C.redDim : c.riskScore > 40 ? C.amberDim : C.greenDim,
            }}>RISK {c.riskScore}</span>
          )}
        </div>
      </div>

      {/* Top headline teaser */}
      {c.topHeadline && (
        <div style={{
          padding: '6px 14px', borderRadius: 8, background: C.surface,
          border: `1px solid ${C.border}`, margin: '0 4px',
        }}>
          <p style={{
            fontFamily: C.sans, fontSize: 11, color: C.text2, margin: 0, lineHeight: 1.4,
            fontStyle: 'italic',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
          }}>&ldquo;{c.topHeadline}&rdquo;</p>
        </div>
      )}

      {/* Hero price grid */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(heroes.length, 4)}, 1fr)`, gap: 6 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {heroes.map((q: any) => {
          const c2 = clr(q.changePercent)
          const intensity = Math.min(Math.abs(q.changePercent ?? 0) / 3, 1)
          const alpha = Math.round(3 + intensity * 10).toString(16).padStart(2, '0')
          return (
            <div key={q.symbol} style={{
              background: `linear-gradient(180deg, ${c2}${alpha} 0%, ${C.surface} 100%)`,
              borderRadius: 10, padding: '12px 6px 10px',
              border: `1px solid ${C.border}`, textAlign: 'center',
              borderBottom: `2px solid ${c2}50`,
            }}>
              <div style={{ fontFamily: C.mono, fontSize: 8, color: C.text3, letterSpacing: '0.08em', marginBottom: 4 }}>{q.name}</div>
              <div style={{ fontFamily: C.mono, fontSize: 16, fontWeight: 700, color: C.text, ...tab }}>{price(q.price)}</div>
              <div style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 800, color: c2, ...tab, ...glow(c2, 12), marginTop: 3 }}>
                {arrow(q.changePercent)} {pct(q.changePercent)}
              </div>
              {c.isWeekly && (
                <div style={{ fontFamily: C.mono, fontSize: 7, color: C.text3, marginTop: 2, letterSpacing: '0.08em' }}>THIS WEEK</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom strip: gainer / loser */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'stretch' }}>
        {topG && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 10px', borderRadius: 8, background: C.greenDim,
            borderLeft: `3px solid ${C.green}60`,
          }}>
            <span style={{ fontFamily: C.mono, fontSize: 7, color: C.text3, fontWeight: 700 }}>TOP</span>
            <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 800, color: C.green, ...glow(C.green, 10) }}>{topG.symbol}</span>
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.green, ...tab, marginLeft: 'auto' }}>+{topG.changePercent?.toFixed(1)}%</span>
          </div>
        )}
        {topL && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 10px', borderRadius: 8, background: C.redDim,
            borderLeft: `3px solid ${C.red}60`,
          }}>
            <span style={{ fontFamily: C.mono, fontSize: 7, color: C.text3, fontWeight: 700 }}>BOT</span>
            <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 800, color: C.red, ...glow(C.red, 10) }}>{topL.symbol}</span>
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.red, ...tab, marginLeft: 'auto' }}>{topL.changePercent?.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── HEATMAP — S&P 500 treemap ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HeatmapSlide({ c }: { c: Record<string, any> }) {
  const stocks: Array<{ symbol: string; name: string; changePercent: number; weight: number }> = c.stocks ?? []
  const spyChange = c.spyChange as number | null

  if (stocks.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <span style={{ fontFamily: C.mono, fontSize: 12, color: C.text3 }}>No heatmap data available</span>
    </div>
  )

  const sorted = [...stocks].sort((a, b) => b.weight - a.weight)
  // 3-row treemap: mega-caps / large-caps / mid-caps
  const rows = [
    sorted.slice(0, 3),
    sorted.slice(3, 7),
    sorted.slice(7, 15),
  ].filter(r => r.length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 4, paddingTop: 2, paddingBottom: 2 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontFamily: C.sans, fontSize: 16, fontWeight: 800, color: C.text }}>S&amp;P 500</span>
        {spyChange != null && (
          <span style={{
            fontFamily: C.mono, fontSize: 13, fontWeight: 800,
            color: clr(spyChange), padding: '3px 10px', borderRadius: 6,
            background: clrDim(spyChange), ...tab, ...glow(clr(spyChange), 8),
          }}>SPY {pct(spyChange)}</span>
        )}
      </div>

      {/* Treemap grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        {rows.map((row, ri) => {
          const totalW = row.reduce((s, x) => s + x.weight, 0)
          const isSmall = ri === 2
          return (
            <div key={ri} style={{
              display: 'flex', gap: 3,
              flex: ri === 0 ? 4 : ri === 1 ? 3.5 : 2.5,
            }}>
              {row.map(stock => {
                const { bg, fg } = heatColor(stock.changePercent)
                return (
                  <div key={stock.symbol} style={{
                    flex: stock.weight / totalW,
                    background: bg, borderRadius: isSmall ? 6 : 8,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    padding: isSmall ? '2px 1px' : '4px 2px',
                    border: '1px solid rgba(255,255,255,0.04)',
                    overflow: 'hidden', minWidth: 0,
                  }}>
                    <span style={{
                      fontFamily: C.mono,
                      fontSize: isSmall ? 10 : ri === 0 ? 18 : 13,
                      fontWeight: 900, color: fg, lineHeight: 1.2,
                    }}>{stock.symbol.replace('-', '.')}</span>
                    <span style={{
                      fontFamily: C.mono,
                      fontSize: isSmall ? 8 : ri === 0 ? 14 : 11,
                      fontWeight: 700, color: fg, ...tab, opacity: 0.9,
                      marginTop: isSmall ? 0 : 2,
                    }}>{pct(stock.changePercent)}</span>
                    {!isSmall && (
                      <span style={{
                        fontFamily: C.mono, fontSize: 7, color: fg, opacity: 0.5,
                        marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap' as const, maxWidth: '100%', padding: '0 2px',
                      }}>{stock.name.split(' ')[0]}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Legend strip */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        paddingTop: 4, flexShrink: 0,
      }}>
        {[
          { label: '-2%+', bg: 'rgba(239,68,68,0.88)' },
          { label: '-1%', bg: 'rgba(239,68,68,0.40)' },
          { label: '0%', bg: 'rgba(255,255,255,0.04)' },
          { label: '+1%', bg: 'rgba(34,197,94,0.40)' },
          { label: '+2%+', bg: 'rgba(34,197,94,0.88)' },
        ].map(({ label, bg }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: bg, display: 'inline-block' }} />
            <span style={{ fontFamily: C.mono, fontSize: 7, color: C.text3 }}>{label}</span>
          </div>
        ))}
      </div>

      <SharePrompt text="SHARE THIS HEATMAP" color={C.green} />
    </div>
  )
}

// ─── HEADLINES — news with images ───────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HeadlinesSlide({ c, edition }: { c: Record<string, any>; edition: Edition }) {
  const articles: Array<{ headline: string; imageUrl: string | null; source: string; publishedAt?: number | null }> = c.articles ?? []
  const accent = EDITION_ACCENT[edition]

  const fmtDate = (ts: number | null | undefined) => {
    if (!ts) return null
    const d = new Date(ts)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const fmtTime = (ts: number | null | undefined) => {
    if (!ts) return null
    const d = new Date(ts)
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  if (articles.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <span style={{ fontFamily: C.mono, fontSize: 12, color: C.text3 }}>No headlines available</span>
    </div>
  )

  const hero = articles[0]
  const rest = articles.slice(1, 6)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6, paddingTop: 2, paddingBottom: 2 }}>
      {/* Hero story — always has visual background */}
      <div style={{
        position: 'relative', borderRadius: 12, overflow: 'hidden',
        flexShrink: 0, height: '34%',
        background: `linear-gradient(135deg, ${accent}18 0%, #1a1a2e 40%, ${C.surface2} 100%)`,
      }}>
        {hero.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero.imageUrl} alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover',
          }} crossOrigin="anonymous" />
        ) : (
          /* Decorative fallback: abstract chart pattern */
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
            <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="xMidYMid slice" style={{ opacity: 0.15 }}>
              <defs>
                <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={accent} stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points="0,140 60,100 120,120 200,60 280,80 360,30 440,50 500,20 500,200 0,200" fill="url(#heroGrad)" />
              <polyline points="0,140 60,100 120,120 200,60 280,80 360,30 440,50 500,20" fill="none" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />
            </svg>
            <div style={{
              position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, 0)',
              fontFamily: C.mono, fontSize: 32, fontWeight: 900, color: accent, opacity: 0.08,
              letterSpacing: '0.2em', whiteSpace: 'nowrap' as const,
            }}>BREAKING</div>
          </div>
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(7,7,10,0.95) 0%, rgba(7,7,10,0.5) 40%, rgba(7,7,10,0.15) 100%)',
        }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: C.mono, fontSize: 8, fontWeight: 700, color: accent,
              letterSpacing: '0.12em', textTransform: 'uppercase' as const,
            }}>{hero.source}</span>
            {hero.publishedAt && (
              <span style={{ fontFamily: C.mono, fontSize: 8, color: C.text3 }}>
                {fmtDate(hero.publishedAt)} · {fmtTime(hero.publishedAt)}
              </span>
            )}
          </div>
          <h3 style={{
            fontFamily: C.sans, fontSize: 17, fontWeight: 800, color: C.text,
            margin: '4px 0 0', lineHeight: 1.25, letterSpacing: '-0.2px',
          }}>{hero.headline}</h3>
        </div>
      </div>

      {/* Rest of stories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflow: 'hidden' }}>
        {rest.map((a, i) => (
          <div key={i} style={{
            display: 'flex', gap: 10, alignItems: 'center',
            padding: '8px 10px', background: C.surface, borderRadius: 8,
            border: `1px solid ${C.border}`, flex: 1, minHeight: 0,
          }}>
            {a.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.imageUrl} alt="" style={{
                width: 44, height: 44, borderRadius: 6, objectFit: 'cover', flexShrink: 0,
              }} crossOrigin="anonymous" />
            ) : (
              <div style={{
                width: 44, height: 44, borderRadius: 6, flexShrink: 0,
                background: `linear-gradient(135deg, ${accent}15, ${C.surface2})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontFamily: C.mono, fontSize: 7, color: accent, fontWeight: 700 }}>NEWS</span>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontFamily: C.mono, fontSize: 7, color: accent, letterSpacing: '0.08em', fontWeight: 600 }}>{a.source}</span>
                {a.publishedAt && (
                  <span style={{ fontFamily: C.mono, fontSize: 7, color: C.text3 }}>
                    {fmtDate(a.publishedAt)} · {fmtTime(a.publishedAt)}
                  </span>
                )}
              </div>
              <p style={{
                fontFamily: C.sans, fontSize: 11, fontWeight: 600, color: C.text,
                margin: '2px 0 0', lineHeight: 1.3,
                display: '-webkit-box', WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
              }}>{a.headline}</p>
            </div>
          </div>
        ))}
      </div>

      <SharePrompt text="SHARE THESE STORIES" color={accent} />
    </div>
  )
}

// ─── SIGNALS — overnight/intraday market-moving alerts ─────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SignalsSlide({ c }: { c: Record<string, any> }) {
  const signals: Array<{ text: string; severity: string; category: string; explanation?: { type: string; headline?: string; source?: string } }> = c.signals ?? []
  const newsHeat: Array<{ region: string; intensity: number; articles: number }> = c.newsHeat ?? []

  const severityColor = (sev: string) =>
    sev === 'HIGH' ? C.red : sev === 'MED' ? C.amber : C.text3

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case 'price': return '◆'
      case 'geopolitical': return '⚑'
      case 'macro': return '◉'
      default: return '●'
    }
  }

  const intensityBar = (pct: number) => {
    const barColor = pct >= 70 ? C.red : pct >= 40 ? C.amber : C.greenMed
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.surface3 }}>
          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 2, background: barColor }} />
        </div>
        <span style={{ fontFamily: C.mono, fontSize: 9, fontWeight: 700, color: barColor, minWidth: 24, textAlign: 'right' as const }}>{pct}</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10, justifyContent: 'center' }}>
      {/* Signals list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {signals.slice(0, 4).map((s, i) => {
          const sc = severityColor(s.severity)
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '9px 12px', background: C.surface, borderRadius: 8,
              border: `1px solid ${C.border}`, borderLeft: `3px solid ${sc}60`,
            }}>
              <span style={{ fontFamily: C.mono, fontSize: 11, color: sc, flexShrink: 0, marginTop: 1 }}>
                {categoryIcon(s.category)}
              </span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: C.sans, fontSize: 11, fontWeight: 600, color: C.text, lineHeight: 1.35 }}>{s.text}</span>
                {s.explanation?.headline && (
                  <span style={{ fontFamily: C.mono, fontSize: 8, color: C.text3, lineHeight: 1.3 }}>
                    {s.explanation.source ? `${s.explanation.source}: ` : ''}{s.explanation.headline}
                  </span>
                )}
              </div>
              <span style={{
                fontFamily: C.mono, fontSize: 8, fontWeight: 800, color: sc,
                padding: '2px 6px', borderRadius: 4, background: `${sc}14`, flexShrink: 0,
              }}>{s.severity}</span>
            </div>
          )
        })}
      </div>

      {/* News heat by region */}
      {newsHeat.length > 0 && (
        <div style={{
          padding: '10px 12px', background: C.surface, borderRadius: 8,
          border: `1px solid ${C.border}`,
        }}>
          <span style={{
            fontFamily: C.mono, fontSize: 8, fontWeight: 700, color: C.text3,
            letterSpacing: '0.1em', marginBottom: 8, display: 'block',
          }}>NEWS HEAT BY REGION</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {newsHeat.slice(0, 3).map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontFamily: C.mono, fontSize: 10, fontWeight: 600, color: C.text2,
                  minWidth: 70,
                }}>{h.region}</span>
                {intensityBar(h.intensity)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SCOREBOARD — heatmap grid ──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ScoreboardSlide({ c }: { c: Record<string, any> }) {
  const quotes = c.quotes ?? []
  const isWeekly = c.isWeekly === true
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {quotes.map((q: any) => {
          const c2 = clr(q.changePercent)
          const intensity = Math.min(Math.abs(q.changePercent ?? 0) / (isWeekly ? 4 : 2.5), 1)
          const bgAlpha = (0.02 + intensity * 0.10).toFixed(2)
          const bgColor = (q.changePercent ?? 0) >= 0 ? `rgba(0,255,136,${bgAlpha})` : `rgba(255,68,68,${bgAlpha})`
          return (
            <div key={q.symbol} style={{
              background: `linear-gradient(135deg, ${bgColor} 0%, ${C.surface} 100%)`,
              borderRadius: 10, padding: '12px 12px 10px',
              border: `1px solid ${C.border}`, borderLeft: `3px solid ${c2}60`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: '0.05em', fontWeight: 600 }}>{q.name}</span>
                <span style={{
                  fontFamily: C.mono, fontSize: 8, fontWeight: 800, color: c2,
                  padding: '1px 6px', borderRadius: 3, background: clrDim(q.changePercent),
                }}>{isWeekly ? 'WK' : arrow(q.changePercent)}</span>
              </div>
              <div style={{ fontFamily: C.mono, fontSize: 22, fontWeight: 800, color: C.text, ...tab, ...glow(C.text, 8), lineHeight: 1 }}>
                {price(q.price)}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                <span style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 800, color: c2, ...tab, ...glow(c2, 10) }}>
                  {pct(q.changePercent)}
                </span>
                {q.change != null && q.change !== 0 && (
                  <span style={{ fontFamily: C.mono, fontSize: 10, color: c2, ...tab, opacity: 0.6 }}>
                    {(q.change ?? 0) >= 0 ? '+' : ''}{fmt(q.change)}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── SENTIMENT — Fear & Greed gauge using stroke-dasharray (no SVG arc flags) ─

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SentimentSlide({ c }: { c: Record<string, any> }) {
  const fg = c.fearGreed
  const score = fg?.score ?? 50
  const rating = fg?.rating ?? 'Neutral'
  const history: number[] = (fg?.history ?? []).map((h: { score: number }) => h.score)

  const sc = score <= 20 ? '#EF4444' : score <= 40 ? '#F97316' : score <= 60 ? '#6B7280' : score <= 80 ? '#34D399' : '#22C55E'

  // Gauge geometry — circle-based, avoids SVG arc path bugs
  const W = 300, gcx = W / 2, gcy = 126, gr = 96, sw = 14
  const circ = 2 * Math.PI * gr       // full circumference
  const half = circ / 2               // dome = half circle
  const zoneLen = half / 5            // 5 equal zones
  const activeLen = (score / 100) * half

  // Zone colors
  const zoneColors = ['#EF4444', '#F97316', '#6B7280', '#34D399', '#22C55E']

  // Needle tip — dome goes from 180° (left) through 270° (top) to 360° (right)
  const na = Math.PI + (score / 100) * Math.PI
  const ntx = gcx + (gr - 4) * Math.cos(na)
  const nty = gcy + (gr - 4) * Math.sin(na)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 6, padding: '0' }}>
      {/* SVG Gauge */}
      <div style={{ textAlign: 'center', margin: '0 -4px' }}>
        <svg width="100%" viewBox={`0 0 ${W} 188`}>
          <defs>
            <filter id="activeGlow">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* 5 colored zone segments — each is a circle with dasharray */}
          {zoneColors.map((color, i) => (
            <circle key={i} cx={gcx} cy={gcy} r={gr} fill="none"
              stroke={color} strokeWidth={sw} opacity={0.25}
              strokeDasharray={`${zoneLen + 0.5} ${circ}`}
              strokeDashoffset={-(i * zoneLen)}
              transform={`rotate(180, ${gcx}, ${gcy})`}
            />
          ))}

          {/* Active fill — bright arc from 0 up to score */}
          {score > 1 && (
            <circle cx={gcx} cy={gcy} r={gr} fill="none"
              stroke={sc} strokeWidth={sw + 2} opacity={0.9}
              strokeLinecap="round"
              strokeDasharray={`${activeLen} ${circ}`}
              strokeDashoffset={0}
              transform={`rotate(180, ${gcx}, ${gcy})`}
              filter="url(#activeGlow)"
            />
          )}

          {/* Needle */}
          <line x1={gcx} y1={gcy} x2={ntx} y2={nty}
            stroke={C.text} strokeWidth={2.5} strokeLinecap="round" opacity={0.9} />
          <circle cx={ntx} cy={nty} r={4} fill={sc} />
          <circle cx={gcx} cy={gcy} r={5} fill={C.surface2} stroke={C.text3} strokeWidth={1.5} />

          {/* 0 and 100 labels at dome endpoints */}
          <text x={gcx - gr - 12} y={gcy + 5} textAnchor="end" fill="#EF4444"
            style={{ fontFamily: C.mono, fontSize: 9, fontWeight: 700 }}>0</text>
          <text x={gcx + gr + 12} y={gcy + 5} textAnchor="start" fill="#22C55E"
            style={{ fontFamily: C.mono, fontSize: 9, fontWeight: 700 }}>100</text>

          {/* Score — big number centered inside dome */}
          <text x={gcx} y={gcy - 26} textAnchor="middle" fill={C.text}
            style={{ fontFamily: C.mono, fontSize: 48, fontWeight: 900 }}>{score}</text>
          <text x={gcx} y={gcy - 8} textAnchor="middle" fill={sc}
            style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em' }}>
            {rating.toUpperCase()}
          </text>
        </svg>
      </div>

      {/* 30-day history sparkline */}
      {history.length > 5 && (() => {
        const { line, area } = sparklinePath(history, 500, 50)
        const lastScore = history[history.length - 1]
        const lastClr = lastScore <= 25 ? '#EF4444' : lastScore <= 45 ? '#F97316' : lastScore <= 55 ? C.text3 : '#22C55E'
        return (
          <div style={{ padding: '0 2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontFamily: C.mono, fontSize: 7, color: C.text3, letterSpacing: '0.1em' }}>30-DAY TREND</span>
              <span style={{ fontFamily: C.mono, fontSize: 7, color: lastClr, fontWeight: 700 }}>NOW: {lastScore}</span>
            </div>
            <svg width="100%" viewBox="0 0 500 50" style={{ display: 'block' }}>
              <defs>
                <linearGradient id="fgArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={lastClr} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={lastClr} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={area} fill="url(#fgArea)" />
              <path d={line} fill="none" stroke={lastClr} strokeWidth={2.5} strokeLinecap="round" opacity={0.8} />
              <circle cx={500 - 4} cy={50 / 2} r={4} fill={lastClr} opacity={0.9} />
            </svg>
          </div>
        )
      })()}

      {/* Compact stats row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 12px', borderRadius: 8, background: C.surface,
        border: `1px solid ${C.border}`, gap: 8,
      }}>
        {c.cryptoFearGreed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontFamily: C.mono, fontSize: 7, color: C.text3, letterSpacing: '0.06em' }}>CRYPTO F&amp;G</span>
            <span style={{ fontFamily: C.mono, fontSize: 14, fontWeight: 900, color: C.text }}>{c.cryptoFearGreed.score}</span>
            <span style={{ fontFamily: C.mono, fontSize: 7, color: C.text3, padding: '1px 4px', borderRadius: 3, background: C.dim }}>{c.cryptoFearGreed.label}</span>
          </div>
        )}
        {c.riskLevel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontFamily: C.mono, fontSize: 7, color: C.text3, letterSpacing: '0.06em' }}>RISK</span>
            <span style={{
              fontFamily: C.mono, fontSize: 10, fontWeight: 800,
              padding: '2px 6px', borderRadius: 4,
              color: c.riskLevel.score > 70 ? C.red : c.riskLevel.score > 40 ? C.amber : C.green,
              background: c.riskLevel.score > 70 ? C.redDim : c.riskLevel.score > 40 ? C.amberDim : C.greenDim,
            }}>{c.riskLevel.score}</span>
          </div>
        )}
        {fg?.oneMonthAgo != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: C.mono, fontSize: 7, color: C.text3 }}>1MO AGO</span>
            <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, color: score > fg.oneMonthAgo ? C.green : C.red }}>
              {fg.oneMonthAgo}
            </span>
          </div>
        )}
      </div>

      {/* AI verdict */}
      {c.sentimentVerdict && (
        <div style={{
          padding: '6px 10px', borderRadius: 8, background: C.surface,
          border: `1px solid ${C.border}`, borderLeft: `2px solid ${sc}40`,
        }}>
          <p style={{ fontFamily: C.sans, fontSize: 11, color: C.text2, margin: 0, lineHeight: 1.4, fontStyle: 'italic' }}>
            &ldquo;{c.sentimentVerdict}&rdquo;
          </p>
        </div>
      )}
    </div>
  )
}

// ─── NARRATIVE ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NarrativeSlide({ c, title, edition }: { c: Record<string, any>; title: string; edition: Edition }) {
  const cps = (c.chokepoints ?? []).filter((cp: { status?: string }) => cp.status && cp.status !== 'NORMAL')
  const accent = EDITION_ACCENT[edition]
  const narrative: string = c.narrative ?? ''

  // Split into bullet points — Groq outputs "TOPIC: explanation" lines
  // Strip markdown bold (**), leading list markers (- * 1.), and stray asterisks
  const bullets = narrative.split(/\n/)
    .map((b: string) => b.replace(/^[\-\*\d\.]+\s*/, '').replace(/\*\*/g, '').trim())
    .filter((b: string) => b.length > 10)
    .slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6, padding: '0' }}>
      <h3 style={{ fontFamily: C.sans, fontSize: 20, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.3px', flexShrink: 0 }}>{title}</h3>

      {/* Narrative bullets — flex:1 fills available space, space-evenly distributes cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, justifyContent: 'space-evenly' }}>
        {bullets.map((bullet: string, i: number) => {
          const colonIdx = bullet.indexOf(':')
          const hasTopic = colonIdx > 0 && colonIdx < 30
          const topic = hasTopic ? bullet.slice(0, colonIdx).trim() : null
          const explanation = hasTopic ? bullet.slice(colonIdx + 1).trim() : bullet
          return (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '18px 14px', borderRadius: 10,
              background: C.surface, border: `1px solid ${C.border}`,
              borderLeft: `3px solid ${accent}50`,
            }}>
              <span style={{
                fontFamily: C.mono, fontSize: 22, fontWeight: 900, color: accent,
                width: 26, textAlign: 'center', flexShrink: 0, ...glow(accent, 10), lineHeight: 1,
              }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                {topic ? (
                  <>
                    <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 800, color: C.text, letterSpacing: '0.04em' }}>
                      {topic.toUpperCase()}
                    </span>
                    <p style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, margin: '4px 0 0', lineHeight: 1.5 }}>
                      {explanation}
                    </p>
                  </>
                ) : (
                  <p style={{ fontFamily: C.sans, fontSize: 13, color: C.text2, margin: 0, lineHeight: 1.5 }}>{bullet}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Chokepoint alerts — only non-normal statuses */}
      {cps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: C.mono, fontSize: 8, color: C.text3, letterSpacing: '0.12em', fontWeight: 600 }}>SUPPLY CHAIN ALERTS</span>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {cps.slice(0, 3).map((cp: any, i: number) => {
            const cl = cp.status === 'DISRUPTED' ? C.red : cp.status === 'ELEVATED' ? C.amber : C.green
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', background: C.surface, borderRadius: 8,
                border: `1px solid ${C.border}`, borderLeft: `3px solid ${cl}60`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: cl, flexShrink: 0, boxShadow: `0 0 6px ${cl}60` }} />
                <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, color: C.text, flex: 1 }}>{cp.name}</span>
                <span style={{ fontFamily: C.mono, fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 3, background: `${cl}18`, color: cl }}>{cp.status}</span>
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
  const maxG = Math.max(...gainers.map((m: { changePercent: number }) => Math.abs(m.changePercent)), 0.01)
  const maxL = Math.max(...losers.map((m: { changePercent: number }) => Math.abs(m.changePercent)), 0.01)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Row = ({ m, i, cl, clD, max }: { m: any; i: number; cl: string; clD: string; max: number }) => {
    const barW = (Math.abs(m.changePercent) / max) * 100
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 10px', background: C.surface, borderRadius: 8,
        border: `1px solid ${C.border}`, borderLeft: `3px solid ${cl}50`,
      }}>
        <span style={{ fontFamily: C.mono, fontSize: 14, fontWeight: 900, color: cl, width: 18, textAlign: 'right', ...glow(cl, 8) }}>{i + 1}</span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: C.text }}>{m.symbol}</span>
            <span style={{ fontFamily: C.sans, fontSize: 9, color: C.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{m.name}</span>
          </div>
          <div style={{ height: 3, background: C.dim, borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.max(barW, 5)}%`, background: `linear-gradient(90deg, ${clD}, ${cl})`, borderRadius: 2 }} />
          </div>
        </div>
        <span style={{
          fontFamily: C.mono, fontSize: 12, fontWeight: 800, color: cl,
          ...tab, ...glow(cl, 8), padding: '2px 8px', borderRadius: 5, background: clD, flexShrink: 0,
        }}>{pct(m.changePercent)}</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <div style={{ width: 3, height: 14, background: C.green, borderRadius: 2, boxShadow: `0 0 4px ${C.green}60` }} />
        <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 800, color: C.green, letterSpacing: '0.14em' }}>WINNERS</span>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {gainers.slice(0, 5).map((m: any, i: number) => <Row key={i} m={m} i={i} cl={C.green} clD={C.greenDim} max={maxG} />)}

      <div style={{ height: 1, background: `linear-gradient(90deg, transparent 10%, ${C.borderMed} 50%, transparent 90%)`, margin: '4px 0' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <div style={{ width: 3, height: 14, background: C.red, borderRadius: 2, boxShadow: `0 0 4px ${C.red}60` }} />
        <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 800, color: C.red, letterSpacing: '0.14em' }}>LOSERS</span>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {losers.slice(0, 5).map((m: any, i: number) => <Row key={i} m={m} i={i} cl={C.red} clD={C.redDim} max={maxL} />)}
    </div>
  )
}

// ─── ENERGY ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EnergySlide({ c }: { c: Record<string, any> }) {
  const oil = c.oil
  const oilUp = oil && (oil.changePercent ?? 0) >= 0
  const items = [
    { name: 'Gold', data: c.gold },
    { name: 'Silver', data: c.silver },
    { name: 'Nat Gas', data: c.natgas },
  ].filter(o => o.data)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 8, padding: '0' }}>
      {oil && (
        <div style={{
          textAlign: 'center', padding: '12px 0', borderRadius: 12,
          background: `radial-gradient(circle at 50% 50%, ${clr(oil.changePercent)}06 0%, transparent 70%)`,
        }}>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: '0.2em', marginBottom: 4, fontWeight: 600 }}>BRENT CRUDE</div>
          <div style={{ fontFamily: C.mono, fontSize: 46, fontWeight: 900, color: C.text, ...tab, ...glow(C.text, 16), lineHeight: 1 }}>
            {price(oil.price)}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8,
            padding: '4px 14px', borderRadius: 6, background: clrDim(oil.changePercent),
            border: `1px solid ${clr(oil.changePercent)}20`,
          }}>
            <span style={{ fontSize: 10, color: clr(oil.changePercent) }}>{arrow(oil.changePercent)}</span>
            <span style={{ fontFamily: C.mono, fontSize: 16, fontWeight: 800, color: clr(oil.changePercent), ...tab, ...glow(clr(oil.changePercent), 10) }}>
              {pct(oil.changePercent)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <svg width={160} height={32} viewBox="0 0 160 32" style={{ opacity: 0.35 }}>
              <defs>
                <linearGradient id="oilGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={oilUp ? C.green : C.red} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={oilUp ? C.green : C.red} stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points={oilUp ? '0,28 0,22 22,19 44,16 66,18 88,12 110,9 132,5 160,3 160,32 0,32' : '0,3 0,5 22,8 44,14 66,11 88,18 110,22 132,25 160,28 160,32 0,32'}
                fill="url(#oilGrad)" />
              <polyline points={oilUp ? '0,22 22,19 44,16 66,18 88,12 110,9 132,5 160,3' : '0,5 22,8 44,14 66,11 88,18 110,22 132,25 160,28'}
                fill="none" stroke={oilUp ? C.green : C.red} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: items.length === 3 ? '1fr 1fr 1fr' : '1fr 1fr', gap: 6 }}>
        {items.map(({ name, data }) => {
          const c2 = clr(data.changePercent)
          return (
            <div key={name} style={{
              background: C.surface, borderRadius: 10, padding: '12px 8px',
              border: `1px solid ${C.border}`, textAlign: 'center',
              borderBottom: `2px solid ${c2}40`,
            }}>
              <div style={{ fontFamily: C.mono, fontSize: 8, color: C.text3, letterSpacing: '0.08em', marginBottom: 4, fontWeight: 600 }}>{name.toUpperCase()}</div>
              <div style={{ fontFamily: C.mono, fontSize: 20, fontWeight: 800, color: C.text, ...tab, ...glow(C.text, 6) }}>{price(data.price)}</div>
              <div style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 800, color: c2, ...tab, marginTop: 3, ...glow(c2, 8) }}>{pct(data.changePercent)}</div>
            </div>
          )
        })}
      </div>

      {c.narrative && (
        <p style={{
          fontFamily: C.sans, fontSize: 12, color: C.text2, margin: 0, lineHeight: 1.5, textAlign: 'center',
          padding: '10px 14px', borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`,
        }}>{c.narrative}</p>
      )}
    </div>
  )
}

// ─── CRYPTO ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CryptoSlide({ c }: { c: Record<string, any> }) {
  const btc = c.btc
  const btcUp = btc && (btc.changePercent ?? 0) >= 0
  const alts = [
    { name: 'Ethereum', sym: 'ETH', data: c.eth },
    { name: 'Solana', sym: 'SOL', data: c.sol },
  ].filter(o => o.data)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 8, padding: '0' }}>
      {btc && (
        <div style={{
          textAlign: 'center', padding: '12px 0', borderRadius: 12,
          background: `radial-gradient(circle at 50% 50%, ${clr(btc.changePercent)}06 0%, transparent 70%)`,
        }}>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: '0.2em', marginBottom: 4, fontWeight: 600 }}>BITCOIN</div>
          <div style={{ fontFamily: C.mono, fontSize: 40, fontWeight: 900, color: C.text, ...tab, ...glow(C.text, 16), lineHeight: 1 }}>
            {price(btc.price)}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8,
            padding: '4px 14px', borderRadius: 6, background: clrDim(btc.changePercent),
            border: `1px solid ${clr(btc.changePercent)}20`,
          }}>
            <span style={{ fontSize: 10, color: clr(btc.changePercent) }}>{arrow(btc.changePercent)}</span>
            <span style={{ fontFamily: C.mono, fontSize: 16, fontWeight: 800, color: clr(btc.changePercent), ...tab, ...glow(clr(btc.changePercent), 10) }}>
              {pct(btc.changePercent)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <svg width={160} height={32} viewBox="0 0 160 32" style={{ opacity: 0.3 }}>
              <polyline points={btcUp ? '0,26 22,22 44,24 66,16 88,14 110,10 132,6 160,3' : '0,4 22,7 44,12 66,9 88,16 110,20 132,24 160,28'}
                fill="none" stroke={btcUp ? C.green : C.red} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {alts.map(({ name, sym, data }) => {
          const c2 = clr(data.changePercent)
          return (
            <div key={sym} style={{
              background: C.surface, borderRadius: 10, padding: '14px 10px',
              border: `1px solid ${C.border}`, borderBottom: `2px solid ${c2}40`,
            }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: '0.06em', marginBottom: 4, fontWeight: 600 }}>{name.toUpperCase()}</div>
              <div style={{ fontFamily: C.mono, fontSize: 24, fontWeight: 800, color: C.text, ...tab, ...glow(C.text, 6) }}>{price(data.price)}</div>
              <div style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 800, color: c2, ...tab, marginTop: 3, ...glow(c2, 8) }}>{pct(data.changePercent)}</div>
            </div>
          )
        })}
      </div>

      {c.cryptoFearGreed && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
        }}>
          <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: '0.08em', fontWeight: 600 }}>CRYPTO FEAR &amp; GREED</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: C.mono, fontSize: 22, fontWeight: 900, color: C.text, ...glow(C.text, 10) }}>{c.cryptoFearGreed.score}</span>
            <span style={{ fontFamily: C.mono, fontSize: 8, fontWeight: 700, color: C.text2, padding: '2px 8px', borderRadius: 4, background: C.dim }}>{c.cryptoFearGreed.label}</span>
          </div>
        </div>
      )}

      {c.narrative && (
        <p style={{
          fontFamily: C.sans, fontSize: 12, color: C.text2, margin: 0, lineHeight: 1.5, textAlign: 'center',
          padding: '10px 14px', borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`,
        }}>{c.narrative}</p>
      )}
    </div>
  )
}

// ─── FOREX — diverging strength bars ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ForexSlide({ c }: { c: Record<string, any> }) {
  const dxy = c.dxy
  const currencies: Array<{ currency: string; score: number }> = c.currencies ?? []
  const maxScore = Math.max(...currencies.map(f => Math.abs(f.score)), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 8, padding: '0' }}>
      {dxy && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
        }}>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: '0.12em', marginBottom: 2, fontWeight: 600 }}>US DOLLAR INDEX</div>
            <div style={{ fontFamily: C.mono, fontSize: 26, fontWeight: 900, color: C.text, ...tab, ...glow(C.text, 10) }}>{fmt(dxy.price)}</div>
          </div>
          <span style={{
            fontFamily: C.mono, fontSize: 14, fontWeight: 800, color: clr(dxy.changePercent),
            ...tab, padding: '4px 10px', borderRadius: 6, background: clrDim(dxy.changePercent),
            ...glow(clr(dxy.changePercent), 8),
          }}>{pct(dxy.changePercent)}</span>
        </div>
      )}

      {currencies.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {currencies.slice(0, 10).map(f => {
            const bw = (Math.abs(f.score) / maxScore) * 50
            const fc = f.score >= 0 ? C.green : C.red
            const intensity = Math.min(Math.abs(f.score) / maxScore, 1)
            return (
              <div key={f.currency} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 800, color: C.text, width: 30 }}>{f.currency}</span>
                <div style={{ flex: 1, height: 14, position: 'relative', background: C.surface, borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: C.muted }} />
                  <div style={{
                    position: 'absolute', height: '100%', borderRadius: 7,
                    background: `linear-gradient(${f.score >= 0 ? '90deg' : '270deg'}, ${fc}40, ${fc})`,
                    width: `${Math.max(bw, 2)}%`,
                    opacity: 0.5 + intensity * 0.5,
                    ...(f.score >= 0 ? { left: '50%' } : { right: '50%' }),
                  }} />
                </div>
                <span style={{
                  fontFamily: C.mono, fontSize: 10, fontWeight: 800, color: fc,
                  width: 36, textAlign: 'right', ...tab, ...glow(fc, 6),
                }}>{f.score > 0 ? '+' : ''}{f.score.toFixed(1)}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
          <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>Strength data unavailable</span>
        </div>
      )}

      {c.narrative && (
        <p style={{
          fontFamily: C.sans, fontSize: 12, color: C.text2, margin: 0, lineHeight: 1.5, textAlign: 'center',
          padding: '8px 12px', borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`,
        }}>{c.narrative}</p>
      )}
    </div>
  )
}

// ─── SECTORS — colored block grid ───────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectorsSlide({ c }: { c: Record<string, any> }) {
  const sectors: Array<{ sector: string; score: number }> = c.sectors ?? []
  if (sectors.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <span style={{ fontFamily: C.mono, fontSize: 12, color: C.text3 }}>No sector data</span>
    </div>
  )

  const mx = Math.max(...sectors.map(s => Math.abs(s.score)), 1)
  const cols = 3
  const rows = Math.ceil(sectors.length / cols)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 4, padding: '0' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: 4,
      }}>
        {sectors.slice(0, 12).map(s => {
          const intensity = Math.min(Math.abs(s.score) / mx, 1)
          const op = intensity > 0.7 ? 0.65 : intensity > 0.3 ? 0.35 : 0.15
          const bg = s.score >= 0 ? `rgba(34,197,94,${op})` : `rgba(239,68,68,${op})`
          const fc = intensity > 0.5 ? '#fff' : s.score >= 0 ? C.green : C.red
          return (
            <div key={s.sector} style={{
              background: bg, borderRadius: 8,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', padding: '6px 4px',
              border: '1px solid rgba(255,255,255,0.04)',
            }}>
              <span style={{
                fontFamily: C.mono, fontSize: 8, fontWeight: 700, color: fc, opacity: 0.7,
                letterSpacing: '0.04em', textAlign: 'center',
                overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap' as const, maxWidth: '100%',
              }}>{s.sector.replace('Communication Services', 'Comms').replace('Consumer Discretionary', 'Disc.').replace('Consumer Staples', 'Staples').replace('Information Technology', 'Tech').replace('Health Care', 'Health').replace('Real Estate', 'Real Est.').toUpperCase()}</span>
              <span style={{
                fontFamily: C.mono, fontSize: 16, fontWeight: 900, color: fc, ...tab,
                marginTop: 2,
              }}>{s.score > 0 ? '+' : ''}{s.score.toFixed(1)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── RADAR ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RadarSlide({ c }: { c: Record<string, any> }) {
  const verdict = c.verdict ?? 'MIXED'
  const signals = c.signals ?? []
  const vc = verdict === 'BUY' ? C.green : verdict === 'SELL' ? C.red : C.amber

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 12 }}>
      <div style={{ textAlign: 'center' }}>
        <span style={{
          fontFamily: C.mono, fontSize: 38, fontWeight: 900, color: vc,
          ...glow(vc, 24), letterSpacing: '0.08em',
        }}>{verdict}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {signals.slice(0, 6).map((s: any, i: number) => {
          const sc = s.signal === 'BUY' || s.signal === 'BULLISH' ? C.green
            : s.signal === 'SELL' || s.signal === 'BEARISH' ? C.red : C.amber
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', background: C.surface, borderRadius: 8,
              border: `1px solid ${C.border}`, borderLeft: `3px solid ${sc}60`,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: '50%', background: sc, flexShrink: 0,
                boxShadow: `0 0 6px ${sc}60`,
              }} />
              <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 600, color: C.text, flex: 1 }}>{s.name ?? s.indicator ?? `Signal ${i + 1}`}</span>
              <span style={{
                fontFamily: C.mono, fontSize: 9, fontWeight: 800, color: sc,
                padding: '2px 8px', borderRadius: 4, background: `${sc}14`,
              }}>{s.signal ?? s.value ?? '—'}</span>
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
  const accent = EDITION_ACCENT[edition]
  const items: string[] = c.watchItems ?? []
  const predictions: Array<{ title: string; probability: number }> = c.predictions ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8, padding: '0' }}>
      {/* Watch items — flex:1 fills space, space-evenly distributes cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, justifyContent: 'space-evenly' }}>
        {items.slice(0, 3).map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '20px 16px', background: C.surface, borderRadius: 12,
            border: `1px solid ${C.border}`, borderLeft: `3px solid ${accent}50`,
          }}>
            <span style={{
              fontFamily: C.mono, fontSize: 28, fontWeight: 900, color: accent,
              width: 32, textAlign: 'center', flexShrink: 0, ...glow(accent, 10),
            }}>{i + 1}</span>
            <span style={{ fontFamily: C.sans, fontSize: 14, color: C.text2, lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>

      {/* Predictions — up to 5 items with visual progress bars */}
      {predictions.length > 0 && (
        <div style={{
          padding: '14px 14px', borderRadius: 12,
          background: C.surface, border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: '0.1em', marginBottom: 8, fontWeight: 600 }}>PREDICTION MARKETS</div>
          {predictions.slice(0, 5).map((p, i) => {
            const prob = p.probability ?? 0
            const barClr = prob >= 70 ? C.green : prob >= 30 ? C.amber : C.text3
            return (
              <div key={i} style={{ marginTop: i > 0 ? 10 : 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: 5,
                }}>
                  <span style={{
                    fontFamily: C.sans, fontSize: 11, color: C.text2, flex: 1, lineHeight: 1.35,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
                    marginRight: 8,
                  }}>{p.title}</span>
                  <span style={{
                    fontFamily: C.mono, fontSize: 14, fontWeight: 800, color: barClr,
                    ...tab, flexShrink: 0, ...glow(barClr, 6),
                  }}>{prob.toFixed(0)}%</span>
                </div>
                <div style={{ height: 6, background: C.dim, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${Math.max(prob, 2)}%`,
                    background: `linear-gradient(90deg, ${barClr}60, ${barClr})`,
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── PULSE — Market Vitals Dashboard ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PulseSlide({ c }: { c: Record<string, any> }) {
  const metrics: { key: string; label: string; price: number; changePercent: number }[] = c.metrics ?? []
  const bias: string = c.bias ?? 'MIXED'
  const fg = c.fearGreed
  const risk = c.riskLevel

  const biasColor = bias.includes('RISK-ON') || bias.includes('BULLISH') ? C.green
    : bias.includes('RISK-OFF') || bias.includes('BEARISH') ? C.red : C.amber
  const biasBg = bias.includes('RISK-ON') || bias.includes('BULLISH') ? C.greenDim
    : bias.includes('RISK-OFF') || bias.includes('BEARISH') ? C.redDim : C.amberDim

  // Max bar width for diverging bars
  const maxPct = Math.max(3, ...metrics.map(m => Math.abs(m.changePercent)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', gap: 10, padding: '0' }}>
      {/* Bias badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <div style={{
          padding: '6px 20px', borderRadius: 20, background: biasBg,
          border: `1px solid ${biasColor}40`,
        }}>
          <span style={{ fontFamily: C.mono, fontSize: 14, fontWeight: 900, color: biasColor, letterSpacing: '0.12em' }}>{bias}</span>
        </div>
      </div>

      {/* Diverging bar chart */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 6,
        padding: '12px 14px', borderRadius: 10, background: C.surface,
        border: `1px solid ${C.border}`,
      }}>
        {metrics.map(m => {
          const pos = m.changePercent >= 0
          const barWidth = Math.min(100, (Math.abs(m.changePercent) / maxPct) * 100)
          const barColor = pos ? C.green : C.red
          return (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {/* Label */}
              <span style={{
                fontFamily: C.mono, fontSize: 9, fontWeight: 700, color: C.text3,
                width: 80, flexShrink: 0, letterSpacing: '0.04em',
              }}>{m.label}</span>

              {/* Diverging bar — centered */}
              <div style={{ flex: 1, height: 20, position: 'relative', display: 'flex', alignItems: 'center' }}>
                {/* Center line */}
                <div style={{
                  position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1,
                  background: `${C.text3}30`,
                }} />
                {/* Bar fill */}
                <div style={{
                  position: 'absolute',
                  ...(pos
                    ? { left: '50%', width: `${barWidth / 2}%` }
                    : { right: '50%', width: `${barWidth / 2}%` }),
                  top: 3, bottom: 3, borderRadius: 3,
                  background: `linear-gradient(${pos ? '90deg' : '270deg'}, ${barColor}90, ${barColor}40)`,
                  boxShadow: `0 0 8px ${barColor}30`,
                }} />
              </div>

              {/* Value */}
              <span style={{
                fontFamily: C.mono, fontSize: 11, fontWeight: 800, color: pos ? C.green : C.red,
                width: 56, textAlign: 'right', flexShrink: 0,
              }}>{pos ? '+' : ''}{m.changePercent.toFixed(2)}%</span>
            </div>
          )
        })}
      </div>

      {/* Gauges row — F&G + Risk */}
      <div style={{ display: 'flex', gap: 8 }}>
        {fg && (() => {
          const s = fg.score ?? 50
          const sc = s <= 20 ? '#EF4444' : s <= 40 ? '#F97316' : s <= 60 ? '#6B7280' : s <= 80 ? '#34D399' : '#22C55E'
          return (
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 10, background: C.surface,
              border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <span style={{ fontFamily: C.mono, fontSize: 7, color: C.text3, letterSpacing: '0.1em', fontWeight: 600 }}>FEAR &amp; GREED</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: C.mono, fontSize: 28, fontWeight: 900, color: C.text, lineHeight: 1 }}>{s}</span>
                <span style={{
                  fontFamily: C.mono, fontSize: 8, fontWeight: 700, color: sc,
                  padding: '2px 6px', borderRadius: 4, background: `${sc}18`,
                }}>{(fg.rating ?? '').toUpperCase()}</span>
              </div>
              {/* Mini bar */}
              <div style={{ height: 5, borderRadius: 3, background: `${C.text3}15`, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${s}%`, borderRadius: 3,
                  background: `linear-gradient(90deg, #EF4444, #F97316, #6B7280, #34D399, #22C55E)`,
                }} />
              </div>
            </div>
          )
        })()}

        {risk && (() => {
          const s = risk.score ?? 50
          const rc = s > 70 ? C.red : s > 40 ? C.amber : C.green
          const rcBg = s > 70 ? C.redDim : s > 40 ? C.amberDim : C.greenDim
          return (
            <div style={{
              flex: 1, padding: '10px 12px', borderRadius: 10, background: C.surface,
              border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <span style={{ fontFamily: C.mono, fontSize: 7, color: C.text3, letterSpacing: '0.1em', fontWeight: 600 }}>RISK LEVEL</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: C.mono, fontSize: 28, fontWeight: 900, color: C.text, lineHeight: 1 }}>{s}</span>
                <span style={{
                  fontFamily: C.mono, fontSize: 8, fontWeight: 700, color: rc,
                  padding: '2px 6px', borderRadius: 4, background: rcBg,
                }}>{(risk.level ?? 'MODERATE').toUpperCase()}</span>
              </div>
              {/* Mini bar */}
              <div style={{ height: 5, borderRadius: 3, background: `${C.text3}15`, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s}%`, borderRadius: 3, background: rc }} />
              </div>
            </div>
          )
        })()}
      </div>

      {/* AI verdict */}
      {c.sentimentVerdict && (
        <div style={{
          padding: '8px 12px', borderRadius: 8, background: C.surface,
          border: `1px solid ${C.border}`, borderLeft: `2px solid ${biasColor}50`,
        }}>
          <p style={{ fontFamily: C.sans, fontSize: 11, color: C.text2, margin: 0, lineHeight: 1.4, fontStyle: 'italic' }}>
            &ldquo;{c.sentimentVerdict}&rdquo;
          </p>
        </div>
      )}
    </div>
  )
}

// ─── CTA ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CtaSlide({ c }: { c: Record<string, any> }) {
  const edition = (c.edition ?? 'morning') as Edition
  const accent = EDITION_ACCENT[edition]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center',
    }}>
      {/* Logo — stacked diamond mark + wordmark + LIVE */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg width={48} height={Math.round(48 * 48 / 56)} viewBox="0 0 56 48" fill="#22c55e">
          <path d="M28,0 L56,14 L28,28 L0,14 Z" />
          <path d="M0,22 L28,36 L56,22" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M0,32 L28,46 L56,32" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinejoin="round" opacity="0.4" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{
            fontFamily: C.sans, fontSize: 28, fontWeight: 700, color: '#F0F0F5',
            letterSpacing: '-0.3px', whiteSpace: 'nowrap' as const,
          }}>
            MarketLens
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3 }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: '#22c55e',
              display: 'inline-block', boxShadow: '0 0 6px #22c55e',
            }} />
            <span style={{
              fontFamily: C.sans, fontSize: 9, fontWeight: 400, color: '#C8C8D0',
              letterSpacing: '0.8px', opacity: 0.5,
            }}>LIVE</span>
          </div>
        </div>
      </div>

      <p style={{
        fontFamily: C.sans, fontSize: 13, color: C.text2, margin: 0,
        lineHeight: 1.6, maxWidth: 320, textAlign: 'center',
      }}>Real-time prices. AI analysis. Geopolitical intelligence.</p>

      {/* Feature pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 340 }}>
        {['Live Charts', 'AI Sentiment', 'News Hub', 'Geopolitics', 'Crypto', 'Commodities'].map(f => (
          <span key={f} style={{
            fontFamily: C.mono, fontSize: 8, fontWeight: 700, color: C.text3,
            padding: '3px 10px', borderRadius: 6, background: C.surface,
            border: `1px solid ${C.border}`, letterSpacing: '0.04em',
          }}>{f}</span>
        ))}
      </div>

      <div style={{
        padding: '12px 32px', borderRadius: 12,
        background: `linear-gradient(135deg, ${C.green}18, ${accent}12)`,
        border: `1px solid ${C.green}30`,
      }}>
        <span style={{
          fontFamily: C.mono, fontSize: 14, fontWeight: 800, color: C.green,
          ...glow(C.green, 12),
        }}>100% Free. No Signup.</span>
      </div>

      {c.followCta && (
        <p style={{
          fontFamily: C.sans, fontSize: 13, color: C.text2, margin: 0, lineHeight: 1.4,
        }}>{c.followCta}</p>
      )}

      <span style={{
        fontFamily: C.mono, fontSize: 16, fontWeight: 800, color: accent,
        padding: '12px 32px', borderRadius: 12,
        background: `${accent}12`, border: `1px solid ${accent}30`,
        ...glow(accent, 14),
      }}>marketlens.live</span>
    </div>
  )
}
