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

const RISK_DOT: Record<string, string> = {
  LOW: 'var(--price-up)', MODERATE: 'var(--warning)', HIGH: '#f97316', CRITICAL: 'var(--danger)',
}
const RISK_LABEL: Record<string, string> = {
  LOW: 'LOW RISK', MODERATE: 'MOD RISK', HIGH: 'HIGH RISK', CRITICAL: 'CRITICAL',
}

const SESSION_STYLE: Record<MarketSession, { label: string; color: string }> = {
  pre_market:  { label: 'PRE-MKT',   color: '#60a5fa' },
  morning:     { label: 'MORNING',   color: 'var(--accent)' },
  afternoon:   { label: 'AFTERNOON', color: '#f59e0b' },
  after_hours: { label: 'AFTER HRS', color: '#a78bfa' },
}

const CONF_LABEL: Record<string, string> = { high: 'HIGH', medium: 'MED', low: 'LOW' }

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
    }, 30 * 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
          <div className="skeleton h-3 w-3 rounded" />
          <div className="skeleton h-3 w-28 rounded" />
          <div className="flex-1" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
        <div className="px-3 py-3 space-y-2.5">
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-3 w-4/5 rounded" />
          <div className="skeleton h-3 w-3/5 rounded" />
        </div>
      </div>
    )
  }

  if (!brief) return null

  const riskLevel = risk?.level ?? 'MODERATE'
  const riskDot = RISK_DOT[riskLevel] ?? RISK_DOT.MODERATE
  const riskLabel = RISK_LABEL[riskLevel] ?? RISK_LABEL.MODERATE
  const ss = brief.session ? SESSION_STYLE[brief.session] : null
  const hasDelta = brief.delta && brief.delta.length > 0

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5 6h6M5 8.5h4M5 11h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          AI Market Brief
        </span>
        <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />

        {ss && (
          <span
            className="rounded border px-1.5 py-px font-mono text-[8px] font-bold uppercase"
            style={{ color: ss.color, borderColor: `${ss.color}33`, background: `${ss.color}12` }}
          >
            {ss.label}
          </span>
        )}
        <span
          className="inline-flex items-center gap-1 rounded border px-1.5 py-px font-mono text-[8px] font-bold uppercase"
          style={{ color: riskDot, borderColor: `${riskDot}40`, background: `${riskDot}12` }}
        >
          <span className="h-1 w-1 rounded-full" style={{ background: riskDot }} />
          {riskLabel}
        </span>
        {brief.confidence && (
          <span className="font-mono text-[9px] font-bold uppercase text-[var(--text-muted)] opacity-50">
            {CONF_LABEL[brief.confidence]} CONF
          </span>
        )}
        <span
          className="font-mono text-[8px] tabular-nums"
          style={{ color: stalenessColor(brief.generatedAt) }}
          suppressHydrationWarning
        >
          {timeAgo(brief.generatedAt)}
        </span>
      </div>

      {/* ══ BODY ════════════════════════════════════════════════════════════ */}
      <div className="px-3 py-3 space-y-3">

        {/* ── NARRATIVE HEADLINE ─────────────────────────────────────────── */}
        {brief.narrative && (
          <p className="font-mono text-[13px] sm:text-[14px] font-bold leading-snug tracking-tight text-[var(--text)]">
            {brief.narrative}
          </p>
        )}

        {/* ── Session context ─────────────────────────────────────────── */}
        {brief.session_context && (
          <p className="font-mono text-[10px] sm:text-[11px] leading-relaxed text-[var(--text)]" style={{ opacity: 0.7 }}>
            {brief.session_context}
          </p>
        )}

        {/* ── WHAT CHANGED ───────────────────────────────────────────────── */}
        {hasDelta && (
          <div
            className="rounded border px-2.5 py-2 space-y-0.5"
            style={{ borderColor: 'rgba(96,165,250,0.2)', background: 'rgba(96,165,250,0.04)' }}
          >
            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: '#60a5fa' }}>
              What Changed
            </span>
            {(brief.delta ?? []).map((d, i) => (
              <p key={i} className="font-mono text-[10px] leading-relaxed text-[var(--text)]">
                <span style={{ color: '#60a5fa', opacity: 0.6 }}>›</span> {d}
              </p>
            ))}
          </div>
        )}

        {/* ── STRUCTURED SECTIONS — colored left-border cards ─────────── */}
        <div className="space-y-2">
          {brief.overnight && (
            <div
              className="rounded-r border-l-2 py-2 pl-3 pr-2.5"
              style={{ borderLeftColor: '#22d3ee', background: 'rgba(34,211,238,0.04)' }}
            >
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: '#22d3ee' }}>
                Overnight
              </span>
              <p className="mt-0.5 font-mono text-[10px] sm:text-[11px] leading-relaxed text-[var(--text)]">
                {brief.overnight}
              </p>
            </div>
          )}
          {brief.macro && (
            <div
              className="rounded-r border-l-2 py-2 pl-3 pr-2.5"
              style={{ borderLeftColor: '#f59e0b', background: 'rgba(245,158,11,0.04)' }}
            >
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: '#f59e0b' }}>
                Macro
              </span>
              <p className="mt-0.5 font-mono text-[10px] sm:text-[11px] leading-relaxed text-[var(--text)]">
                {brief.macro}
              </p>
            </div>
          )}
          {brief.sectors && (
            <div
              className="rounded-r border-l-2 py-2 pl-3 pr-2.5"
              style={{ borderLeftColor: '#a78bfa', background: 'rgba(167,139,250,0.04)' }}
            >
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: '#a78bfa' }}>
                Sectors
              </span>
              <p className="mt-0.5 font-mono text-[10px] sm:text-[11px] leading-relaxed text-[var(--text)]">
                {brief.sectors}
              </p>
            </div>
          )}
        </div>

        {/* ── WATCHLIST CHIPS ─────────────────────────────────────────────── */}
        {brief.watchlist && brief.watchlist.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mr-0.5">
              Watchlist
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

        {/* ── LOOKING AHEAD ──────────────────────────────────────────────── */}
        {brief.looking_ahead && (
          <div
            className="rounded border px-2.5 py-2"
            style={{ borderColor: 'rgba(16,185,129,0.2)', background: 'rgba(16,185,129,0.04)' }}
          >
            <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--accent)' }}>
              Looking Ahead
            </span>
            <p className="mt-0.5 font-mono text-[10px] sm:text-[11px] leading-relaxed text-[var(--text)]">
              {brief.looking_ahead}
            </p>
          </div>
        )}
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      {(brief.headlineCount || brief.sourceCount) && (
        <div className="border-t border-[var(--border)] px-3 py-1">
          <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-40">
            Generated from {brief.headlineCount} headlines across {brief.sourceCount} sources
          </span>
        </div>
      )}
    </div>
  )
}
