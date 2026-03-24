'use client'

import { useFetch }                from '@/lib/hooks/useFetch'
import type { StablecoinPayload, StablecoinData } from '@/app/api/crypto/stablecoins/route'

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatCompact(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`
  if (n >= 1e9)  return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6)  return `${(n / 1e6).toFixed(1)}M`
  return n.toLocaleString()
}

// ─── Status colours ───────────────────────────────────────────────────────

const STATUS_COLOR = {
  'ON PEG':       'var(--price-up)',
  'SLIGHT DEPEG': 'var(--warning)',
  'DEPEGGED':     'var(--price-down)',
}
const STATUS_BG = {
  'ON PEG':       'rgba(16,185,129,0.10)',
  'SLIGHT DEPEG': 'rgba(245,158,11,0.10)',
  'DEPEGGED':     'rgba(239,68,68,0.10)',
}
const STATUS_BORDER = {
  'ON PEG':       'rgba(16,185,129,0.25)',
  'SLIGHT DEPEG': 'rgba(245,158,11,0.25)',
  'DEPEGGED':     'rgba(239,68,68,0.35)',
}

const HEALTH_COLOR  = { HEALTHY: 'var(--price-up)', CAUTION: 'var(--warning)', WARNING: 'var(--price-down)' }
const HEALTH_BG     = { HEALTHY: 'rgba(16,185,129,0.10)', CAUTION: 'rgba(245,158,11,0.10)', WARNING: 'rgba(239,68,68,0.10)' }
const HEALTH_BORDER = { HEALTHY: 'rgba(16,185,129,0.25)', CAUTION: 'rgba(245,158,11,0.25)', WARNING: 'rgba(239,68,68,0.35)' }

// ─── Single coin card ─────────────────────────────────────────────────────

function CoinCard({ coin }: { coin: StablecoinData }) {
  const isDepegged    = coin.status === 'DEPEGGED'
  const isSlightDepeg = coin.status === 'SLIGHT DEPEG'
  const color         = STATUS_COLOR[coin.status]
  const deviationColor = coin.deviationBps === 0
    ? 'var(--price-flat)'
    : coin.deviationBps > 0
      ? 'var(--price-up)'
      : 'var(--price-down)'

  return (
    <div
      className="flex flex-col gap-1 rounded border bg-[var(--surface)] p-2.5 transition hover:brightness-105"
      style={{
        borderColor: isDepegged
          ? 'rgba(239,68,68,0.4)'
          : isSlightDepeg
            ? 'rgba(245,158,11,0.3)'
            : 'var(--border)',
      }}
    >
      {/* Symbol */}
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {coin.symbol}
      </span>

      {/* Price — 4 decimal places */}
      <span className="font-mono text-[18px] font-bold leading-none tabular-nums text-[var(--text)]">
        ${coin.price.toFixed(4)}
      </span>

      {/* Peg status badge */}
      <span
        className="w-fit rounded px-1 py-px font-mono text-[8px] font-bold"
        style={{
          color,
          background: STATUS_BG[coin.status],
          border:     `1px solid ${STATUS_BORDER[coin.status]}`,
        }}
      >
        {coin.status}
      </span>

      {/* Deviation in basis points */}
      <span className="font-mono text-[9px] tabular-nums" style={{ color: deviationColor }}>
        {coin.deviationBps >= 0 ? '+' : ''}{coin.deviationBps}bp
      </span>

      {/* Market cap */}
      <span className="font-mono text-[8px] leading-none text-[var(--text-muted)] opacity-50">
        ${formatCompact(coin.marketCap)}
      </span>
    </div>
  )
}

// ─── Skeleton card ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <div className="skeleton h-2 w-10 rounded" />
      <div className="skeleton h-5 w-20 rounded" />
      <div className="skeleton h-4 w-14 rounded" />
      <div className="skeleton h-2 w-8 rounded" />
      <div className="skeleton h-2 w-12 rounded" />
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────

export default function StablecoinMonitor() {
  const { data, loading } = useFetch<StablecoinPayload>('/api/crypto/stablecoins', {
    refreshInterval: 2 * 60_000,
  })

  const coins   = data?.coins ?? []
  const health  = data?.overallHealth ?? 'HEALTHY'

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        {/* Lock icon */}
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <rect x="3" y="8" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Stablecoin Peg Monitor
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        {/* Overall health badge */}
        {!loading && (
          <span
            className="rounded border px-1.5 py-px font-mono text-[8px] font-bold"
            style={{
              color:       HEALTH_COLOR[health],
              background:  HEALTH_BG[health],
              borderColor: HEALTH_BORDER[health],
            }}
          >
            {health}
          </span>
        )}
        {/* Total market cap */}
        {!loading && data && (
          <span className="font-mono text-[8px] text-[var(--text-muted)]">
            ${formatCompact(data.totalMarketCap)}
          </span>
        )}
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-40">2MIN CACHE</span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-3 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
          : coins.length === 0
            ? (
                <p className="col-span-full py-6 text-center font-mono text-[10px] text-[var(--text-muted)]">
                  Stablecoin data unavailable
                </p>
              )
            : coins.map(coin => <CoinCard key={coin.symbol} coin={coin} />)
        }
      </div>
    </div>
  )
}
