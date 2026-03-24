'use client'

import { useState, useCallback, useRef } from 'react'

interface WhatIfResult {
  impact: 'positive' | 'negative' | 'mixed'
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  summary: string
  positions: Array<{ symbol: string; impact: 'positive' | 'negative' | 'neutral'; reason: string }>
  hedges: string[]
  probability_note: string
}

interface HistoryEntry {
  scenario: string
  result: WhatIfResult
  timestamp: number
}

const IMPACT_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  positive: { label: 'POSITIVE', color: 'var(--price-up)',   bg: 'rgba(var(--price-up-rgb), 0.12)' },
  negative: { label: 'NEGATIVE', color: 'var(--price-down)', bg: 'rgba(var(--price-down-rgb), 0.12)' },
  mixed:    { label: 'MIXED',    color: '#f59e0b',           bg: 'rgba(245, 158, 11, 0.12)' },
}

const SEVERITY_BADGE: Record<string, { color: string; bg: string }> = {
  HIGH:   { color: 'var(--price-down)', bg: 'rgba(var(--price-down-rgb), 0.12)' },
  MEDIUM: { color: '#f59e0b',           bg: 'rgba(245, 158, 11, 0.12)' },
  LOW:    { color: 'var(--text-muted)', bg: 'var(--surface-2)' },
}

const POSITION_ARROW: Record<string, { icon: string; color: string }> = {
  positive: { icon: '\u25B2', color: 'var(--price-up)' },
  negative: { icon: '\u25BC', color: 'var(--price-down)' },
  neutral:  { icon: '\u25CF', color: '#f59e0b' },
}

export default function WhatIfPanel() {
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState<WhatIfResult | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [history, setHistory]   = useState<HistoryEntry[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(async () => {
    const scenario = input.trim()
    if (!scenario || loading) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/portfolio/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Request failed' }))
        setError(body.error ?? `HTTP ${res.status}`)
        return
      }

      const data = await res.json() as WhatIfResult
      setResult(data)

      // Keep last 3 scenarios in history
      setHistory((prev) => [
        { scenario, result: data, timestamp: Date.now() },
        ...prev,
      ].slice(0, 3))
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [input, loading])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleClear = () => {
    setInput('')
    setResult(null)
    setError(null)
    inputRef.current?.focus()
  }

  const handleHistoryClick = (entry: HistoryEntry) => {
    setInput(entry.scenario)
    setResult(entry.result)
    setError(null)
  }

  const impactBadge   = result ? IMPACT_BADGE[result.impact]     ?? IMPACT_BADGE.mixed    : null
  const severityBadge = result ? SEVERITY_BADGE[result.severity] ?? SEVERITY_BADGE.MEDIUM : null

  return (
    <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M6.5 6a1.5 1.5 0 1 1 1.5 1.5V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          <circle cx="8" cy="11" r="0.6" fill="currentColor"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          What-If Scenario Engine
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        {result && (
          <button
            onClick={handleClear}
            className="font-mono text-[9px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What if oil hits $100? What if the Fed cuts 50bps?"
            maxLength={500}
            disabled={loading}
            className="flex-1 rounded border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-mono text-[11px] text-[var(--text)] placeholder:text-[var(--text-muted)] placeholder:opacity-50 focus:border-[var(--accent)] focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="shrink-0 rounded px-4 py-2 font-mono text-[10px] font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {/* History chips */}
        {history.length > 0 && !loading && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {history.map((entry, i) => (
              <button
                key={i}
                onClick={() => handleHistoryClick(entry)}
                className="truncate rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[8px] text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
                style={{ maxWidth: '200px' }}
                title={entry.scenario}
              >
                {entry.scenario}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="border-t border-[var(--border)] px-4 py-4 space-y-3">
          <div className="flex gap-2">
            <div className="h-5 w-20 animate-pulse rounded bg-[var(--surface-2)]" />
            <div className="h-5 w-16 animate-pulse rounded bg-[var(--surface-2)]" />
          </div>
          <div className="h-3 w-full animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded border border-[var(--border)] bg-[var(--surface-2)]" />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border-t border-[var(--border)] px-4 py-3">
          <p className="font-mono text-[10px] text-[var(--price-down)]">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="border-t border-[var(--border)]">
          {/* Impact + Severity badges */}
          <div className="flex items-center gap-2 px-4 py-3">
            {impactBadge && (
              <span
                className="rounded px-2 py-0.5 font-mono text-[10px] font-bold"
                style={{ color: impactBadge.color, background: impactBadge.bg }}
              >
                {impactBadge.label}
              </span>
            )}
            {severityBadge && (
              <span
                className="rounded px-2 py-0.5 font-mono text-[9px] font-semibold"
                style={{ color: severityBadge.color, background: severityBadge.bg }}
              >
                {result.severity}
              </span>
            )}
          </div>

          {/* Summary */}
          <div className="px-4 pb-3">
            <p className="font-mono text-[11px] leading-relaxed text-[var(--text)]">
              {result.summary}
            </p>
          </div>

          {/* Per-position cards */}
          {result.positions.length > 0 && (
            <div className="border-t border-[var(--border)] px-4 py-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  Position Impact
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-3">
                {result.positions.map((pos, i) => {
                  const arrow = POSITION_ARROW[pos.impact] ?? POSITION_ARROW.neutral
                  return (
                    <div key={i} className="flex flex-col gap-1 bg-[var(--surface)] px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px]" style={{ color: arrow.color }}>
                          {arrow.icon}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-[var(--text)]">
                          {pos.symbol}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] leading-snug text-[var(--text-muted)]">
                        {pos.reason}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Hedges */}
          {result.hedges.length > 0 && (
            <div className="border-t border-[var(--border)] px-4 py-3">
              <div className="rounded border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-emerald-400">
                  Suggested Hedges
                </span>
                <ul className="mt-1.5 space-y-1">
                  {result.hedges.map((hedge, i) => (
                    <li key={i} className="font-mono text-[10px] leading-snug text-[var(--text)]">
                      {hedge}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Probability note */}
          {result.probability_note && (
            <div className="border-t border-[var(--border)] px-4 py-2">
              <p className="font-mono text-[9px] text-[var(--text-muted)] opacity-70">
                {result.probability_note}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
