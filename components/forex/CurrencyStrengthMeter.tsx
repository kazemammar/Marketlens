'use client'

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useFetch } from '@/lib/hooks/useFetch'
import type { CurrencyStrength } from '@/app/api/forex/strength/route'

const FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
  CHF: '🇨🇭', AUD: '🇦🇺', CAD: '🇨🇦', NZD: '🇳🇿', CNY: '🇨🇳',
}

const COLORS: Record<string, string> = {
  USD: '#3b82f6', EUR: '#10b981', GBP: '#f59e0b', JPY: '#ef4444',
  CHF: '#8b5cf6', AUD: '#06b6d4', CAD: '#f97316', NZD: '#84cc16', CNY: '#ec4899',
}

function fmt(score: number): string {
  return (score >= 0 ? '+' : '') + score.toFixed(3) + '%'
}

export default function CurrencyStrengthMeter() {
  const { data, loading, error } = useFetch<{ strengths: CurrencyStrength[]; asOf: string }>(
    '/api/forex/strength',
    { refreshInterval: 5 * 60_000 },
  )
  const [hiddenCurrencies, setHiddenCurrencies] = useState<Set<string>>(new Set())

  const strengths = data?.strengths ?? []
  const maxAbs = Math.max(...strengths.map(s => Math.abs(s.score)), 0.001)

  // Build chart data: array of { date, USD: score, EUR: score, ... }
  const chartData = (() => {
    if (!strengths.length) return []
    const dateMap: Record<string, Record<string, number>> = {}
    for (const s of strengths) {
      for (const point of s.trend) {
        if (!dateMap[point.date]) dateMap[point.date] = {}
        dateMap[point.date][s.currency] = point.score
      }
    }
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, scores]) => ({
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        ...scores,
      }))
  })()

  function toggleCurrency(ccy: string) {
    setHiddenCurrencies(prev => {
      const next = new Set(prev)
      if (next.has(ccy)) next.delete(ccy)
      else next.add(ccy)
      return next
    })
  }

  // Currencies in strength order (strongest first) — used for lines, legend, tooltip
  const sortedCurrencies = strengths.map(s => s.currency)

  if (loading) return <SkeletonMeter />
  if (error || !strengths.length) return null

  return (
    <div className="overflow-hidden rounded border border-[var(--border)]">
      {/* Panel header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Currency Strength
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">live · 7-day cross-rate</span>
      </div>

      {/* Bars + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-stretch">
        {/* Strength bars */}
        <div className="border-b border-[var(--border)] bg-[var(--surface)] p-3 lg:border-b-0 lg:border-r flex flex-col justify-center">
          <div className="flex flex-col gap-2.5">
            {strengths.map((s) => {
              const pct   = (Math.abs(s.score) / maxAbs) * 50
              const isPos = s.score >= 0
              return (
                <div key={s.currency} className="flex items-center gap-2">
                  {/* Rank */}
                  <span className="w-3 shrink-0 font-mono text-[9px] text-[var(--text-muted)]">
                    {s.rank}
                  </span>
                  {/* Flag + code */}
                  <span className="w-12 shrink-0 font-mono text-[10px] font-bold text-[var(--text)]">
                    {FLAGS[s.currency]} {s.currency}
                  </span>
                  {/* Bar visualization */}
                  <div className="relative flex h-3 flex-1 items-center">
                    {/* Center line */}
                    <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--border)]" />
                    {/* Bar */}
                    {isPos ? (
                      <div
                        className="absolute inset-y-0.5 rounded-sm"
                        style={{
                          left: '50%',
                          width: `${pct}%`,
                          background: '#10b981',
                          opacity: 0.85,
                        }}
                      />
                    ) : (
                      <div
                        className="absolute inset-y-0.5 rounded-sm"
                        style={{
                          right: '50%',
                          width: `${pct}%`,
                          background: '#ef4444',
                          opacity: 0.85,
                        }}
                      />
                    )}
                  </div>
                  {/* Score */}
                  <span
                    className="w-16 shrink-0 text-right font-mono text-[9px] font-semibold tabular-nums"
                    style={{ color: isPos ? '#10b981' : '#ef4444' }}
                  >
                    {fmt(s.score)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Trend chart */}
        <div className="flex flex-col p-3 min-h-[260px]">
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'var(--text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 8, fontFamily: 'monospace', fill: 'var(--text-muted)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v.toFixed(1)}%`}
                />
                <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
                <Tooltip content={<StrengthTooltip flags={FLAGS} colors={COLORS} hidden={hiddenCurrencies} />} />
                {sortedCurrencies.map(ccy => (
                  <Line
                    key={ccy}
                    type="monotone"
                    dataKey={ccy}
                    stroke={COLORS[ccy]}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
}

function StrengthTooltip({
  active, payload, label, flags, colors, hidden,
}: {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
  flags: Record<string, string>
  colors: Record<string, string>
  hidden: Set<string>
}) {
  if (!active || !payload?.length) return null

  const sorted = [...payload]
    .filter(e => !hidden.has(e.name))
    .sort((a, b) => b.value - a.value)

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 4,
        fontFamily: 'monospace',
        fontSize: 10,
        padding: '6px 8px',
      }}
    >
      <p style={{ color: 'var(--text-muted)', fontSize: 9, marginBottom: 4 }}>{label}</p>
      {sorted.map(entry => (
        <div key={entry.name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
          <span style={{ color: colors[entry.name], fontWeight: 700, minWidth: 52 }}>
            {flags[entry.name] ?? ''} {entry.name}
          </span>
          <span style={{ color: entry.value >= 0 ? '#10b981' : '#ef4444', fontVariantNumeric: 'tabular-nums' }}>
            {(entry.value >= 0 ? '+' : '') + entry.value.toFixed(3) + '%'}
          </span>
        </div>
      ))}
    </div>
  )
}

function SkeletonMeter() {
  return (
    <div className="overflow-hidden rounded border border-[var(--border)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2">
        <div className="h-1.5 w-1.5 rounded-full bg-[var(--surface-2)] animate-pulse" />
        <div className="h-2 w-32 rounded bg-[var(--surface-2)] animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-stretch">
        <div className="border-b border-[var(--border)] p-3 space-y-2 lg:border-b-0 lg:border-r">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2 w-3 rounded bg-[var(--surface-2)] animate-pulse" />
              <div className="h-2 w-12 rounded bg-[var(--surface-2)] animate-pulse" />
              <div className="h-2 flex-1 rounded bg-[var(--surface-2)] animate-pulse" />
              <div className="h-2 w-10 rounded bg-[var(--surface-2)] animate-pulse" />
            </div>
          ))}
        </div>
        <div className="p-3">
          <div className="h-[220px] rounded bg-[var(--surface-2)] animate-pulse" />
        </div>
      </div>
    </div>
  )
}
