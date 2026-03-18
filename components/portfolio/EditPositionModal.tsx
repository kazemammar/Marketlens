'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { PortfolioPosition } from '@/lib/hooks/usePortfolio'
import AssetDataSnapshot from './AssetDataSnapshot'

export default function EditPositionModal({
  isOpen,
  onClose,
  position,
  onUpdate,
  onDelete,
}: {
  isOpen:    boolean
  onClose:   () => void
  position:  PortfolioPosition
  onUpdate:  (id: string, updates: Partial<{ direction: 'long' | 'short'; quantity: number | null; avg_cost: number | null; notes: string | null }>) => Promise<boolean>
  onDelete:  (id: string) => Promise<boolean>
}) {
  const [direction,   setDirection]   = useState<'long' | 'short'>(position.direction)
  const [quantity,    setQuantity]    = useState(position.quantity?.toString() ?? '')
  const [avgCost,     setAvgCost]     = useState(position.avg_cost?.toString() ?? '')
  const [notes,       setNotes]       = useState(position.notes ?? '')
  const [error,       setError]       = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [visible,     setVisible]     = useState(false)

  const [quoteData,   setQuoteData]   = useState<{ price: number; change: number; changePercent: number; high: number; low: number; open: number } | null>(null)
  const [metricsData, setMetricsData] = useState<{ week52High: number | null; week52Low: number | null; marketCap: number | null; peRatio: number | null; dividendYield: number | null } | null>(null)
  const [dataLoading, setDataLoading] = useState(false)

  // Sync form when position prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setVisible(false)
      const id = requestAnimationFrame(() => setVisible(true))
      setDirection(position.direction)
      setQuantity(position.quantity?.toString() ?? '')
      setAvgCost(position.avg_cost?.toString() ?? '')
      setNotes(position.notes ?? '')
      setError(''); setSubmitting(false); setDeleting(false); setConfirmDel(false)
      return () => cancelAnimationFrame(id)
    } else {
      setVisible(false)
    }
  }, [isOpen, position])

  // Fetch market data on open
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setDataLoading(true)
    Promise.all([
      fetch(`/api/quote/${encodeURIComponent(position.symbol)}`).then((r) => r.ok ? r.json() : null),
      fetch(`/api/financials/${encodeURIComponent(position.symbol)}`).then((r) => r.ok ? r.json() : null),
    ])
      .then(([q, f]) => { if (!cancelled) { setQuoteData(q); setMetricsData(f?.metrics ?? null) } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setDataLoading(false) })
    return () => { cancelled = true }
  }, [isOpen, position.symbol])

  // Escape key
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) { if (e.key === 'Escape' && !confirmDel) onClose() }
    if (isOpen) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose, confirmDel])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const qty = quantity ? parseFloat(quantity) : null
    const avg = avgCost  ? parseFloat(avgCost)  : null
    if (qty !== null && (isNaN(qty) || qty <= 0)) { setError('Quantity must be greater than 0.'); return }
    if (avg !== null && (isNaN(avg) || avg < 0))  { setError('Average cost must be 0 or greater.'); return }

    setSubmitting(true)
    const ok = await onUpdate(position.id, {
      direction,
      quantity:  qty,
      avg_cost:  avg,
      notes:     notes.trim() || null,
    })
    setSubmitting(false)
    if (ok) onClose()
    else setError('Failed to save. Try again.')
  }

  async function handleDelete() {
    setDeleting(true)
    const ok = await onDelete(position.id)
    setDeleting(false)
    if (ok) onClose()
    else setError('Failed to delete. Try again.')
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={() => { if (!confirmDel) onClose() }}
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
        {!confirmDel && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          >
            <svg viewBox="0 0 14 14" fill="none" className="h-3.5 w-3.5" aria-hidden>
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        <div className="px-6 pt-6 pb-6">
          {/* Header */}
          <div className="mb-5">
            <h2 className="font-mono text-[15px] font-bold text-[var(--text)]">Edit Position</h2>
            <p className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">
              {position.symbol} · {position.asset_type}
            </p>
          </div>

          {/* Asset data snapshot */}
          {!confirmDel && (
            <div className="mb-4 space-y-2">
              <AssetDataSnapshot
                quoteData={quoteData}
                metricsData={metricsData}
                dataLoading={dataLoading}
                assetType={position.asset_type}
              />

              {/* Position P&L card */}
              {quoteData && position.quantity != null && position.avg_cost != null && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-mono text-[8px] uppercase tracking-wide text-[var(--text-muted)]">Your Position</span>
                    <p className="font-mono text-[11px] text-[var(--text)] mt-0.5">
                      {position.quantity} shares @ ${position.avg_cost.toFixed(2)} avg
                    </p>
                  </div>
                  {(() => {
                    const cost    = position.avg_cost
                    const current = quoteData.price
                    const pct     = ((current - cost) / cost) * 100
                    const pnl     = (current - cost) * position.quantity
                    const up      = position.direction === 'long' ? pct >= 0 : pct < 0
                    const color   = up ? 'var(--price-up)' : 'var(--price-down)'
                    const sign    = pnl >= 0 ? '+' : ''
                    return (
                      <div className="text-right shrink-0">
                        <span className="font-mono text-[8px] uppercase tracking-wide text-[var(--text-muted)]">Current</span>
                        <p className="font-mono text-[11px] font-semibold mt-0.5" style={{ color }}>
                          ${current.toFixed(2)} ({sign}{pct.toFixed(2)}%)
                        </p>
                        <p className="font-mono text-[10px] tabular-nums" style={{ color }}>
                          {sign}${Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Delete confirmation overlay */}
          {confirmDel ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 text-center">
                <p className="font-mono text-[13px] font-semibold text-red-400">Delete {position.symbol}?</p>
                <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
                  This cannot be undone.
                </p>
              </div>
              {error && (
                <p className="font-mono text-[11px] text-red-400">{error}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setConfirmDel(false); setError('') }}
                  className="flex-1 rounded-lg border border-[var(--border)] py-2.5 font-mono text-[12px] text-[var(--text-muted)] transition hover:border-[var(--accent)]/30 hover:text-[var(--text)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 py-2.5 font-mono text-[12px] font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  {deleting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-400/30 border-t-red-400" />}
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Direction */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  Direction
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
                  className="no-focus-ring h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 font-mono text-[12px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/50"
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
                  className="no-focus-ring h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 font-mono text-[12px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/50"
                />
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
                  className="no-focus-ring h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 font-mono text-[12px] text-[var(--text)] outline-none transition-all placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/50"
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
                  onClick={() => setConfirmDel(true)}
                  className="rounded-lg border border-red-500/30 px-4 py-2.5 font-mono text-[11px] text-red-400 transition hover:bg-red-500/10"
                >
                  Delete
                </button>
                <div className="flex flex-1 gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-lg border border-[var(--border)] py-2.5 font-mono text-[12px] text-[var(--text-muted)] transition hover:border-[var(--accent)]/30 hover:text-[var(--text)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 font-mono text-[12px] font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {submitting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                    Save
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
