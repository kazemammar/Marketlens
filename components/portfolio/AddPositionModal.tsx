'use client'

import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Asset } from '@/lib/utils/types'
import AssetDataSnapshot from './AssetDataSnapshot'

const TYPE_COLORS: Record<string, string> = {
  stock:     'bg-emerald-500/10 text-emerald-400',
  crypto:    'bg-orange-500/10 text-orange-400',
  forex:     'bg-sky-500/10 text-sky-400',
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

interface AddPositionData {
  symbol:    string
  assetType: string
  direction: 'long' | 'short'
  quantity:  number | null
  avgCost:   number | null
  notes:     string | null
}

export default function AddPositionModal({
  isOpen,
  onClose,
  onAdd,
  prefill,
}: {
  isOpen:   boolean
  onClose:  () => void
  onAdd:    (data: AddPositionData) => Promise<boolean>
  prefill?: { symbol: string; type: string }
}) {
  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState<Asset[]>([])
  const [searching,   setSearching]   = useState(false)
  const [activeIdx,   setActiveIdx]   = useState(-1)
  const [dropOpen,    setDropOpen]    = useState(false)
  const [selected,    setSelected]    = useState<Asset | null>(null)

  const [direction,   setDirection]   = useState<'long' | 'short'>('long')
  const [quantity,    setQuantity]    = useState('')
  const [avgCost,     setAvgCost]     = useState('')
  const [notes,       setNotes]       = useState('')
  const [error,       setError]       = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [visible,     setVisible]     = useState(false)

  const [quoteData,   setQuoteData]   = useState<{ price: number; change: number; changePercent: number; high: number; low: number; open: number } | null>(null)
  const [metricsData, setMetricsData] = useState<{ week52High: number | null; week52Low: number | null; marketCap: number | null; peRatio: number | null; dividendYield: number | null } | null>(null)
  const [dataLoading, setDataLoading] = useState(false)

  const inputRef  = useRef<HTMLInputElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)
  const dq        = useDebounce(query.trim(), 250)

  // Open animation + reset (with optional prefill)
  useEffect(() => {
    if (isOpen) {
      setVisible(false)
      const id = requestAnimationFrame(() => setVisible(true))
      setDirection('long'); setQuantity(''); setAvgCost(''); setNotes('')
      setError(''); setSubmitting(false); setDropOpen(false); setActiveIdx(-1)
      setQuoteData(null); setMetricsData(null)
      if (prefill) {
        const asset = { symbol: prefill.symbol, type: prefill.type as import('@/lib/utils/types').AssetType, name: prefill.symbol }
        setSelected(asset)
        setQuery(prefill.symbol)
        setResults([])
      } else {
        setQuery(''); setResults([]); setSelected(null)
        setTimeout(() => inputRef.current?.focus(), 80)
      }
      return () => cancelAnimationFrame(id)
    } else {
      setVisible(false)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Click outside dropdown closes it
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // Fetch market data when selection changes
  useEffect(() => {
    if (!selected) { setQuoteData(null); setMetricsData(null); return }
    let cancelled = false
    setDataLoading(true)
    Promise.all([
      fetch(`/api/quote/${encodeURIComponent(selected.symbol)}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/financials/${encodeURIComponent(selected.symbol)}`).then((r) => r.ok ? r.json() : null),
    ])
      .then(([q, f]) => { if (!cancelled) { setQuoteData(q); setMetricsData(f?.metrics ?? null) } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDataLoading(false) })
    return () => { cancelled = true }
  }, [selected?.symbol]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch search results
  useEffect(() => {
    if (dq.length < 1) { setResults([]); return }
    let cancelled = false
    setSearching(true)
    fetch(`/api/search?q=${encodeURIComponent(dq)}&limit=8`)
      .then((r) => r.json() as Promise<Asset[]>)
      .then((d) => { if (!cancelled) { setResults(d); setActiveIdx(-1) } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSearching(false) })
    return () => { cancelled = true }
  }, [dq])

  const selectAsset = useCallback((asset: Asset) => {
    setSelected(asset)
    setQuery(asset.symbol)
    setDropOpen(false)
  }, [])

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!dropOpen) setDropOpen(true)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Escape') {
      setDropOpen(false)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIdx >= 0 && results[activeIdx]) selectAsset(results[activeIdx])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!selected) { setError('Select an asset from search results.'); return }
    const qty = quantity ? parseFloat(quantity) : null
    const avg = avgCost  ? parseFloat(avgCost)  : null
    if (qty !== null && (isNaN(qty) || qty <= 0)) { setError('Quantity must be greater than 0.'); return }
    if (avg !== null && (isNaN(avg) || avg < 0))  { setError('Average cost must be 0 or greater.'); return }

    setSubmitting(true)
    const ok = await onAdd({
      symbol:    selected.symbol,
      assetType: selected.type,
      direction,
      quantity:  qty,
      avgCost:   avg,
      notes:     notes.trim() || null,
    })
    setSubmitting(false)
    if (ok) onClose()
    else setError('Failed to add position. Try again.')
  }

  if (!isOpen) return null

  const showDropdown = dropOpen && (results.length > 0 || (dq.length >= 1 && !searching))

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full mx-4 max-w-[440px] overflow-y-auto rounded-xl shadow-2xl"
        style={{
          backgroundColor: 'var(--surface)',
          border:          '1px solid var(--border)',
          maxHeight:       '92vh',
          boxShadow:       '0 0 60px rgba(16,185,129,0.06), 0 25px 50px rgba(0,0,0,0.8)',
          opacity:         visible ? 1 : 0,
          transform:       visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(12px)',
          transition:      'opacity 200ms ease, transform 200ms ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
        >
          <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5" aria-hidden>
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="px-6 pt-6 pb-6">
          {/* Header */}
          <h2 className="mb-5 font-mono text-[15px] font-bold text-[var(--text)]">Add Position</h2>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Symbol — read-only when prefilled, searchable otherwise */}
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Asset <span className="text-red-400">*</span>
              </label>

              {prefill ? (
                /* Read-only prefilled display */
                <div className="flex h-11 items-center gap-2.5 rounded-lg border border-[var(--accent)]/30 bg-[var(--surface-2)] px-3">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${TYPE_COLORS[prefill.type] ?? 'bg-zinc-800 text-zinc-400'}`}>
                    {prefill.type}
                  </span>
                  <span className="font-mono text-[13px] font-bold text-[var(--text)]">{prefill.symbol}</span>
                  <span className="ml-auto font-mono text-[9px] text-[var(--text-muted)] opacity-50">pre-selected</span>
                </div>
              ) : (
                /* Normal search */
                <div ref={wrapRef} className="relative rounded-lg border border-[var(--border)] bg-[var(--surface)] transition-colors focus-within:border-[var(--accent)]/50">
                  <div className="flex h-11 items-center gap-2.5 px-3">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" aria-hidden>
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value)
                        setSelected(null)
                        setQuoteData(null); setMetricsData(null)
                        setDropOpen(true)
                      }}
                      onFocus={() => setDropOpen(true)}
                      onKeyDown={handleKeyDown}
                      placeholder="Search symbol or name..."
                      autoComplete="off"
                      spellCheck={false}
                      className="flex-1 bg-transparent font-mono text-[12px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
                      aria-label="Search assets"
                    />
                    {searching && (
                      <span className="h-3 w-3 shrink-0 animate-spin rounded-full border border-[var(--accent)] border-t-transparent" />
                    )}
                    {selected && (
                      <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${TYPE_COLORS[selected.type] ?? 'bg-zinc-800 text-zinc-400'}`}>
                        {selected.type}
                      </span>
                    )}
                  </div>

                  {showDropdown && (
                    <div
                      className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl shadow-black/50"
                      style={{ maxHeight: '240px', overflowY: 'auto' }}
                    >
                      {dq.length >= 1 && results.length === 0 && !searching && (
                        <div className="px-4 py-4 text-center">
                          <p className="font-mono text-[11px] text-[var(--text-muted)]">No results for &ldquo;{dq}&rdquo;</p>
                        </div>
                      )}
                      <ul>
                        {results.map((asset, i) => (
                          <li key={`${asset.type}-${asset.symbol}-${i}`}>
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); selectAsset(asset) }}
                              onMouseEnter={() => setActiveIdx(i)}
                              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                                i === activeIdx ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'
                              }`}
                            >
                              <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${TYPE_COLORS[asset.type] ?? 'bg-zinc-800 text-zinc-400'}`}>
                                {asset.type}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block font-mono text-[12px] font-semibold text-[var(--text)]">{asset.symbol}</span>
                                <span className="block truncate font-mono text-[10px] text-[var(--text-muted)]">{asset.name}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Asset data snapshot */}
            {selected && (
              <AssetDataSnapshot
                quoteData={quoteData}
                metricsData={metricsData}
                dataLoading={dataLoading}
                assetType={selected.type}
              />
            )}

            {/* Direction */}
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Direction <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                {(['long', 'short'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    className={`flex-1 rounded-lg border py-2.5 font-mono text-[12px] font-semibold uppercase tracking-wide transition-all duration-150 ${
                      direction === d
                        ? d === 'long'
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                          : 'border-red-500/50 bg-red-500/10 text-red-400'
                        : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]/30 hover:text-[var(--text)]'
                    }`}
                  >
                    {d === 'long' ? '▲ Long' : '▼ Short'}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Quantity <span className="opacity-50">(optional)</span>
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 100"
                min="0"
                step="any"
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 font-mono text-[12px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/50"
              />
            </div>

            {/* Average Cost */}
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Avg. Cost <span className="opacity-50">(optional)</span>
              </label>
              <input
                type="number"
                value={avgCost}
                onChange={(e) => setAvgCost(e.target.value)}
                placeholder="e.g. 185.50"
                min="0"
                step="any"
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 font-mono text-[12px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/50"
              />
              <p className="font-mono text-[10px] text-[var(--text-muted)] opacity-60">Add for P&amp;L tracking</p>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Notes <span className="opacity-50">(optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                placeholder="e.g. swing trade, hedge..."
                maxLength={200}
                className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 font-mono text-[12px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/50"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
                <span className="mt-px text-sm text-red-400" aria-hidden>⚠</span>
                <p className="font-mono text-[11px] leading-relaxed text-red-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2.5 font-mono text-[12px] text-[var(--text-muted)] transition hover:border-[var(--accent)]/30 hover:text-[var(--text)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-mono text-[12px] font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                Add Position
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  )
}
