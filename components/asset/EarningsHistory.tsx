'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { EarningsData } from '@/lib/utils/types'
import { useFetch } from '@/lib/hooks/useFetch'

interface EarningsResponse {
  earnings: EarningsData[]
  symbol:   string
}

// ─── Surprise label rendered above actual bar ─────────────────────────────

function makeSurpriseLabel(chartData: ChartEntry[]) {
  return function SurpriseLabel(props: {
    x?: number; y?: number; width?: number; index?: number
  }) {
    const { x = 0, y = 0, width = 0, index = 0 } = props
    const entry = chartData[index]
    if (!entry || entry.surprisePercent == null) return null
    const beat = entry.surprisePercent >= 0
    const sign = beat ? '+' : ''
    return (
      <text
        x={x + width / 2}
        y={y - 5}
        textAnchor="middle"
        fill={beat ? 'var(--price-up)' : 'var(--price-down)'}
        fontSize={8}
        fontFamily="monospace"
        fontWeight={700}
      >
        {sign}{entry.surprisePercent.toFixed(1)}%
      </text>
    )
  }
}

// ─── Custom tooltip ───────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const est = payload.find((p) => p.dataKey === 'estimate')?.value
  const act = payload.find((p) => p.dataKey === 'actual')?.value
  const beat = act != null && est != null && act >= est
  const surprise = act != null && est != null ? act - est : null

  return (
    <div className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-lg font-mono text-[11px]">
      <p className="font-bold text-[var(--text)] mb-1">{label}</p>
      {est != null && (
        <p className="text-[var(--text-muted)]">
          Estimate: <span className="text-[var(--text)]">${est.toFixed(2)}</span>
        </p>
      )}
      {act != null && (
        <p className="text-[var(--text-muted)]">
          Actual:{' '}
          <span style={{ color: beat ? 'var(--price-up)' : 'var(--price-down)' }}>
            ${act.toFixed(2)}
          </span>
        </p>
      )}
      {surprise != null && (
        <p
          className="mt-1 font-semibold"
          style={{ color: beat ? 'var(--price-up)' : 'var(--price-down)' }}
        >
          {beat ? 'BEAT' : 'MISS'} by ${Math.abs(surprise).toFixed(2)}
        </p>
      )}
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────

interface ChartEntry {
  period:          string
  estimate:        number
  actual:          number
  surprisePercent: number
  beat:            boolean
}

// ─── Component ────────────────────────────────────────────────────────────

export default function EarningsHistory({ symbol }: { symbol: string }) {
  const { data, loading } = useFetch<EarningsResponse>(
    `/api/earnings/${encodeURIComponent(symbol)}`,
    { refreshInterval: 60 * 60_000 },
  )

  // Transform & sort ascending (oldest left → newest right)
  const chartData: ChartEntry[] = (data?.earnings ?? [])
    .filter((e) => e.actual !== 0 || e.estimate !== 0)
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.quarter - b.quarter
    })
    .map((e) => ({
      period:          `Q${e.quarter}'${String(e.year).slice(2)}`,
      estimate:        e.estimate,
      actual:          e.actual,
      surprisePercent: e.surprisePercent,
      beat:            e.actual >= e.estimate,
    }))

  // Don't render for non-stocks / new IPOs / empty
  if (!loading && chartData.length === 0) return null

  // Summary stats
  const total      = chartData.length
  const beats      = chartData.filter((d) => d.beat).length
  const avgSurprise = total > 0
    ? chartData.reduce((s, d) => s + d.surprisePercent, 0) / total
    : 0

  let streak = 0
  for (let i = chartData.length - 1; i >= 0; i--) {
    if (chartData[i].beat) streak++; else break
  }

  const SurpriseLabel = makeSurpriseLabel(chartData)

  return (
    <section>
      {/* Section header — matches PeersTable / TechnicalSummary style */}
      <div className="flex items-center gap-2 mb-3">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Earnings History
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-[var(--border)] to-transparent" />
        {!loading && total > 0 && (
          <span className="font-mono text-[9px] text-[var(--text-muted)]">
            {total} quarters
          </span>
        )}
      </div>

      <div className="rounded border border-[var(--border)] bg-[var(--surface)] overflow-hidden">

        {/* Loading skeleton */}
        {loading ? (
          <div className="px-3 py-4">
            <div className="flex items-end gap-2 h-[180px]">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-1 items-end flex-1">
                  <div
                    className="flex-1 animate-pulse rounded-sm bg-[var(--surface-2)]"
                    style={{ height: `${40 + (i % 3) * 30}px` }}
                  />
                  <div
                    className="flex-1 animate-pulse rounded-sm bg-[var(--surface-2)]"
                    style={{ height: `${50 + (i % 4) * 25}px` }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Chart */}
            <div className="px-1 pt-5 pb-1">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barGap={2} barCategoryGap="22%">
                  <XAxis
                    dataKey="period"
                    tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'monospace' }}
                    axisLine={{ stroke: 'var(--border)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 8, fontFamily: 'monospace' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                    width={44}
                  />
                  <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: 'var(--surface-2)', opacity: 0.4 }}
                  />

                  {/* Estimate bars — subtle */}
                  <Bar dataKey="estimate" name="Estimate" radius={[2, 2, 0, 0]} barSize={14} stroke="rgba(255,255,255,0.1)" strokeWidth={1}>
                    {chartData.map((_, i) => (
                      <Cell key={`est-${i}`} fill="rgba(255,255,255,0.15)" />
                    ))}
                  </Bar>

                  {/* Actual bars — green beat / red miss + surprise label */}
                  <Bar
                    dataKey="actual"
                    name="Actual"
                    radius={[2, 2, 0, 0]}
                    barSize={14}
                    label={<SurpriseLabel />}
                  >
                    {chartData.map((entry, i) => (
                      <Cell
                        key={`act-${i}`}
                        fill={entry.beat ? 'var(--price-up)' : 'var(--price-down)'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Summary bar */}
            <div className="border-t border-[var(--border)] px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                Beat{' '}
                <span style={{ color: beats > total / 2 ? 'var(--price-up)' : 'var(--price-down)' }}>
                  {beats}/{total}
                </span>
                {' '}quarters
              </span>
              <span className="text-[var(--border)]">·</span>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                Avg surprise:{' '}
                <span style={{ color: avgSurprise >= 0 ? 'var(--price-up)' : 'var(--price-down)' }}>
                  {avgSurprise >= 0 ? '+' : ''}{avgSurprise.toFixed(1)}%
                </span>
              </span>
              {streak >= 2 && (
                <>
                  <span className="text-[var(--border)]">·</span>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">
                    Streak:{' '}
                    <span style={{ color: 'var(--price-up)' }}>
                      {streak} consecutive beats
                    </span>
                  </span>
                </>
              )}
            </div>

            {/* Legend */}
            <div className="px-3 pb-2.5 flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.1)' }} />
                <span className="font-mono text-[9px] text-[var(--text-muted)]">Estimate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--price-up)' }} />
                <span className="font-mono text-[9px] text-[var(--text-muted)]">Beat</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--price-down)' }} />
                <span className="font-mono text-[9px] text-[var(--text-muted)]">Miss</span>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
