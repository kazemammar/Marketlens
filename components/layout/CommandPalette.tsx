'use client'

import { useEffect, useRef, useState, KeyboardEvent, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Asset } from '@/lib/utils/types'

const TYPE_COLORS: Record<string, string> = {
  stock:     'bg-emerald-500/10 text-emerald-400',
  crypto:    'bg-orange-500/10 text-orange-400',
  forex:     'bg-emerald-500/10 text-emerald-300',
  commodity: 'bg-amber-500/10 text-amber-400',
  etf:       'bg-purple-500/10 text-purple-400',
}

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setD(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return d
}

export default function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const router    = useRouter()
  const inputRef  = useRef<HTMLInputElement>(null)
  const [query,       setQuery]       = useState('')
  const [suggestions, setSuggestions] = useState<Asset[]>([])
  const [loading,     setLoading]     = useState(false)
  const [activeIdx,   setActiveIdx]   = useState(-1)

  const dq = useDebounce(query.trim(), 250)

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSuggestions([])
      setActiveIdx(-1)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Search
  useEffect(() => {
    if (dq.length < 1) { setSuggestions([]); return }
    let cancelled = false
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(dq)}&limit=8`)
      .then((r) => r.json() as Promise<Asset[]>)
      .then((d) => { if (!cancelled) { setSuggestions(d); setActiveIdx(-1) } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [dq])

  const navigateTo = useCallback((asset: Asset) => {
    onClose()
    router.push(`/asset/${asset.type}/${encodeURIComponent(asset.symbol)}`)
  }, [router, onClose])

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)) }
    else if (e.key === 'Escape') { onClose() }
    else if (e.key === 'Enter') {
      if (activeIdx >= 0 && suggestions[activeIdx]) { navigateTo(suggestions[activeIdx]) }
      else { const q = query.trim(); if (!q) return; onClose(); router.push(`/search?q=${encodeURIComponent(q)}`) }
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="animate-palette-in w-full max-w-xl overflow-hidden rounded-xl shadow-2xl"
        style={{
          background: 'var(--surface)',
          border: '1px solid rgba(16,185,129,0.2)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(16,185,129,0.1)',
        }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search markets — stocks, crypto, forex…"
            autoComplete="off"
            className="flex-1 bg-transparent font-mono text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
          />
          {loading && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border border-[var(--accent)] border-t-transparent" />
          )}
          <kbd
            onClick={onClose}
            className="cursor-pointer rounded px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        {(suggestions.length > 0 || (dq.length > 0 && !loading)) && (
          <ul role="listbox" className="max-h-80 overflow-y-auto py-1">
            {suggestions.map((asset, i) => (
              <li key={`${asset.type}-${asset.symbol}`} role="option" aria-selected={i === activeIdx}>
                <button
                  onMouseDown={(e) => { e.preventDefault(); navigateTo(asset) }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === activeIdx ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'}`}
                >
                  <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${TYPE_COLORS[asset.type] ?? 'bg-zinc-800 text-zinc-400'}`}>
                    {asset.type}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[12px] font-semibold text-[var(--text)]">{asset.symbol}</span>
                    <span className="block truncate text-[10px] text-[var(--text-muted)]">{asset.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]" aria-hidden>↵</span>
                </button>
              </li>
            ))}
            {dq.length > 0 && (
              <li className="border-t border-[var(--border)]">
                <button
                  onMouseDown={(e) => { e.preventDefault(); onClose(); router.push(`/search?q=${encodeURIComponent(query.trim())}`) }}
                  className="flex w-full items-center justify-between px-4 py-2.5 font-mono text-[11px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                >
                  <span>All results for <strong className="text-[var(--text)]">{query.trim()}</strong></span>
                  <span className="text-[var(--accent)]" aria-hidden>→</span>
                </button>
              </li>
            )}
          </ul>
        )}

        {/* Empty state hint */}
        {query.length === 0 && (
          <div className="grid grid-cols-3 gap-px border-t border-[var(--border)] bg-[var(--border)]">
            {[
              { label: 'Stocks',      example: 'AAPL, TSLA, NVDA' },
              { label: 'Crypto',      example: 'BTC, ETH, SOL' },
              { label: 'Forex',       example: 'EUR/USD, GBP/USD' },
            ].map((h) => (
              <div key={h.label} className="flex flex-col gap-0.5 bg-[var(--surface)] px-4 py-3">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">{h.label}</span>
                <span className="font-mono text-[10px] text-[var(--text-muted)] opacity-50">{h.example}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
