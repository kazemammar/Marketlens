'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MarketBriefPayload } from '@/app/api/market-brief/route'
import { MarketRiskPayload }  from '@/app/api/market-risk/route'
import { timeAgo, stalenessColor } from '@/lib/utils/timeago'

const DIR_COLOR: Record<string, string> = {
  up:       'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  down:     'text-red-400 bg-red-500/10 border-red-500/25',
  volatile: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
}
const DIR_ARROW: Record<string, string> = { up: '▲', down: '▼', volatile: '↕' }

const RISK_STYLE: Record<string, { label: string; text: string; border: string; dot: string }> = {
  LOW:      { label: 'LOW RISK',      text: 'text-emerald-400', border: 'border-emerald-500/30', dot: '#10b981' },
  MODERATE: { label: 'MOD RISK',      text: 'text-amber-400',   border: 'border-amber-500/30',   dot: '#f59e0b' },
  HIGH:     { label: 'HIGH RISK',     text: 'text-orange-400',  border: 'border-orange-500/30',  dot: '#f97316' },
  CRITICAL: { label: 'CRITICAL RISK', text: 'text-red-400',     border: 'border-red-500/30',     dot: '#ef4444' },
}


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

  // ── Loading skeleton ──────────────────────────────────────────────────────────
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
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="skeleton h-5 w-20 rounded-full shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!brief) return null

  const riskLevel = risk?.level ?? 'MODERATE'
  const rs = RISK_STYLE[riskLevel] ?? RISK_STYLE.MODERATE

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
      <div className="flex items-start gap-4 px-4 py-3">

          {/* ── Badge cluster ────────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center gap-2">

            {/* AI BRIEF filled pill */}
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{
                background: 'rgba(16,185,129,0.15)',
                border: '1px solid rgba(16,185,129,0.35)',
                boxShadow: '0 0 12px rgba(16,185,129,0.15)',
              }}
            >
              <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
              <span
                className="font-mono text-[10px] font-bold uppercase tracking-[0.16em]"
                style={{ color: 'var(--accent)' }}
              >
                AI Brief
              </span>
            </div>

            {/* Risk pill */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${rs.text} ${rs.border}`}
              style={{ background: 'var(--surface-2)' }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: rs.dot, boxShadow: `0 0 5px ${rs.dot}` }}
              />
              {rs.label}
            </span>

            {/* Timestamp */}
            <span
              className="font-mono text-[9px] tabular-nums"
              style={{ color: stalenessColor(brief.generatedAt) }}
              title={`Generated at ${new Date(brief.generatedAt).toLocaleTimeString()}`}
              suppressHydrationWarning
            >
              {timeAgo(brief.generatedAt)}
            </span>
          </div>

          {/* ── Brief text ───────────────────────────────────────────────── */}
          <p
            className="min-w-0 flex-1 text-[13px] leading-relaxed"
            style={{ color: 'var(--text-2)' }}
          >
            {brief.brief}
          </p>

          {/* ── Asset badges ─────────────────────────────────────────────── */}
          {brief.affectedAssets.length > 0 && (
            <div className="hidden lg:flex shrink-0 items-center gap-1.5">
              {brief.affectedAssets.slice(0, 5).map((a) => (
                <Link
                  key={a.symbol}
                  href={`/asset/${a.type}/${encodeURIComponent(a.symbol)}`}
                  className={`inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-[10px] font-semibold transition-all hover:scale-105 hover:opacity-80 ${DIR_COLOR[a.direction] ?? DIR_COLOR.volatile}`}
                >
                  {DIR_ARROW[a.direction] ?? '↕'} {a.symbol}
                </Link>
              ))}
            </div>
          )}

      </div>
    </div>
  )
}
