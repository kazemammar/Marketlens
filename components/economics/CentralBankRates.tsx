'use client'

import { useFetch } from '@/lib/hooks/useFetch'
import type { CentralBanksPayload } from '@/app/api/central-banks/route'
import type { CentralBankRate } from '@/lib/api/central-banks'

// ─── Direction badge ──────────────────────────────────────────────────────

function DirectionBadge({ direction, change }: { direction: CentralBankRate['direction']; change: number | null }) {
  if (direction === 'hike') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded border border-red-500/30 bg-red-500/10 px-1.5 py-px font-mono text-[8px] font-bold text-red-400">
        ▲ HIKE{change != null && change !== 0 ? ` +${change}bp` : ''}
      </span>
    )
  }
  if (direction === 'cut') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-px font-mono text-[8px] font-bold text-emerald-400">
        ▼ CUT{change != null && change !== 0 ? ` ${change}bp` : ''}
      </span>
    )
  }
  // hold
  return (
    <span className="inline-flex items-center gap-0.5 rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-px font-mono text-[8px] font-bold text-[var(--text-muted)]">
      ► HOLD
    </span>
  )
}

// ─── Single bank card ─────────────────────────────────────────────────────

function BankCard({ bank }: { bank: CentralBankRate }) {
  function formatDate(d: string): string {
    const dt = new Date(d + 'T12:00:00Z')
    return dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
  }

  return (
    <div className="flex flex-col gap-1.5 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5 transition hover:border-[var(--accent)]/30">
      {/* Flag + bank name */}
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] leading-none">{bank.flag}</span>
        <div>
          <span className="font-mono text-[10px] font-bold text-[var(--text)]">{bank.bank}</span>
          <span className="ml-1 font-mono text-[8px] text-[var(--text-muted)] opacity-60">{bank.country}</span>
        </div>
      </div>

      {/* Rate */}
      <div className="flex items-baseline gap-0.5">
        <span className="font-mono text-[22px] font-bold leading-none tabular-nums text-[var(--text)]">
          {bank.rate.toFixed(2)}
        </span>
        <span className="font-mono text-[10px] text-[var(--text-muted)] opacity-60">%</span>
      </div>

      {/* Direction badge */}
      <DirectionBadge direction={bank.direction} change={bank.change} />

      {/* Last updated */}
      <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50 leading-none">
        {formatDate(bank.lastUpdated)}
      </span>
    </div>
  )
}

// ─── Skeleton card ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <div className="flex items-center gap-1.5">
        <div className="skeleton h-3.5 w-3.5 rounded-full" />
        <div className="skeleton h-2.5 w-12 rounded" />
      </div>
      <div className="skeleton h-6 w-16 rounded" />
      <div className="skeleton h-4 w-14 rounded" />
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────

export default function CentralBankRates() {
  const { data, loading } = useFetch<CentralBanksPayload>('/api/central-banks', {
    refreshInterval: 30 * 60_000,
  })

  // Only render cards where we have a real rate (null rates are filtered server-side)
  const validRates = (data?.rates ?? []).filter(r => r.rate != null)

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Panel header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <rect x="1" y="11" width="14" height="2" rx="0.5" stroke="currentColor" strokeWidth="1.3"/>
          <rect x="3" y="5"  width="2"  height="6" stroke="currentColor" strokeWidth="1.1"/>
          <rect x="7" y="5"  width="2"  height="6" stroke="currentColor" strokeWidth="1.1"/>
          <rect x="11" y="5" width="2"  height="6" stroke="currentColor" strokeWidth="1.1"/>
          <path d="M1 5l7-3.5L15 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Central Bank Policy Rates
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-40">FRED · BOE · BOC · 6H CACHE</span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-3 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
          : validRates.length === 0
            ? (
                <p className="col-span-full py-6 text-center font-mono text-[10px] text-[var(--text-muted)]">
                  Central bank data unavailable
                </p>
              )
            : validRates.map(bank => <BankCard key={bank.id} bank={bank} />)
        }
      </div>
    </div>
  )
}
