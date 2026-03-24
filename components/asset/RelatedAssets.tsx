'use client'

import Link from 'next/link'
import { RELATED_ASSETS, RelatedAsset } from '@/lib/utils/constants'
import { AssetType } from '@/lib/utils/types'

const TYPE_BADGE: Record<RelatedAsset['type'], { label: string; color: string }> = {
  stock:     { label: 'Stock',     color: 'var(--accent)' },
  crypto:    { label: 'Crypto',    color: '#f97316' },
  forex:     { label: 'Forex',     color: '#3b82f6' },
  commodity: { label: 'Commodity', color: '#eab308' },
  etf:       { label: 'ETF',       color: '#a855f7' },
}

interface Props {
  symbol: string
  type:   AssetType
}

export default function RelatedAssets({ symbol, type }: Props) {
  // Try exact match first, then uppercase
  const related = RELATED_ASSETS[symbol] ?? RELATED_ASSETS[symbol.toUpperCase()] ?? []
  if (related.length === 0) return null

  return (
    <div className="border-b border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 mb-2.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <circle cx="3" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="13" cy="3" r="2" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="13" cy="13" r="2" stroke="currentColor" strokeWidth="1.4" />
          <line x1="5" y1="7" x2="11" y2="4" stroke="currentColor" strokeWidth="1.2" />
          <line x1="5" y1="9" x2="11" y2="12" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Related Assets
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      </div>

      {/* Horizontal scroll strip */}
      <div className="overflow-x-auto bg-[var(--surface)] scrollbar-none">
        <div className="flex gap-px bg-[var(--border)]" style={{ width: 'max-content' }}>
          {related.map((asset) => {
            const badge    = TYPE_BADGE[asset.type]
            const href     = `/asset/${asset.type}/${encodeURIComponent(asset.symbol)}`
            return (
              <Link
                key={`${asset.type}-${asset.symbol}`}
                href={href}
                className="group flex min-w-[140px] flex-col gap-1 bg-[var(--surface)] px-4 py-3 transition-colors hover:bg-[var(--surface-2)]"
              >
                {/* Type badge */}
                <span
                  className="w-fit rounded-sm px-1 py-px font-mono text-[8px] font-bold uppercase tracking-[0.08em]"
                  style={{ background: `${badge.color}22`, color: badge.color }}
                >
                  {badge.label}
                </span>
                {/* Symbol */}
                <span className="font-mono text-[12px] font-bold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors truncate">
                  {asset.symbol}
                </span>
                {/* Name */}
                <span className="truncate font-mono text-[9px] text-[var(--text-muted)]">
                  {asset.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
