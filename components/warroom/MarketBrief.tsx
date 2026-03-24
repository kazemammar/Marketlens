'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { MarketBriefPayload, MarketSession } from '@/app/api/market-brief/route'
import type { MarketRiskPayload }  from '@/app/api/market-risk/route'
import { timeAgo, stalenessColor } from '@/lib/utils/timeago'

// ─── Style maps ──────────────────────────────────────────────────────────

const DIR_COLOR: Record<string, string> = {
  up:       'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  down:     'text-red-400 bg-red-500/10 border-red-500/25',
  volatile: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
}
const DIR_ARROW: Record<string, string> = { up: '▲', down: '▼', volatile: '↕' }

const RISK_STYLE: Record<string, { label: string; text: string; border: string; dot: string }> = {
  LOW:      { label: 'LOW',      text: 'text-emerald-400', border: 'border-emerald-500/30', dot: '#10b981' },
  MODERATE: { label: 'MOD',      text: 'text-amber-400',   border: 'border-amber-500/30',   dot: '#f59e0b' },
  HIGH:     { label: 'HIGH',     text: 'text-orange-400',  border: 'border-orange-500/30',  dot: '#f97316' },
  CRITICAL: { label: 'CRITICAL', text: 'text-red-400',     border: 'border-red-500/30',     dot: '#ef4444' },
}

const SESSION_STYLE: Record<MarketSession, { label: string; color: string }> = {
  pre_market:   { label: 'PRE-MKT',    color: '#60a5fa' },
  morning:      { label: 'MORNING',    color: '#10b981' },
  afternoon:    { label: 'AFTERNOON',  color: '#f59e0b' },
  after_hours:  { label: 'AFTER HRS',  color: '#a78bfa' },
}

const CONF_STYLE: Record<string, { label: string; color: string }> = {
  high:   { label: 'HIGH CONF',  color: '#10b981' },
  medium: { label: 'MED CONF',   color: '#f59e0b' },
  low:    { label: 'LOW CONF',   color: '#ef4444' },
}

// ─── Expandable section ──────────────────────────────────────────────────

