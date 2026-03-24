'use client'

import { useFetch }             from '@/lib/hooks/useFetch'
import type { BtcEtfPayload, BtcEtfData } from '@/app/api/crypto/btc-etfs/route'

// ─── Direction colours ────────────────────────────────────────────────────

const DIR_COLOR  = { INFLOW: 'var(--price-up)', OUTFLOW: 'var(--price-down)', NEUTRAL: 'var(--text-muted)' }
const DIR_BG     = { INFLOW: 'rgba(16,185,129,0.10)', OUTFLOW: 'rgba(239,68,68,0.10)', NEUTRAL: 'var(--surface-2)' }
const DIR_BORDER = { INFLOW: 'rgba(16,185,129,0.20)', OUTFLOW: 'rgba(239,68,68,0.20)', NEUTRAL: 'var(--border)' }
const DIR_LABEL  = { INFLOW: '▲ INFLOW', OUTFLOW: '▼ OUTFLOW', NEUTRAL: '► NEUTRAL' }

// ─── Single ETF card ──────────────────────────────────────────────────────

function EtfCard({ etf }: { etf: BtcEtfData }) {
  return (
    <div className="flex flex-col gap-1 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5 transition hover:border-[var(--accent)]/30">
      {/* Symbol + Issuer */}
      <div className="flex items-center justify-between gap-1">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text)]">
          {etf.symbol}
        </span>
        <span className="font-mono text-[8px] text-[var(--text-muted)] truncate">
          {etf.issuer}
        </span>
      </div>

      {/* Price */}
      <span className="font-mono text-[16px] font-bold leading-none tabular-nums text-[var(--text)]">
        ${etf.price.toFixed(2)}
      </span>

      {/* Change % */}
      <span
        className="font-mono text-[9px] font-semibold tabular-nums"
        style={{ color: etf.changePercent >= 0 ? 'var(--price-up)' : 'var(--price-down)' }}
      >
        {etf.changePercent >= 0 ? '+' : ''}{etf.changePercent.toFixed(2)}%
      </span>

      {/* Flow direction badge */}
      <span
        className="w-fit rounded px-1 py-px font-mono text-[8px] font-bold"
        style={{
          color:       DIR_COLOR[etf.flowDirection],
          background:  DIR_BG[etf.flowDirection],
          border:      `1px solid ${DIR_BORDER[etf.flowDirection]}`,
        }}
      >
        {DIR_LABEL[etf.flowDirection]}
      </span>
    </div>
  )
}

// ─── Skeleton card ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2 rounded border border-[var(--border)] bg-[var(--surface)] p-2.5">
      <div className="flex items-center justify-between">
        <div className="skeleton h-2.5 w-10 rounded" />
        <div className="skeleton h-2 w-14 rounded" />
      </div>
      <div className="skeleton h-5 w-16 rounded" />
      <div className="skeleton h-2 w-10 rounded" />
      <div className="skeleton h-4 w-16 rounded" />
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────

export default function BtcEtfTracker() {
  const { data, loading } = useFetch<BtcEtfPayload>('/api/crypto/btc-etfs', {
    refreshInterval: 5 * 60_000,
  })

  const etfs        = data?.etfs ?? []
  const netDir      = data?.netDirection ?? 'NEUTRAL'
  const inflowCount  = data?.inflowCount  ?? 0
  const outflowCount = data?.outflowCount ?? 0

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        {/* Bitcoin ₿ symbol */}
        <span className="font-mono text-[13px] font-bold leading-none shrink-0" style={{ color: '#f7931a' }}>
          ₿
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          BTC ETF Momentum
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        {/* Net direction badge */}
        {!loading && data && (
          <>
            <span
              className="rounded border px-1.5 py-px font-mono text-[8px] font-bold"
              style={{
                color:       DIR_COLOR[netDir],
                background:  DIR_BG[netDir],
                borderColor: DIR_BORDER[netDir],
              }}
            >
              NET {DIR_LABEL[netDir]}
            </span>
            {/* Inflow / Outflow count */}
            <span className="font-mono text-[8px] text-[var(--text-muted)]">
              {inflowCount}↑ {outflowCount}↓
            </span>
          </>
        )}
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-40">5MIN CACHE</span>
      </div>

      {/* Disclaimer */}
      <div className="border-b border-[var(--border)] px-3 py-1">
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
          Flow direction estimated from price movement — not official fund flow data
        </span>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-3 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
          : etfs.length === 0
            ? (
                <p className="col-span-full py-6 text-center font-mono text-[10px] text-[var(--text-muted)]">
                  ETF data unavailable
                </p>
              )
            : etfs.map(etf => <EtfCard key={etf.symbol} etf={etf} />)
        }
      </div>
      {/* Disclaimer */}
      <div className="border-t border-[var(--border)] px-3 py-1">
        <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-40">
          Based on ETF price momentum — not actual reported fund flows
        </span>
      </div>
    </div>
  )
}
