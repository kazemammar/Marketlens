'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MarketBriefPayload } from '@/app/api/market-brief/route'
import { MarketRiskPayload }  from '@/app/api/market-risk/route'

const DIR_COLOR: Record<string, string> = {
  up:       'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  down:     'text-red-400 bg-red-500/10 border-red-500/30',
  volatile: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
}
const DIR_ARROW: Record<string, string> = { up: '▲', down: '▼', volatile: '↕' }

const RISK_DOT: Record<string, string> = {
  LOW:      'bg-emerald-500',
  MODERATE: 'bg-amber-500',
  HIGH:     'bg-orange-500',
  CRITICAL: 'bg-red-500',
}

function ts(ms: number) {
  const d = new Date(ms)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
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

  if (loading) {
    return (
      <div className="ai-brief-bar flex h-10 items-center gap-3 border-b border-[var(--border)] px-4">
        <div className="skeleton h-2 w-2 rounded-full" />
        <div className="skeleton h-2.5 flex-1 max-w-2xl" />
        <div className="flex gap-1.5">
          {[1,2,3].map(i => <div key={i} className="skeleton h-5 w-12 rounded" />)}
        </div>
      </div>
    )
  }

  if (!brief) return null

  // 2 sentences max
  const sentences = brief.brief.split(/(?<=[.!?])\s+/)
  const text2     = sentences.slice(0, 2).join(' ')
  const riskLevel = risk?.level ?? 'MODERATE'
  const dotClass  = RISK_DOT[riskLevel] ?? 'bg-amber-500'

  return (
    <div className="ai-brief-bar flex min-h-10 items-center gap-3 border-b border-[var(--border)] px-3 py-1.5 sm:px-4 animate-fade-up">

      {/* Risk indicator dot */}
      <div className="flex shrink-0 items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${dotClass} live-dot`} />
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--accent)' }}>
          AI BRIEF
        </span>
        <span className="font-mono text-[9px] text-white opacity-60">
          {ts(brief.generatedAt)}
        </span>
      </div>

      <span className="hidden text-[var(--border)] sm:block" aria-hidden>│</span>

      {/* Brief text */}
      <p className="min-w-0 flex-1 text-[11px] leading-snug" style={{ color: '#e0e0e0' }}>
        {text2}
      </p>

      {/* Asset badges */}
      {brief.affectedAssets.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-1">
          {brief.affectedAssets.slice(0, 5).map((a) => (
            <Link
              key={a.symbol}
              href={`/asset/${a.type}/${encodeURIComponent(a.symbol)}`}
              className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold transition-all duration-150 hover:opacity-75 hover:scale-105 ${DIR_COLOR[a.direction] ?? DIR_COLOR.volatile}`}
            >
              {DIR_ARROW[a.direction] ?? '↕'} {a.symbol}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