function Section({ label, children, defaultOpen = false }: {
  label: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 py-1 text-left font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
      >
        <svg
          viewBox="0 0 10 10"
          fill="none"
          className={`h-2 w-2 shrink-0 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
          style={{ color: 'var(--text-muted)' }}
          aria-hidden
        >
          <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {label}
      </button>
      {open && (
        <div className="pb-1 pl-3.5 animate-fade-up" style={{ animationDuration: '150ms' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────

export default function MarketBrief() {
  const [brief, setBrief] = useState<MarketBriefPayload | null>(null)
  const [risk,  setRisk]  = useState<MarketRiskPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/market-brief').then((r) => r.ok ? r.json() as Promise<MarketBriefPayload> : null),
      fetch('/api/market-risk').then((r)  => r.ok ? r.json() as Promise<MarketRiskPayload>  : null),
    ])
      .then(([b, r]) => { if (b) setBrief(b); if (r) setRisk(r) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      Promise.all([
        fetch('/api/market-brief').then((r) => r.ok ? r.json() as Promise<MarketBriefPayload> : null),
        fetch('/api/market-risk').then((r)  => r.ok ? r.json() as Promise<MarketRiskPayload>  : null),
      ])
        .then(([b, r]) => { if (b) setBrief(b); if (r) setRisk(r) })
        .catch(() => {})
    }, 60 * 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="border-b"
        style={{
          borderColor: 'rgba(16,185,129,0.2)',
          borderLeft: '3px solid rgba(16,185,129,0.3)',
          background: 'linear-gradient(to right, rgba(16,185,129,0.06), rgba(16,185,129,0.02) 60%, transparent)',
        }}
      >
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="skeleton h-5 w-20 rounded-full shrink-0" />
            <div className="skeleton h-4 w-16 rounded-full shrink-0" />
            <div className="skeleton h-4 w-14 rounded-full shrink-0" />
          </div>
          <div className="skeleton h-5 w-full rounded" />
          <div className="skeleton h-3 w-4/5 rounded" />
          <div className="flex gap-2">
            <div className="skeleton h-3 w-1/3 rounded" />
            <div className="skeleton h-3 w-1/3 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!brief) return null

  const riskLevel = risk?.level ?? 'MODERATE'
  const rs = RISK_STYLE[riskLevel] ?? RISK_STYLE.MODERATE
  const sessionStyle = brief.session ? SESSION_STYLE[brief.session] : null
  const confStyle = brief.confidence ? CONF_STYLE[brief.confidence] : null
  const hasNarrative = !!brief.narrative
  const hasDelta = brief.delta && brief.delta.length > 0 && brief.delta[0] !== 'Opening brief — establishing baseline.'
  const TEXT_CLS = 'font-mono text-[10px] sm:text-[11px] leading-relaxed'

  // ── v2 Narrative layout ─────────────────────────────────────────────────
  if (hasNarrative) {
    return (
      <div
        className="animate-fade-up"
        style={{
          borderBottom: '1px solid rgba(16,185,129,0.2)',
          borderLeft: '3px solid #10b981',
          background: 'linear-gradient(to right, rgba(16,185,129,0.07), rgba(16,185,129,0.02) 50%, transparent)',
        }}
      >
        <div className="px-4 py-3 space-y-2.5">

          {/* ── Top bar: badges ──────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Live badge */}
            <div
              className="flex items-center gap-1.5 rounded-full px-2 py-0.5"
              style={{
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.35)',
                boxShadow: '0 0 12px rgba(16,185,129,0.12)',
              }}
            >
              <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent)' }}>
                Live Brief
              </span>
            </div>

            {/* Session badge */}
            {sessionStyle && (
              <span
                className="rounded-full border px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.1em]"
                style={{ color: sessionStyle.color, borderColor: `${sessionStyle.color}33`, background: `${sessionStyle.color}15` }}
              >
                {sessionStyle.label}
              </span>
            )}

            {/* Risk badge */}
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.1em] ${rs.text} ${rs.border}`}
              style={{ background: 'var(--surface-2)' }}
            >
              <span className="h-1 w-1 rounded-full" style={{ background: rs.dot }} />
              {rs.label}
            </span>

            {/* Confidence badge */}
            {confStyle && (
              <span
                className="rounded-full border px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.1em]"
                style={{ color: confStyle.color, borderColor: `${confStyle.color}33`, background: `${confStyle.color}10` }}
              >
                {confStyle.label}
              </span>
            )}

            {/* Spacer + timestamp */}
            <span className="flex-1" />
            <span
              className="font-mono text-[8px] tabular-nums"
              style={{ color: stalenessColor(brief.generatedAt) }}
              title={`Generated at ${new Date(brief.generatedAt).toLocaleTimeString()}`}
              suppressHydrationWarning
            >
              {timeAgo(brief.generatedAt)}
            </span>
            {brief.sourceCount && (
              <span className="font-mono text-[7px] text-[var(--text-muted)] opacity-40">
                {brief.headlineCount}/{brief.sourceCount}src
              </span>
            )}
          </div>

          {/* ── NARRATIVE HEADLINE ────────────────────────────────────────── */}
          <p
            className="font-mono text-[13px] sm:text-[15px] font-bold leading-snug tracking-tight"
            style={{ color: 'var(--text)' }}
          >
            {brief.narrative}
          </p>

          {/* ── Session context ───────────────────────────────────────────── */}
          {brief.session_context && (
            <p className={`${TEXT_CLS} text-[var(--text-2)]`}>
              {brief.session_context}
            </p>
          )}

          {/* ── WHAT CHANGED ─────────────────────────────────────────────── */}
          {hasDelta && (
            <div
              className="rounded border px-3 py-2 space-y-1"
              style={{
                borderColor: 'rgba(96,165,250,0.2)',
                background: 'rgba(96,165,250,0.04)',
              }}
            >
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: '#60a5fa' }}>
                What Changed
              </span>
              {(brief.delta ?? []).map((d, i) => (
                <p key={i} className="font-mono text-[10px] leading-relaxed text-[var(--text-2)]">
                  <span style={{ color: '#60a5fa', opacity: 0.6 }}>{'>'}</span>{' '}{d}
                </p>
              ))}
            </div>
          )}

          {/* ── WATCHLIST CHIPS ───────────────────────────────────────────── */}
          {brief.watchlist && brief.watchlist.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mr-1">
                Watch
              </span>
              {brief.watchlist.map((w) => (
                <Link
                  key={w.symbol}
                  href={`/asset/${w.type}/${encodeURIComponent(w.symbol)}`}
                  title={w.reason}
                  className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[9px] font-semibold transition-all hover:scale-105 hover:opacity-80 ${DIR_COLOR[w.direction] ?? DIR_COLOR.volatile}`}
                >
                  {DIR_ARROW[w.direction] ?? '↕'} {w.symbol}
                </Link>
              ))}
            </div>
          )}

          {/* ── EXPANDABLE SECTIONS ──────────────────────────────────────── */}
          <div className="space-y-0.5 border-t border-[var(--border)] pt-2">
            {brief.overnight && (
              <Section label="Overnight">
                <p className={`${TEXT_CLS} text-[var(--text-2)]`}>{brief.overnight}</p>
              </Section>
            )}
            {brief.macro && (
              <Section label="Macro">
                <p className={`${TEXT_CLS} text-[var(--text-2)]`}>{brief.macro}</p>
              </Section>
            )}
            {brief.sectors && (
              <Section label="Sectors">
                <p className={`${TEXT_CLS} text-[var(--text-2)]`}>{brief.sectors}</p>
              </Section>
            )}
            {brief.risks && brief.risks.length > 0 && (
              <Section label="Risks">
                {brief.risks.map((r, i) => (
                  <p key={i} className={`${TEXT_CLS} text-[var(--text-2)]`}>
                    <span className="text-red-400/60 mr-1">{i + 1}.</span> {r}
                  </p>
                ))}
              </Section>
            )}
            {brief.opportunities && brief.opportunities.length > 0 && (
              <Section label="Opportunities">
                {brief.opportunities.map((o, i) => (
                  <p key={i} className={`${TEXT_CLS} text-[var(--text-2)]`}>
                    <span className="text-emerald-400/60 mr-1">{i + 1}.</span> {o}
                  </p>
                ))}
              </Section>
            )}
            {brief.looking_ahead && (
              <Section label="Looking Ahead" defaultOpen>
                <p className={`${TEXT_CLS} text-[var(--text-2)]`}>
                  {brief.looking_ahead}
                </p>
              </Section>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Fallback: old layout (no narrative field) ────────────────────────────
  const badges = (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="flex items-center gap-1.5 rounded-full px-2 py-0.5 sm:px-2.5 sm:py-1"
        style={{
          background: 'rgba(16,185,129,0.15)',
          border: '1px solid rgba(16,185,129,0.35)',
          boxShadow: '0 0 12px rgba(16,185,129,0.15)',
        }}
      >
        <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
        <span
          className="font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{ color: 'var(--accent)' }}
        >
          Hourly Brief
        </span>
      </div>

      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 sm:px-2.5 sm:py-1 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] ${rs.text} ${rs.border}`}
        style={{ background: 'var(--surface-2)' }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: rs.dot, boxShadow: `0 0 5px ${rs.dot}` }} />
        {rs.label}
      </span>

      <span
        className="font-mono text-[9px] tabular-nums"
        style={{ color: stalenessColor(brief.generatedAt) }}
        title={`Generated at ${new Date(brief.generatedAt).toLocaleTimeString()}`}
        suppressHydrationWarning
      >
        {timeAgo(brief.generatedAt)}
      </span>
    </div>
  )

  return (
    <div
      className="animate-fade-up"
      style={{
        borderBottom: '1px solid rgba(16,185,129,0.2)',
        borderLeft: '3px solid #10b981',
        background: 'linear-gradient(to right, rgba(16,185,129,0.07), rgba(16,185,129,0.025) 50%, transparent)',
        boxShadow: 'inset 3px 0 20px rgba(16,185,129,0.05)',
      }}
    >
      {brief.overnight ? (
        <div className="px-4 py-3 space-y-2.5">
          {badges}
          <div className="space-y-2 pt-0.5">
            {brief.overnight && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] w-[80px] shrink-0">Overnight</span>
                <span className={`${TEXT_CLS} text-[var(--text-2)]`}>{brief.overnight}</span>
              </div>
            )}
            {brief.macro && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] w-[80px] shrink-0">Macro</span>
                <span className={`${TEXT_CLS} text-[var(--text-2)]`}>{brief.macro}</span>
              </div>
            )}
            {brief.sectors && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] w-[80px] shrink-0">Sectors</span>
                <span className={`${TEXT_CLS} text-[var(--text-2)]`}>{brief.sectors}</span>
              </div>
            )}
            {brief.watchlist && brief.watchlist.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-3">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] w-[80px] shrink-0 sm:pt-0.5">Watch</span>
                <div className="flex flex-wrap gap-1.5">
                  {brief.watchlist.map((w) => (
                    <Link key={w.symbol} href={`/asset/${w.type}/${encodeURIComponent(w.symbol)}`} title={w.reason} className={`inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-[10px] font-semibold transition-all hover:scale-105 hover:opacity-80 ${DIR_COLOR[w.direction] ?? DIR_COLOR.volatile}`}>
                      {DIR_ARROW[w.direction] ?? '↕'} {w.symbol}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="shrink-0">{badges}</div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-[12px] leading-relaxed sm:text-[13px]" style={{ color: 'var(--text-2)' }}>
              {brief.brief}
            </p>
            {(brief.affectedAssets ?? []).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {(brief.affectedAssets ?? []).slice(0, 5).map((a) => (
                  <Link key={a.symbol} href={`/asset/${a.type}/${encodeURIComponent(a.symbol)}`} className={`inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-[10px] font-semibold transition-all hover:scale-105 hover:opacity-80 ${DIR_COLOR[a.direction] ?? DIR_COLOR.volatile}`}>
                    {DIR_ARROW[a.direction] ?? '↕'} {a.symbol}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
