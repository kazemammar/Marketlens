'use client'

import Link from 'next/link'
import { useFetch } from '@/lib/hooks/useFetch'
import type { CompsPayload, CompRow } from '@/app/api/stock/comps/[symbol]/route'

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtMktCap(m: number | null): string {
  if (m == null) return '—'
  if (m >= 1_000_000) return `$${(m / 1_000_000).toFixed(1)}T`
  if (m >= 1_000)     return `$${(m / 1_000).toFixed(0)}B`
  return `$${m.toFixed(0)}M`
}

function fmtPrice(v: number | null): string {
  if (v == null) return '—'
  return `$${v.toFixed(2)}`
}

// Valuation multiples — hide zero/negative (not meaningful for comparison)
function fmtRatio(v: number | null): string {
  if (v == null || !isFinite(v) || v <= 0) return '—'
  return v.toFixed(1)
}

// Decimal fraction → display percentage (0.25 → "25.0%")
function fmtPct(v: number | null): string {
  if (v == null || !isFinite(v)) return '—'
  return `${(v * 100).toFixed(1)}%`
}

function fmtDayPct(v: number | null): string {
  if (v == null) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`
}

// ─── Color logic (only applied to the current-stock row) ─────────────────────

function metricColor(
  value: number | null,
  median: number | null,
  isCurrent: boolean,
  lowerIsBetter: boolean,
): string {
  if (!isCurrent || value == null || median == null) return 'text-[var(--text)]'
  // 5% dead-band — don't colour if essentially at median
  if (lowerIsBetter) {
    if (value < median * 0.95) return 'text-emerald-400'
    if (value > median * 1.05) return 'text-red-400'
  } else {
    if (value > median * 1.05) return 'text-emerald-400'
    if (value < median * 0.95) return 'text-red-400'
  }
  return 'text-[var(--text)]'
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PeersTable({ symbol }: { symbol: string }) {
  const { data, loading } = useFetch<CompsPayload>(
    `/api/stock/comps/${encodeURIComponent(symbol)}`,
    { refreshInterval: 30 * 60_000 },
  )

  if (!loading && (!data || data.rows.length === 0)) return null

  // Convenience accessor for medians (Record<string, number | null>)
  const med = (key: string): number | null => (data?.medians[key] ?? null)

  // Current stock always first; peers sorted by market cap descending
  const currentRow = data?.rows.find((r) => r.isCurrent)
  const peerRows   = (data?.rows.filter((r) => !r.isCurrent) ?? [])
    .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
  const rows: CompRow[] = currentRow ? [currentRow, ...peerRows] : peerRows
  const hasPeers = peerRows.length > 0

  return (
    <section>
      {/* Section header — green dot + gradient line, matches EarningsHistory / TechnicalSummary */}
      <div className="flex items-center gap-2 mb-3">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Sector Peers
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-[var(--border)] to-transparent" />
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-40">
          Ratios via FMP
        </span>
      </div>

      <div className="overflow-x-auto rounded border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full font-mono text-[11px]">

          {/* ── Header ── */}
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              <th className="sticky left-0 z-10 bg-[var(--surface-2)] px-3 py-2 text-left text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] min-w-[130px]">
                Company
              </th>
              <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] whitespace-nowrap">
                Mkt Cap
              </th>
              <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Price
              </th>
              <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Day %
              </th>
              <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                P/E
              </th>
              <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] whitespace-nowrap">
                EV/EBITDA
              </th>
              <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                P/S
              </th>
              <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Margin
              </th>
              <th className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                ROE
              </th>
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody className="divide-y divide-[var(--border)]">

            {loading ? (
              // Skeleton — 7 rows × 9 cols
              Array.from({ length: 7 }).map((_, i) => (
                <tr key={i}>
                  <td className="sticky left-0 bg-[var(--surface)] px-3 py-2.5">
                    <div className="h-3 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
                    <div className="mt-1 h-2 w-14 animate-pulse rounded bg-[var(--surface-2)]" />
                  </td>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-2 py-2.5 text-right">
                      <div className="ml-auto h-3 w-10 animate-pulse rounded bg-[var(--surface-2)]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <>
                {rows.map((row) => {
                  const hi     = row.isCurrent
                  const stickyBg = hi ? 'bg-[#10b981]/5' : 'bg-[var(--surface)]'

                  return (
                    <tr
                      key={row.symbol}
                      className={hi ? 'bg-[#10b981]/5' : 'hover:bg-[var(--surface-2)] transition-colors'}
                    >
                      {/* Company — sticky, left border on current stock */}
                      <td
                        className={[
                          'sticky left-0 z-10 px-3 py-2 min-w-[130px]',
                          stickyBg,
                          hi ? 'border-l-2 border-l-[var(--accent)]' : '',
                        ].join(' ')}
                      >
                        <Link
                          href={`/asset/stock/${encodeURIComponent(row.symbol)}`}
                          className="block hover:underline"
                        >
                          <div className="flex items-center gap-1.5">
                            {row.logo && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={row.logo}
                                alt=""
                                className="h-4 w-4 shrink-0 rounded-sm object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                              />
                            )}
                            <span className={`font-bold ${hi ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
                              {row.symbol}
                            </span>
                          </div>
                          <p className="mt-0.5 max-w-[120px] truncate text-[9px] text-[var(--text-muted)]">
                            {row.name}
                          </p>
                        </Link>
                      </td>

                      {/* Mkt Cap */}
                      <td className="px-2 py-2 text-right tabular-nums text-[var(--text)]">
                        {fmtMktCap(row.marketCap)}
                      </td>

                      {/* Price */}
                      <td className="px-2 py-2 text-right tabular-nums text-[var(--text)]">
                        {fmtPrice(row.price)}
                      </td>

                      {/* Day % */}
                      <td className="px-2 py-2 text-right tabular-nums">
                        <span style={{
                          color: row.changePercent == null
                            ? 'var(--text-muted)'
                            : row.changePercent >= 0 ? 'var(--price-up)' : 'var(--price-down)',
                        }}>
                          {fmtDayPct(row.changePercent)}
                        </span>
                      </td>

                      {/* P/E — lower is better */}
                      <td className={`px-2 py-2 text-right tabular-nums ${metricColor(row.peRatio, med('peRatio'), hi, true)}`}>
                        {fmtRatio(row.peRatio)}
                      </td>

                      {/* EV/EBITDA — lower is better */}
                      <td className={`px-2 py-2 text-right tabular-nums ${metricColor(row.evToEbitda, med('evToEbitda'), hi, true)}`}>
                        {fmtRatio(row.evToEbitda)}
                      </td>

                      {/* P/S — lower is better */}
                      <td className={`px-2 py-2 text-right tabular-nums ${metricColor(row.psRatio, med('psRatio'), hi, true)}`}>
                        {fmtRatio(row.psRatio)}
                      </td>

                      {/* Profit Margin — higher is better */}
                      <td className={`px-2 py-2 text-right tabular-nums ${metricColor(row.profitMargin, med('profitMargin'), hi, false)}`}>
                        {fmtPct(row.profitMargin)}
                      </td>

                      {/* ROE — higher is better */}
                      <td className={`px-2 py-2 text-right tabular-nums ${metricColor(row.returnOnEquity, med('returnOnEquity'), hi, false)}`}>
                        {fmtPct(row.returnOnEquity)}
                      </td>
                    </tr>
                  )
                })}

                {/* Peer Median row */}
                {hasPeers && (
                  <tr className="border-t border-[var(--border)] bg-[var(--surface-2)]">
                    <td className="sticky left-0 z-10 bg-[var(--surface-2)] px-3 py-2 font-mono text-[10px] italic text-[var(--text-muted)]">
                      Peer Median
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-[var(--text-muted)]">—</td>
                    <td className="px-2 py-2 text-right tabular-nums text-[var(--text-muted)]">—</td>
                    <td className="px-2 py-2 text-right tabular-nums text-[var(--text-muted)]">—</td>
                    <td className="px-2 py-2 text-right tabular-nums text-[var(--text-muted)]">{fmtRatio(med('peRatio'))}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-[var(--text-muted)]">{fmtRatio(med('evToEbitda'))}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-[var(--text-muted)]">{fmtRatio(med('psRatio'))}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-[var(--text-muted)]">{fmtPct(med('profitMargin'))}</td>
                    <td className="px-2 py-2 text-right tabular-nums text-[var(--text-muted)]">{fmtPct(med('returnOnEquity'))}</td>
                  </tr>
                )}
              </>
            )}

          </tbody>
        </table>
      </div>
    </section>
  )
}
