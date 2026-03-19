'use client'

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { Asset } from '@/lib/utils/types'

// ─── Type colors ──────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  stock:     'bg-emerald-500/10 text-emerald-400',
  crypto:    'bg-orange-500/10 text-orange-400',
  forex:     'bg-sky-500/10 text-sky-400',
  commodity: 'bg-amber-500/10 text-amber-400',
  etf:       'bg-purple-500/10 text-purple-400',
}

// ─── Trending / popular assets ────────────────────────────────────────────

const TRENDING: Asset[] = [
  { symbol: 'AAPL',    name: 'Apple Inc.',          type: 'stock'     },
  { symbol: 'MSFT',    name: 'Microsoft Corp.',      type: 'stock'     },
  { symbol: 'BTC',     name: 'Bitcoin',              type: 'crypto'    },
  { symbol: 'ETH',     name: 'Ethereum',             type: 'crypto'    },
  { symbol: 'EUR/USD', name: 'Euro / US Dollar',     type: 'forex'     },
  { symbol: 'GC=F',    name: 'Gold Futures',          type: 'commodity' },
]

// ─── Debounce hook ────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setD(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return d
}

// ─── Component ────────────────────────────────────────────────────────────

export default function GlobalSearch({
  placeholder = 'Search any stock, crypto, forex pair...',
  className   = '',
  autoFocus   = false,
}: {
  placeholder?: string
  className?:   string
  autoFocus?:   boolean
}) {
  const router   = useRouter()
  const wrapRef  = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [query,     setQuery]     = useState('')
  const [results,   setResults]   = useState<Asset[]>([])
  const [loading,   setLoading]   = useState(false)
  const [open,      setOpen]      = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)

  const dq = useDebounce(query.trim(), 250)

  // ── Fetch results on debounced query ──────────────────────────────────
  useEffect(() => {
    if (dq.length < 1) { setResults([]); return }
    let cancelled = false
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(dq)}&limit=10`)
      .then((r) => r.json() as Promise<Asset[]>)
      .then((d) => { if (!cancelled) { setResults(d); setActiveIdx(-1) } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [dq])

  // ── Click-outside closes dropdown ─────────────────────────────────────
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const rawList      = dq.length >= 1 ? results : TRENDING
  const seen         = new Set<string>()
  const displayList  = rawList.filter((a) => {
    const k = `${a.type}-${a.symbol}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  const showDropdown = open && (
    displayList.length > 0 ||
    (dq.length >= 1 && !loading)   // show "no results" message
  )

  const navigateTo = useCallback((asset: Asset) => {
    setOpen(false)
    setQuery('')
    router.push(`/asset/${asset.type}/${encodeURIComponent(asset.symbol)}`)
  }, [router])

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!open && e.key !== 'Tab') { setOpen(true) }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, displayList.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && displayList[activeIdx]) {
        navigateTo(displayList[activeIdx])
      } else {
        const q = query.trim()
        if (!q) return
        setOpen(false)
        router.push(`/search?q=${encodeURIComponent(q)}`)
      }
    }
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>

      {/* ── Input ── */}
      <div
        className={`flex h-10 items-center gap-2.5 rounded-lg border px-3 transition-colors ${
          open
            ? 'border-[var(--accent)]/60 bg-[var(--surface)]'
            : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/30'
        }`}
      >
        <svg
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" aria-hidden
        >
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="flex-1 bg-transparent font-mono text-[12px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
          aria-label="Search assets"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          role="combobox"
        />

        {loading && (
          <span className="h-3 w-3 shrink-0 animate-spin rounded-full border border-[var(--accent)] border-t-transparent" />
        )}

        {query && !loading && (
          <button
            type="button"
            onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }}
            className="shrink-0 font-mono text-[9px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Dropdown ── */}
      {showDropdown && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-black/50"
          style={{ maxHeight: '360px', overflowY: 'auto' }}
          role="listbox"
        >
          {/* Trending header */}
          {dq.length < 1 && (
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
              <svg viewBox="0 0 16 16" fill="none" className="h-2.5 w-2.5 shrink-0 text-[var(--accent)]" aria-hidden>
                <path d="M2 12l4-4 2 2 3-4 3-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Trending
              </span>
            </div>
          )}

          {/* No results */}
          {dq.length >= 1 && results.length === 0 && !loading && (
            <div className="px-4 py-5 text-center">
              <p className="font-mono text-[11px] text-[var(--text-muted)]">
                No results for{' '}
                <span className="text-[var(--text)]">&ldquo;{dq}&rdquo;</span>
              </p>
              <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)] opacity-60">
                Try a ticker symbol like AAPL or BTC
              </p>
            </div>
          )}

          {/* Result rows */}
          <ul>
            {displayList.map((asset, i) => (
              <li key={`${asset.type}-${asset.symbol}`} role="option" aria-selected={i === activeIdx}>
                <button
                  onMouseDown={(e) => { e.preventDefault(); navigateTo(asset) }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    i === activeIdx ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'
                  }`}
                >
                  <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${TYPE_COLORS[asset.type] ?? 'bg-zinc-800 text-zinc-400'}`}>
                    {asset.type}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[12px] font-semibold text-[var(--text)]">
                      {asset.symbol}
                    </span>
                    <span className="block truncate font-mono text-[10px] text-[var(--text-muted)]">
                      {asset.name}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]" aria-hidden>↵</span>
                </button>
              </li>
            ))}
          </ul>

          {/* "View all results" footer */}
          {dq.length >= 1 && results.length > 0 && (
            <div className="border-t border-[var(--border)]">
              <button
                onMouseDown={(e) => {
                  e.preventDefault()
                  setOpen(false)
                  router.push(`/search?q=${encodeURIComponent(query.trim())}`)
                }}
                className="flex w-full items-center justify-between px-3 py-2.5 font-mono text-[11px] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              >
                <span>All results for <strong className="text-[var(--text)]">{query.trim()}</strong></span>
                <span className="text-[var(--accent)]" aria-hidden>→</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
