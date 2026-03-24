'use client'

import { useFetch } from '@/lib/hooks/useFetch'

interface CorrelationPayload {
  symbols: string[]
  matrix: number[][]
  generatedAt: number
}

function getCellColor(value: number): string {
  if (value >= 0.7)  return 'rgba(16,185,129,0.6)'
  if (value >= 0.3)  return 'rgba(16,185,129,0.25)'
  if (value > -0.3)  return 'rgba(148,163,184,0.15)'
  if (value > -0.7)  return 'rgba(239,68,68,0.25)'
  return 'rgba(239,68,68,0.6)'
}

export default function CorrelationMatrix() {
  const { data, loading } = useFetch<CorrelationPayload>('/api/portfolio/correlation', {
    refreshInterval: 6 * 60 * 60_000,
  })

  if (loading) {
    return (
      <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
          <div className="h-3 w-3 animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-40 animate-pulse rounded bg-[var(--surface-2)]" />
        </div>
        <div className="px-3 py-3 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-1">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-6 flex-1 animate-pulse rounded bg-[var(--surface-2)]" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.symbols.length < 3) return null

  const { symbols, matrix } = data

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <rect x="1" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.4"/>
          <rect x="9" y="1" width="6" height="6" rx="1" fill="currentColor" opacity="0.7"/>
          <rect x="1" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.7"/>
          <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" opacity="0.4"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Correlation Matrix
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      </div>

      {/* Subtext */}
      <div className="px-3 pt-2 pb-1">
        <p className="font-mono text-[8px] text-[var(--text-muted)] opacity-60">
          Based on 3-month daily returns. High positive = concentrated risk.
        </p>
      </div>

      {/* Matrix grid */}
      <div className="px-3 pb-3 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-0" />
              {symbols.map((sym) => (
                <th
                  key={sym}
                  className="px-1 py-1 font-mono text-[8px] font-semibold text-[var(--text)] text-center"
                >
                  {sym}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {symbols.map((rowSym, i) => (
              <tr key={rowSym} className="group/row hover:bg-[var(--surface-2)]/30">
                <td className="pr-1 py-0.5 font-mono text-[8px] font-semibold text-[var(--text)] text-right whitespace-nowrap">
                  {rowSym}
                </td>
                {symbols.map((_, j) => {
                  const value = matrix[i][j]
                  const isDiagonal = i === j
                  return (
                    <td
                      key={j}
                      className="p-0.5 text-center"
                    >
                      <div
                        className="rounded px-1 py-0.5 font-mono text-[8px] tabular-nums transition-opacity group-hover/row:opacity-100"
                        style={{
                          background: getCellColor(value),
                          opacity: isDiagonal ? 0.35 : 0.85,
                          color: 'var(--text)',
                        }}
                      >
                        {value.toFixed(2)}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
