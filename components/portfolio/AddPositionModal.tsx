'use client'

import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Asset } from '@/lib/utils/types'
import type { PortfolioPosition, PortfolioLot } from '@/lib/hooks/usePortfolio'
import AssetDataSnapshot from './AssetDataSnapshot'

// ─── Constants ─────────────────────────────────────────────────────────────

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

// ─── Types ──────────────────────────────────────────────────────────────────

type Step   = 'search' | 'method' | 'details'
type Method = 'amount' | 'shares' | 'trackonly'

export interface AddPositionData {
  symbol:        string
  assetType:     string
  direction:     'long' | 'short'
  quantity:      number | null
  avgCost:       number | null
  notes:         string | null
  lots?:         PortfolioLot[]
  purchaseDate?: string | null
}

// ─── Back arrow ─────────────────────────────────────────────────────────────

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
    >
      <svg viewBox="0 0 10 10" fill="none" className="h-2.5 w-2.5" aria-hidden>
        <path d="M8 5H2M5 2L2 5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AddPositionModal({
  isOpen,
  onClose,
  onAdd,
  onAddLot,
  positions = [],
  prefill,
}: {
  isOpen:     boolean
  onClose:    () => void
  onAdd:      (data: AddPositionData) => Promise<boolean>
  onAddLot?:  (positionId: string, lot: PortfolioLot) => Promise<boolean>
  positions?: PortfolioPosition[]
  prefill?:   { symbol: string; type: string }
}) {
  // ── Search state ──────────────────────────────────────────────────────────
  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState<Asset[]>([])
  const [searching,   setSearching]   = useState(false)
  const [activeIdx,   setActiveIdx]   = useState(-1)
  const [dropOpen,    setDropOpen]    = useState(false)
  const [selected,    setSelected]    = useState<Asset | null>(null)
  const [visible,     setVisible]     = useState(false)

  const [quoteData,   setQuoteData]   = useState<{ price: number; change: number; changePercent: number; high: number; low: number; open: number } | null>(null)
  const [metricsData, setMetricsData] = useState<{ week52High: number | null; week52Low: number | null; marketCap: number | null; peRatio: number | null; dividendYield: number | null } | null>(null)
  const [dataLoading, setDataLoading] = useState(false)

  // ── Flow state ────────────────────────────────────────────────────────────
  const [step,      setStep]      = useState<Step>('search')
  const [method,    setMethod]    = useState<Method | null>(null)
  const [direction, setDirection] = useState<'long' | 'short'>('long')

  // ── Details state ─────────────────────────────────────────────────────────
  const [totalAmount,   setTotalAmount]   = useState('')
  const [quantity,      setQuantity]      = useState('')
  const [pricePerShare, setPricePerShare] = useState('')
  const [dateStr,       setDateStr]       = useState('')
  const [fetchedPrice,  setFetchedPrice]  = useState<number | null>(null)
  const [priceLoading,  setPriceLoading]  = useState(false)
  const [notes,         setNotes]         = useState('')
  const [error,         setError]         = useState('')
  const [submitting,    setSubmitting]    = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)
  const dq       = useDebounce(query.trim(), 250)
  const today    = new Date().toISOString().slice(0, 10)

  const existingPosition = selected ? positions.find((p) => p.symbol === selected.symbol) ?? null : null

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setVisible(false)
      const id = requestAnimationFrame(() => setVisible(true))
      setStep('search'); setMethod(null); setDirection('long')
      setTotalAmount(''); setQuantity(''); setPricePerShare('')
      setDateStr(''); setFetchedPrice(null)
      setNotes(''); setError(''); setSubmitting(false)
      setDropOpen(false); setActiveIdx(-1)
      setQuoteData(null); setMetricsData(null)
      if (prefill) {
        const asset = { symbol: prefill.symbol, type: prefill.type as import('@/lib/utils/types').AssetType, name: prefill.symbol }
        setSelected(asset); setQuery(prefill.symbol); setResults([])
      } else {
        setQuery(''); setResults([]); setSelected(null)
        setTimeout(() => inputRef.current?.focus(), 80)
      }
      return () => cancelAnimationFrame(id)
    } else {
      setVisible(false)
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // ── Click outside dropdown ────────────────────────────────────────────────
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  // ── Fetch market snapshot ─────────────────────────────────────────────────
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

  // ── Fetch historical price on date ────────────────────────────────────────
  useEffect(() => {
    if (!dateStr || !selected || method === 'trackonly') { setFetchedPrice(null); return }
    let cancelled = false
    setPriceLoading(true)
    setFetchedPrice(null)
    const url = `/api/portfolio/price-on-date?symbol=${encodeURIComponent(selected.symbol)}&type=${encodeURIComponent(selected.type)}&date=${dateStr}`
    fetch(url)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (!cancelled && d?.price) setFetchedPrice(d.price) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setPriceLoading(false) })
    return () => { cancelled = true }
  }, [dateStr, selected?.symbol, method]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search assets ─────────────────────────────────────────────────────────
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
    setSelected(asset); setQuery(asset.symbol); setDropOpen(false)
  }, [])

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!dropOpen) setDropOpen(true)
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)) }
    else if (e.key === 'Escape')    { setDropOpen(false) }
    else if (e.key === 'Enter')     { e.preventDefault(); if (activeIdx >= 0 && results[activeIdx]) selectAsset(results[activeIdx]) }
  }

  // ── Receipt calculation ───────────────────────────────────────────────────
  const priceToUse  = parseFloat(pricePerShare) || fetchedPrice || 0
  const receiptQty  = method === 'amount'
    ? (parseFloat(totalAmount) > 0 && priceToUse > 0 ? parseFloat(totalAmount) / priceToUse : null)
    : method === 'shares'
      ? (parseFloat(quantity) > 0 ? parseFloat(quantity) : null)
      : null
  const receiptAmt  = method === 'amount'
    ? (parseFloat(totalAmount) > 0 ? parseFloat(totalAmount) : null)
    : (receiptQty !== null && priceToUse > 0 ? receiptQty * priceToUse : null)

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError('')
    if (!selected) return

    if (method === 'trackonly') {
      if (existingPosition) { setError('This symbol is already in your portfolio.'); return }
      setSubmitting(true)
      const ok = await onAdd({
        symbol: selected.symbol, assetType: selected.type, direction,
        quantity: null, avgCost: null, notes: notes.trim() || null,
        lots: [], purchaseDate: null,
      })
      setSubmitting(false)
      if (ok) onClose(); else setError('Failed to add position. Try again.')
      return
    }

    if (!dateStr) { setError('Please select a purchase date.'); return }

    if (method === 'amount') {
      const amt = parseFloat(totalAmount)
      if (!amt || amt <= 0) { setError('Enter a valid total amount.'); return }
      if (!priceToUse || priceToUse <= 0) { setError('Price per unit is required. Enter it manually if auto-fetch failed.'); return }
    }

    if (method === 'shares') {
      const qty = parseFloat(quantity)
      if (!qty || qty <= 0) { setError('Enter a valid number of shares.'); return }
      if (!priceToUse || priceToUse <= 0) { setError('Price per unit is required.'); return }
    }

    if (!receiptQty || receiptQty <= 0) { setError('Could not calculate quantity. Check your inputs.'); return }

    const lot: PortfolioLot = {
      id:        crypto.randomUUID(),
      date:      dateStr,
      quantity:  parseFloat(receiptQty.toFixed(8)),
      price:     parseFloat(priceToUse.toFixed(4)),
      amount:    parseFloat((receiptAmt ?? receiptQty * priceToUse).toFixed(2)),
      note:      notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    }

    setSubmitting(true)
    let ok: boolean
    if (existingPosition && onAddLot) {
      ok = await onAddLot(existingPosition.id, lot)
    } else {
      ok = await onAdd({
        symbol:       selected.symbol,
        assetType:    selected.type,
        direction,
        quantity:     lot.quantity,
        avgCost:      lot.price,
        notes:        notes.trim() || null,
        lots:         [lot],
        purchaseDate: dateStr,
      })
    }
    setSubmitting(false)
    if (ok) onClose(); else setError('Failed to save. Try again.')
  }

  if (!isOpen) return null

  const showDropdown = dropOpen && (results.length > 0 || (dq.length >= 1 && !searching))
  const inputCls = 'no-focus-ring h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 font-mono text-[12px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/50'

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
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
        >
          <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5" aria-hidden>
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="px-6 pt-6 pb-6 space-y-5">

          {/* ══════════════════ STEP 1: SEARCH ══════════════════════════ */}
          {step === 'search' && (
            <>
              <h2 className="font-mono text-[15px] font-bold text-[var(--text)]">Add Position</h2>

              {/* Symbol search */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Asset <span className="text-red-400">*</span>
                </label>

                {prefill ? (
                  <div className="flex h-11 items-center gap-2.5 rounded-lg border border-[var(--accent)]/30 bg-[var(--surface-2)] px-3">
                    <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${TYPE_COLORS[prefill.type] ?? 'bg-zinc-800 text-zinc-400'}`}>
                      {prefill.type}
                    </span>
                    <span className="font-mono text-[13px] font-bold text-[var(--text)]">{prefill.symbol}</span>
                    <span className="ml-auto font-mono text-[9px] text-[var(--text-muted)] opacity-50">pre-selected</span>
                  </div>
                ) : (
                  <div ref={wrapRef} className="no-focus-ring relative rounded-lg border border-[var(--border)] bg-[var(--surface)] transition-colors focus-within:border-[var(--accent)]/50">
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
                          setQuery(e.target.value); setSelected(null)
                          setQuoteData(null); setMetricsData(null); setDropOpen(true)
                        }}
                        onFocus={() => setDropOpen(true)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search symbol or name..."
                        autoComplete="off"
                        spellCheck={false}
                        className="flex-1 bg-transparent font-mono text-[12px] text-[var(--text)] outline-none focus:outline-none focus-visible:outline-none focus:ring-0 placeholder:text-[var(--text-muted)]"
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
                                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${i === activeIdx ? 'bg-[var(--surface-2)]' : 'hover:bg-[var(--surface-2)]'}`}
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

              {/* Asset snapshot */}
              {selected && (
                <AssetDataSnapshot
                  quoteData={quoteData}
                  metricsData={metricsData}
                  dataLoading={dataLoading}
                  assetType={selected.type}
                />
              )}

              {/* Existing position banner */}
              {existingPosition && (
                <div className="flex items-start gap-2.5 rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-3.5 py-3">
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 shrink-0 mt-px text-[var(--accent)]" aria-hidden>
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="8" y1="5.5" x2="8" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="8" cy="10.5" r="0.75" fill="currentColor"/>
                  </svg>
                  <div>
                    <p className="font-mono text-[11px] font-semibold text-[var(--accent)]">Already in your portfolio</p>
                    <p className="mt-0.5 font-mono text-[10px] text-[var(--text-muted)]">
                      Continue to log another purchase for this position.
                    </p>
                  </div>
                </div>
              )}

              {/* Next */}
              <button
                type="button"
                onClick={() => setStep('method')}
                disabled={!selected}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-mono text-[12px] font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <svg viewBox="0 0 10 10" fill="none" className="h-2.5 w-2.5" aria-hidden>
                  <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </>
          )}

          {/* ══════════════════ STEP 2: METHOD ══════════════════════════ */}
          {step === 'method' && selected && (
            <>
              <div className="flex items-center gap-3">
                <BackBtn onClick={() => setStep('search')} />
                <div>
                  <h2 className="font-mono text-[15px] font-bold text-[var(--text)]">How did you invest?</h2>
                  <p className="font-mono text-[10px] text-[var(--text-muted)]">
                    {selected.symbol} · {selected.type.charAt(0).toUpperCase() + selected.type.slice(1)}
                  </p>
                </div>
              </div>

              {/* Direction */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Direction</label>
                <div className="flex gap-2">
                  {(['long', 'short'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDirection(d)}
                      className={`flex-1 rounded-lg border py-2.5 font-mono text-[12px] font-semibold uppercase tracking-wide transition-all duration-150 ${
                        direction === d
                          ? d === 'long' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-red-500/50 bg-red-500/10 text-red-400'
                          : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]/30 hover:text-[var(--text)]'
                      }`}
                    >
                      {d === 'long' ? '▲ Long' : '▼ Short'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Method cards */}
              <div className={`grid gap-2 ${existingPosition ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {[
                  { id: 'amount'    as Method, label: 'Amount',     icon: '$', desc: 'Total\ninvested'        },
                  { id: 'shares'    as Method, label: 'Shares',     icon: '#', desc: 'Qty &\nprice/unit'     },
                  ...(!existingPosition ? [{ id: 'trackonly' as Method, label: 'Track Only', icon: '~', desc: 'No cost\ndata needed' }] : []),
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setMethod(m.id); setStep('details') }}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-4 text-center transition-all duration-150 hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] font-mono text-[13px] font-bold text-[var(--text-muted)]">
                      {m.icon}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-[var(--text)]">{m.label}</span>
                    <span className="font-mono text-[9px] leading-relaxed text-[var(--text-muted)] whitespace-pre-line">{m.desc}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ══════════════════ STEP 3: DETAILS ═════════════════════════ */}
          {step === 'details' && selected && method && (
            <>
              <div className="flex items-center gap-3">
                <BackBtn onClick={() => setStep('method')} />
                <div>
                  <h2 className="font-mono text-[15px] font-bold text-[var(--text)]">
                    {method === 'amount' ? 'Log by Amount' : method === 'shares' ? 'Log by Shares' : 'Track Position'}
                  </h2>
                  <p className="font-mono text-[10px] text-[var(--text-muted)]">
                    {selected.symbol} · {direction === 'long' ? '▲ Long' : '▼ Short'}
                  </p>
                </div>
              </div>

              {/* Total amount (amount mode) */}
              {method === 'amount' && (
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Total Amount <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[12px] text-[var(--text-muted)]">$</span>
                    <input
                      type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="1000.00" min="0" step="any"
                      className={`${inputCls} pl-7`}
                    />
                  </div>
                </div>
              )}

              {/* Shares (shares mode) */}
              {method === 'shares' && (
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Number of Shares <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 10" min="0" step="any"
                    className={inputCls}
                  />
                </div>
              )}

              {/* Date picker */}
              {method !== 'trackonly' && (
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Purchase Date <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date" value={dateStr}
                    onChange={(e) => { setDateStr(e.target.value); setPricePerShare('') }}
                    max={today}
                    className={`${inputCls} [color-scheme:dark]`}
                  />
                </div>
              )}

              {/* Price per unit */}
              {method !== 'trackonly' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Price per Unit{method === 'shares' && <span className="text-red-400"> *</span>}
                    </label>
                    {priceLoading && (
                      <span className="flex items-center gap-1 font-mono text-[9px] text-[var(--text-muted)]">
                        <span className="h-2 w-2 animate-spin rounded-full border border-[var(--accent)] border-t-transparent" />
                        fetching...
                      </span>
                    )}
                    {fetchedPrice !== null && !priceLoading && !pricePerShare && (
                      <span className="font-mono text-[9px] text-[var(--accent)]">auto · ${fetchedPrice.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-[12px] text-[var(--text-muted)]">$</span>
                    <input
                      type="number" value={pricePerShare} onChange={(e) => setPricePerShare(e.target.value)}
                      placeholder={fetchedPrice !== null ? fetchedPrice.toFixed(2) : 'e.g. 185.50'}
                      min="0" step="any"
                      className={`${inputCls} pl-7`}
                    />
                  </div>
                  {!dateStr && (
                    <p className="font-mono text-[9px] text-[var(--text-muted)] opacity-60">Select a date to auto-fetch historical price</p>
                  )}
                </div>
              )}

              {/* Receipt preview */}
              {method !== 'trackonly' && receiptQty !== null && priceToUse > 0 && (
                <div className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Purchase</p>
                      <p className="mt-0.5 font-mono text-[13px] font-bold text-[var(--text)]">
                        {receiptQty < 1 ? receiptQty.toFixed(4) : receiptQty.toFixed(2)} units
                        {' '}
                        <span className="text-[var(--text-muted)] font-normal text-[11px]">@ ${priceToUse.toFixed(2)}</span>
                      </p>
                      {dateStr && (
                        <p className="mt-1 font-mono text-[9px] text-[var(--text-muted)] opacity-60">
                          {new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    {receiptAmt !== null && (
                      <div className="text-right shrink-0">
                        <p className="font-mono text-[9px] text-[var(--text-muted)]">Total</p>
                        <p className="font-mono text-[13px] font-bold text-[var(--accent)]">
                          ${receiptAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Notes <span className="opacity-50">(optional)</span>
                </label>
                <input
                  type="text" value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                  placeholder="e.g. swing trade, hedge..."
                  maxLength={200}
                  className={inputCls}
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
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-mono text-[12px] font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                  {existingPosition && method !== 'trackonly' ? 'Add Purchase' : 'Add Position'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>,
    document.body
  )
}
