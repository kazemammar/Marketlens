'use client'

import Link from 'next/link'
import { useFetch } from '@/lib/hooks/useFetch'

// ─── Types ────────────────────────────────────────────────────────────────

interface Holding {
  symbol: string
  name:   string
  weight: number
  shares: number
  value:  number
}

interface SectorWeight {
  sector: string
  weight: number
}

interface EtfData {
  holdings: Holding[]
  sectors:  SectorWeight[]
}

// ─── Sector colors ────────────────────────────────────────────────────────

const SECTOR_COLOR: Record<string, string> = {
  'Technology':             '#60a5fa',
  'Healthcare':             '#2dd4bf',
  'Financial Services':     '#818cf8',
  'Consumer Cyclical':      '#fb7185',
  'Communication Services': '#22d3ee',
  'Industrials':            '#94a3b8',
  'Consumer Defensive':     '#fb7185',
  'Energy':                 '#f59e0b',
  'Utilities':              '#fdba74',
  'Real Estate':            '#a78bfa',
  'Basic Materials':        '#6b7280',
}

function sectorColor(s: string): string {
  return SECTOR_COLOR[s] ?? '#94a3b8'
}

// ─── Formatters ───────────────────────────────────────────────────────────

function fmtValue(v: number | undefined | null): string {
  if (v === undefined || v === null || isNaN(v)) return '—'
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

// ─── Loading skeleton ─────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="grid grid-cols-1 gap-px bg-[var(--border)] lg:grid-cols-5">
      {/* Left — holdings table */}
      <div className="bg-[var(--surface)] p-4 lg:col-span-3">
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton h-2 w-4 rounded" />
              <div className="skeleton h-2 w-10 rounded" />
              <div className="skeleton h-2 flex-1 rounded" />
              <div className="skeleton h-2 w-12 rounded" />
            </div>
          ))}
        </div>
      </div>
      {/* Right — sectors */}
      <div className="bg-[var(--surface)] p-4 lg:col-span-2">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <div className="skeleton h-2 w-32 rounded" />
              <div className="skeleton h-1.5 rounded" style={{ width: `${60 + i * 5}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────

export default function EtfHoldings({ symbol }: { symbol: string }) {
  const { data, loading } = useFetch<EtfData>(`/api/etf/holdings/${symbol}`, { refreshInterval: 60 * 60_000 })

  const noData = !loading && (!data || (data.holdings.length === 0 && data.sectors.length === 0))

  return (
    <div className="overflow-hidden rounded border border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 mb-2.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <rect x="1" y="8" width="3" height="7" rx="0.5" fill="currentColor" opacity="0.6"/>
          <rect x="5" y="5" width="3" height="10" rx="0.5" fill="currentColor" opacity="0.75"/>
          <rect x="9" y="3" width="3" height="12" rx="0.5" fill="currentColor" opacity="0.9"/>
          <rect x="13" y="1" width="2" height="14" rx="0.5" fill="currentColor"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          ETF Breakdown
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      </div>

      {loading ? <Skeleton /> : noData ? (
        <p className="bg-[var(--surface)] px-4 py-6 font-mono text-[10px] text-[var(--text-muted)]">
          Holdings data unavailable for this ETF
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-[var(--border)] lg:grid-cols-5">

          {/* ── Left 60%: Holdings table ──────────────────────────────── */}
          <div className="bg-[var(--surface)] lg:col-span-3">
            {data!.holdings.length > 0 ? (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                      <th className="w-7 px-3 py-1.5 text-left font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">#</th>
                      <th className="px-3 py-1.5 text-left font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Symbol</th>
                      <th className="px-3 py-1.5 text-left font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Name</th>
                      <th className="px-3 py-1.5 text-right font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Weight</th>
                      <th className="hidden px-3 py-1.5 text-right font-mono text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)] sm:table-cell">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {(() => {
                      const maxW = data!.holdings[0]?.weight ?? 1
                      return data!.holdings.map((h, i) => {
                        const barPct = maxW > 0 ? ((h.weight ?? 0) / maxW) * 100 : 0
                        return (
                          <tr
                            key={h.symbol}
                            className="hover:bg-[var(--surface-2)]"
                            style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : undefined }}
                          >
                            <td className="px-3 py-1.5 font-mono text-[9px] text-[var(--text-muted)]">{i + 1}</td>
                            <td className="px-3 py-1.5">
                              <Link
                                href={`/asset/stock/${encodeURIComponent(h.symbol)}`}
                                className="font-mono text-[10px] font-bold text-[var(--accent)] hover:underline"
                              >
                                {h.symbol}
                              </Link>
                            </td>
                            <td className="max-w-[140px] px-3 py-1.5">
                              <span className="block truncate font-mono text-[9px] text-[var(--text-muted)]">{h.name}</span>
                            </td>
                            <td className="px-3 py-1.5">
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="font-mono text-[10px] font-semibold tabular-nums text-[var(--text)]">
                                  {(h.weight ?? 0).toFixed(2)}%
                                </span>
                                <div className="h-1 w-20 overflow-hidden rounded-full bg-[var(--surface-3)]">
                                  <div
                                    className="h-full rounded-full"
                                    style={{ width: `${barPct}%`, background: 'var(--accent)' }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="hidden px-3 py-1.5 text-right font-mono text-[9px] text-[var(--text-muted)] sm:table-cell">
                              {fmtValue(h.value)}
                            </td>
                          </tr>
                        )
                      })
                    })()}
                  </tbody>
                </table>
                {/* Total weight footer */}
                <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2">
                  <span className="font-mono text-[8px] text-[var(--text-muted)]">
                    Top {data!.holdings.length} holdings
                  </span>
                  <span className="font-mono text-[9px] font-semibold text-[var(--text)]">
                    {data!.holdings.reduce((s, h) => s + (h.weight ?? 0), 0).toFixed(1)}% of fund
                  </span>
                </div>
              </>
            ) : (
              <p className="px-4 py-6 font-mono text-[10px] text-[var(--text-muted)]">No holdings data</p>
            )}
          </div>

          {/* ── Right 40%: Sector allocation ──────────────────────────── */}
          <div className="bg-[var(--surface)] px-4 py-3 lg:col-span-2">
            {data!.sectors.length > 0 ? (
              <>
                <p className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Sector Allocation
                </p>
                <div className="space-y-2.5">
                  {data!.sectors.map(s => {
                    const col    = sectorColor(s.sector)
                    const maxW   = data!.sectors[0]?.weight ?? 1
                    const barPct = maxW > 0 ? (s.weight / maxW) * 100 : 0
                    return (
                      <div key={s.sector}>
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          <span className="truncate font-mono text-[9px] text-[var(--text-muted)]">{s.sector}</span>
                          <span className="shrink-0 font-mono text-[9px] font-semibold tabular-nums text-[var(--text)]">
                            {(s.weight ?? 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${barPct}%`, background: col }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Sector total */}
                <div className="mt-3 border-t border-[var(--border)] pt-2">
                  <span className="font-mono text-[8px] text-[var(--text-muted)]">
                    {data!.sectors.length} sectors · {data!.sectors.reduce((s, x) => s + x.weight, 0).toFixed(1)}% allocated
                  </span>
                </div>
              </>
            ) : (
              <p className="py-6 font-mono text-[10px] text-[var(--text-muted)]">No sector data</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
