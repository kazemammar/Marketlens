'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useEffect, useCallback, KeyboardEvent } from 'react'
import Link from 'next/link'
import { useTheme } from './ThemeProvider'
import { Asset } from '@/lib/utils/types'

const TYPE_COLORS: Record<string, string> = {
  stock:     'bg-blue-500/10 text-blue-400',
  crypto:    'bg-orange-500/10 text-orange-400',
  forex:     'bg-green-500/10 text-green-400',
  commodity: 'bg-yellow-500/10 text-yellow-400',
  etf:       'bg-purple-500/10 text-purple-400',
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${TYPE_COLORS[type] ?? 'bg-slate-500/10 text-slate-400'}`}>
      {type}
    </span>
  )
}

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setD(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return d
}

const NAV_LINKS = [
  { label: 'Stocks',      href: '/?tab=stock'     },
  { label: 'Crypto',      href: '/?tab=crypto'    },
  { label: 'Forex',       href: '/?tab=forex'     },
  { label: 'Commodities', href: '/?tab=commodity' },
  { label: 'ETFs',        href: '/?tab=etf'       },
  { label: 'News',        href: '/news'            },
]

export default function Navbar() {
  const router      = useRouter()
  const { theme, toggle } = useTheme()
  const inputRef    = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchWrap  = useRef<HTMLDivElement>(null)

  const [query,       setQuery]       = useState('')
  const [suggestions, setSuggestions] = useState<Asset[]>([])
  const [showDrop,    setShowDrop]    = useState(false)
  const [loadingSug,  setLoadingSug]  = useState(false)
  const [activeIdx,   setActiveIdx]   = useState(-1)
  const [searchOpen,  setSearchOpen]  = useState(false)

  const dq = useDebounce(query.trim(), 280)

  useEffect(() => {
    if (dq.length < 1) { setSuggestions([]); setShowDrop(false); return }
    let cancelled = false
    setLoadingSug(true)
    fetch(`/api/search?q=${encodeURIComponent(dq)}&limit=5`)
      .then((r) => r.json() as Promise<Asset[]>)
      .then((d) => { if (cancelled) return; setSuggestions(d); setShowDrop(d.length > 0); setActiveIdx(-1) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingSug(false) })
    return () => { cancelled = true }
  }, [dq])

  // Close on outside click
  useEffect(() => {
    function h(e: MouseEvent) {
      if (
        searchWrap.current && !searchWrap.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) { setShowDrop(false); setSearchOpen(false) }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const navigateTo = useCallback((asset: Asset) => {
    setQuery(''); setShowDrop(false); setSearchOpen(false)
    router.push(`/asset/${asset.type}/${encodeURIComponent(asset.symbol)}`)
  }, [router])

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)) }
    else if (e.key === 'Escape') { setShowDrop(false); setSearchOpen(false) }
    else if (e.key === 'Enter') {
      if (activeIdx >= 0 && suggestions[activeIdx]) { navigateTo(suggestions[activeIdx]) }
      else { const q = query.trim(); if (!q) return; setShowDrop(false); router.push(`/search?q=${encodeURIComponent(q)}`) }
    }
  }

  const Dropdown = (
    <div
      ref={dropdownRef}
      className="absolute left-0 top-full z-50 mt-1 w-full min-w-[280px] overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-black/40"
    >
      {loadingSug ? (
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent text-[var(--text-muted)]" />
          <span className="font-mono text-[11px] text-[var(--text-muted)]">Searching…</span>
        </div>
      ) : (
        <ul role="listbox">
          {suggestions.map((asset, i) => (
            <li key={`${asset.type}-${asset.symbol}`} role="option" aria-selected={i === activeIdx}>
              <button
                onMouseDown={(e) => { e.preventDefault(); navigateTo(asset) }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left transition ${i === activeIdx ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'}`}
              >
                <TypeBadge type={asset.type} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[11px] font-semibold text-[var(--text)]">{asset.symbol}</span>
                  <span className="block truncate text-[10px] text-[var(--text-muted)]">{asset.name}</span>
                </span>
                <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]" aria-hidden>↵</span>
              </button>
            </li>
          ))}
          <li className="border-t border-[var(--border)]">
            <button
              onMouseDown={(e) => { e.preventDefault(); setShowDrop(false); setSearchOpen(false); router.push(`/search?q=${encodeURIComponent(query.trim())}`) }}
              className="flex w-full items-center justify-between px-3 py-2 font-mono text-[10px] text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              <span>All results for <strong className="text-[var(--text)]">{query.trim()}</strong></span>
              <span aria-hidden>→</span>
            </button>
          </li>
        </ul>
      )}
    </div>
  )

  function openSearch() {
    setSearchOpen(true)
    setTimeout(() => inputRef.current?.focus(), 40)
  }

  return (
    <header className="sticky top-0 z-50 h-12 w-full border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="flex h-full items-center gap-2 px-3 sm:px-4">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-1.5 select-none">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-blue-600">
            <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5" aria-hidden>
              <polyline points="1,11 4,7 7,8.5 10,4 13,2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="hidden font-semibold tracking-tight text-[var(--text)] sm:block" style={{ fontSize: 13 }}>
            Market<span className="text-blue-500">Lens</span>
          </span>
          {/* LIVE indicator */}
          <div className="flex items-center gap-1 rounded border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5">
            <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
            <span className="font-mono text-[8px] font-bold text-emerald-400">LIVE</span>
          </div>
        </Link>

        {/* Nav links (lg+) */}
        <nav className="hidden items-center gap-0.5 lg:flex ml-2">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="rounded px-2.5 py-1 font-mono text-[10px] font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div ref={searchWrap} className="relative">
          {searchOpen ? (
            <div className="relative">
              <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setShowDrop(true) }}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (suggestions.length > 0) setShowDrop(true) }}
                placeholder="Search…"
                autoComplete="off"
                className="h-8 w-48 rounded border border-[var(--border)] bg-[var(--surface-2)] pl-8 pr-3 font-mono text-[11px] text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 sm:w-64"
              />
              {showDrop && Dropdown}
            </div>
          ) : (
            <button
              onClick={openSearch}
              aria-label="Search"
              className="flex h-8 w-8 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] transition hover:text-[var(--text)]"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="flex h-8 w-8 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] transition hover:text-[var(--text)]"
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
              <circle cx="12" cy="12" r="4"/>
              <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
              <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
              <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
              <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>
            </svg>
          )}
        </button>
      </div>
    </header>
  )
}
