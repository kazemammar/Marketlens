'use client'

import { useState, useEffect, Fragment } from 'react'
import Link from 'next/link'
import type { PortfolioPosition, PortfolioLot } from '@/lib/hooks/usePortfolio'
import EditPositionModal from './EditPositionModal'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface QuoteData {
  price:         number
  change:        number
  changePercent: number
}

type SortKey = 'symbol' | 'type' | 'direction' | 'changePercent' | 'pnlPct'
type SortDir = 'asc' | 'desc'

// ─── Constants ─────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  stock:     'bg-emerald-500/10 text-emerald-400',
  crypto:    'bg-orange-500/10 text-orange-400',
  forex:     'bg-sky-500/10 text-sky-400',
  commodity: 'bg-amber-500/10 text-amber-400',
  etf:       'bg-purple-500/10 text-purple-400',
}

// ─── Formatters ────────────────────────────────────────────────────────────

function fmtPrice(n: number): string {
  if (n >= 1000)  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (n >= 1)     return n.toFixed(2)
  if (n >= 0.01)  return n.toFixed(4)
  return n.toPrecision(4)
}

function fmtQty(n: number): string {
  const num = Number(n)
  return num % 1 === 0 ? num.toLocaleString('en-US') : num.toFixed(4)
}

function fmtPnl(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${n >= 0 ? '+' : ''}$${(n / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000)     return `${n >= 0 ? '+' : ''}$${(n / 1_000).toFixed(1)}K`
  return `${n >= 0 ? '+' : ''}$${n.toFixed(2)}`
}

function assetHref(type: string, symbol: string): string {
  return `/asset/${type}/${encodeURIComponent(symbol)}`
}

// ─── Sort header ───────────────────────────────────────────────────────────

function SortTh({
  label, sortKey, current, dir, onSort, className = '',
}: {
  label:   string
  sortKey: SortKey
  current: SortKey
  dir:     SortDir
  onSort:  (k: SortKey) => void
  className?: string
}) {
  const active  = current === sortKey
  const isRight = className.includes('text-right')
  return (
    <th
      className={`select-none cursor-pointer px-3 py-2.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] transition-colors hover:text-[var(--text)] ${className || 'text-left'}`}
      onClick={() => onSort(sortKey)}
    >
      <span className={`flex items-center gap-1 ${isRight ? 'justify-end' : ''}`}>
        {label}
        <span className={`transition-opacity ${active ? 'opacity-100' : 'opacity-20'}`}>
          {active && dir === 'asc' ? '▲' : '▼'}
        </span>
      </span>
    </th>
  )
}

// ─── Chevron icon ──────────────────────────────────────────────────────────

function Chevron({ expanded }: { expanded: boolean }) {
  return (
    <svg viewBox="0 0 8 8" fill="none" className="h-2 w-2 shrink-0 transition-transform duration-150"
      style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
      <path d="M2 1l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Lot count badge ───────────────────────────────────────────────────────

function BuysBadge({ count }: { count: number }) {
  if (count <= 1) return null
  return (
    <span className="rounded px-1 py-px font-mono text-[8px] bg-[var(--accent)]/10 text-[var(--accent)]">
      {count} buys
    </span>
  )
}

// ─── Lot row (used in both desktop and mobile) ─────────────────────────────

function LotLine({
  lot,
  onEdit,
  onDelete,
}: {
  lot:       PortfolioLot
  onEdit?:   () => void
  onDelete?: () => void
}) {
  const dateFmt = new Date(lot.date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
  return (
    <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)]/50 py-2 pr-3 pl-8">
      <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-40 shrink-0">└─</span>
      <span className="font-mono text-[11px] text-[var(--text)] shrink-0">
        ${lot.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span className="font-mono text-[9px] text-[var(--text-muted)] shrink-0">at</span>
      <span className="font-mono text-[11px] text-[var(--text)] shrink-0">${lot.price.toFixed(2)}</span>
      <span className="font-mono text-[9px] text-[var(--text-muted)] shrink-0">·</span>
      <span className="font-mono text-[10px] text-[var(--text-muted)] shrink-0">{dateFmt}</span>
      <span className="font-mono text-[9px] text-[var(--text-muted)] shrink-0">·</span>
      <span className="font-mono text-[10px] text-[var(--text-muted)] shrink-0">{lot.quantity.toFixed(4)} units</span>
      {lot.note && (
        <>
          <span className="font-mono text-[9px] text-[var(--text-muted)] shrink-0">·</span>
          <span className="font-mono text-[9px] italic text-[var(--text-muted)] truncate">{lot.note}</span>
        </>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="rounded px-1.5 py-0.5 font-mono text-[9px] text-[var(--text-muted)] transition-colors hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
            title="Edit this purchase"
          >
            edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="rounded px-1.5 py-0.5 font-mono text-[9px] text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-400"
            title="Remove this purchase"
          >
            remove
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Inline lot edit form ───────────────────────────────────────────────────

function LotEditRow({
  lot,
  onSave,
  onCancel,
}: {
  lot:      PortfolioLot
  onSave:   (updated: PortfolioLot) => Promise<boolean>
  onCancel: () => void
}) {
  const [amount,  setAmount]  = useState(lot.amount.toString())
  const [price,   setPrice]   = useState(lot.price.toString())
  const [date,    setDate]    = useState(lot.date)
  const [note,    setNote]    = useState(lot.note ?? '')
  const [saving,  setSaving]  = useState(false)

  const amt = Number(amount)
  const prc = Number(price)
  const derivedQty = amt > 0 && prc > 0 ? (amt / prc).toFixed(4) : '—'

  async function handleSave() {
    if (amt <= 0 || prc <= 0) return
    setSaving(true)
    const updated: PortfolioLot = {
      ...lot,
      amount:   amt,
      price:    prc,
      quantity: amt / prc,
      date:     date || lot.date,
      note:     note.trim() || undefined,
    }
    const ok = await onSave(updated)
    if (!ok) setSaving(false)
  }

  const inputCls = 'rounded border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 font-mono text-[11px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none'

  return (
    <div className="border-b border-[var(--border)] bg-[var(--accent)]/5 py-3 pr-3 pl-8">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block font-mono text-[8px] uppercase text-[var(--text-muted)]">Amount ($)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={`mt-0.5 w-24 ${inputCls}`} />
        </div>
        <div>
          <label className="block font-mono text-[8px] uppercase text-[var(--text-muted)]">Price ($)</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={`mt-0.5 w-24 ${inputCls}`} />
        </div>
        <div>
          <label className="block font-mono text-[8px] uppercase text-[var(--text-muted)]">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`mt-0.5 ${inputCls}`} style={{ colorScheme: 'dark' }} />
        </div>
        <div>
          <label className="block font-mono text-[8px] uppercase text-[var(--text-muted)]">Note</label>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" className={`mt-0.5 w-28 ${inputCls}`} />
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <button
            onClick={handleSave}
            disabled={saving || amt <= 0 || prc <= 0}
            className="rounded bg-[var(--accent)] px-3 py-1.5 font-mono text-[10px] font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={onCancel}
            className="rounded border border-[var(--border)] px-3 py-1.5 font-mono text-[10px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            Cancel
          </button>
          <span className="font-mono text-[9px] text-[var(--text-muted)] opacity-50">
            = {derivedQty} units
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Add more row ──────────────────────────────────────────────────────────

function AddMoreRow({
  position,
  onAddMore,
}: {
  position:  PortfolioPosition
  onAddMore: (p: PortfolioPosition) => void
}) {
  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface-2)]/30 py-1.5 pl-8 pr-3">
      <button
        onClick={(e) => { e.stopPropagation(); onAddMore(position) }}
        className="font-mono text-[9px] text-[var(--accent)] hover:underline"
      >
        + Add another purchase
      </button>
    </div>
  )
}

// ─── Desktop expansion rows ────────────────────────────────────────────────

function LotExpansionRows({
  position,
  editingLotId,
  setEditingLotId,
  onEditLot,
  onDeleteLot,
  onAddMore,
}: {
  position:        PortfolioPosition
  editingLotId:    string | null
  setEditingLotId: (id: string | null) => void
  onEditLot?:      (positionId: string, updatedLot: PortfolioLot) => Promise<boolean>
  onDeleteLot?:    (positionId: string, lotId: string) => Promise<boolean>
  onAddMore?:      (position: PortfolioPosition) => void
}) {
  const lots = [...(position.lots ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  return (
    <tr>
      <td colSpan={11} className="p-0">
        {lots.map((lot) => (
          editingLotId === lot.id ? (
            <LotEditRow
              key={lot.id}
              lot={lot}
              onSave={async (updated) => {
                const ok = await onEditLot?.(position.id, updated)
                if (ok) setEditingLotId(null)
                return ok ?? false
              }}
              onCancel={() => setEditingLotId(null)}
            />
          ) : (
            <LotLine
              key={lot.id}
              lot={lot}
              onEdit={onEditLot ? () => setEditingLotId(lot.id) : undefined}
              onDelete={onDeleteLot ? () => onDeleteLot(position.id, lot.id) : undefined}
            />
          )
        ))}
        {onAddMore && <AddMoreRow position={position} onAddMore={onAddMore} />}
      </td>
    </tr>
  )
}

// ─── Desktop table row ─────────────────────────────────────────────────────

function DesktopRow({
  position,
  quote,
  isExpanded,
  onEdit,
  onToggleExpand,
}: {
  position:       PortfolioPosition
  quote:          QuoteData | undefined
  isExpanded:     boolean
  onEdit:         (p: PortfolioPosition) => void
  onToggleExpand: (id: string) => void
}) {
  const hasLots  = (position.lots?.length ?? 0) > 0
  const hasPrice = !!quote
  const hasData  = position.quantity != null && position.avg_cost != null && hasPrice

  const marketValue = hasData ? position.quantity! * quote!.price : null
  const costBasis   = hasData ? position.quantity! * position.avg_cost! : null
  const rawPnl      = hasData
    ? position.direction === 'long' ? marketValue! - costBasis! : costBasis! - marketValue!
    : null
  const pnlPct = hasData && position.avg_cost! > 0
    ? position.direction === 'long'
      ? ((quote!.price - position.avg_cost!) / position.avg_cost!) * 100
      : ((position.avg_cost! - quote!.price) / position.avg_cost!) * 100
    : null

  const pnlColor    = rawPnl === null ? undefined : rawPnl >= 0 ? 'var(--price-up)' : 'var(--price-down)'
  const changeColor = !quote ? undefined : quote.changePercent >= 0 ? 'var(--price-up)' : 'var(--price-down)'

  return (
    <tr
      className={`group border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-2)] ${hasLots ? 'cursor-pointer' : ''}`}
      onClick={(e) => {
        if (!hasLots) return
        const t = e.target as HTMLElement
        if (t.closest('a') || t.closest('button')) return
        onToggleExpand(position.id)
      }}
    >
      {/* Symbol + chevron */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          {hasLots ? (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand(position.id) }}
              className="text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
              aria-label={isExpanded ? 'Collapse lots' : 'Expand lots'}
            >
              <Chevron expanded={isExpanded} />
            </button>
          ) : (
            <span className="w-2 shrink-0" />
          )}
          <Link
            href={assetHref(position.asset_type, position.symbol)}
            className="font-mono text-[12px] font-bold text-[var(--accent)] transition hover:underline"
          >
            {position.symbol}
          </Link>
          <BuysBadge count={position.lots?.length ?? 0} />
        </div>
      </td>

      {/* Type */}
      <td className="px-3 py-2.5">
        <span className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${TYPE_COLORS[position.asset_type] ?? 'bg-zinc-800 text-zinc-400'}`}>
          {position.asset_type}
        </span>
      </td>

      {/* Direction */}
      <td className="px-3 py-2.5">
        <span className={`font-mono text-[10px] font-semibold uppercase ${position.direction === 'long' ? 'text-emerald-400' : 'text-red-400'}`}>
          {position.direction === 'long' ? '▲ Long' : '▼ Short'}
        </span>
      </td>

      {/* Price */}
      <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-[var(--text)]">
        {hasPrice ? `$${fmtPrice(quote!.price)}` : <span className="text-[var(--text-muted)]">—</span>}
      </td>

      {/* Day change */}
      <td className="px-3 py-2.5 font-mono text-[11px] tabular-nums" style={{ color: changeColor }}>
        {quote
          ? `${quote.changePercent >= 0 ? '▲' : '▼'} ${Math.abs(quote.changePercent).toFixed(2)}%`
          : <span className="text-[var(--text-muted)]">—</span>
        }
      </td>

      {/* Qty */}
      <td className="px-3 py-2.5 text-right font-mono text-[11px] tabular-nums text-[var(--text)]">
        {position.quantity != null
          ? fmtQty(position.quantity)
          : (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(position) }}
              className="font-mono text-[10px] text-[var(--text-muted)] opacity-60 hover:text-[var(--accent)] hover:opacity-100"
            >
              + Add
            </button>
          )
        }
      </td>

      {/* Avg cost */}
      <td className="px-3 py-2.5 text-right font-mono text-[11px] tabular-nums text-[var(--text)]">
        {position.avg_cost != null
          ? `$${fmtPrice(position.avg_cost)}`
          : (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(position) }}
              className="font-mono text-[10px] text-[var(--text-muted)] opacity-60 hover:text-[var(--accent)] hover:opacity-100"
            >
              + Add
            </button>
          )
        }
      </td>

      {/* Market value */}
      <td className="px-3 py-2.5 text-right font-mono text-[11px] tabular-nums text-[var(--text)]">
        {marketValue != null ? `$${fmtPrice(marketValue)}` : <span className="text-[var(--text-muted)] opacity-50">—</span>}
      </td>

      {/* P&L $ */}
      <td className="px-3 py-2.5 pr-2 text-right font-mono text-[11px] tabular-nums" style={{ color: pnlColor }}>
        {rawPnl != null ? fmtPnl(rawPnl) : <span className="text-[var(--text-muted)] opacity-50">—</span>}
      </td>

      {/* P&L % */}
      <td className="px-3 py-2.5 pr-6 text-right font-mono text-[11px] tabular-nums min-w-[80px]" style={{ color: pnlColor }}>
        {pnlPct != null
          ? `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`
          : <span className="text-[var(--text-muted)] opacity-50">—</span>
        }
      </td>

      {/* Edit */}
      <td className="px-3 py-2.5">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(position) }}
          aria-label={`Edit ${position.symbol}`}
          className="flex h-6 w-6 items-center justify-center rounded font-mono text-[10px] text-[var(--text-muted)] opacity-0 transition-all hover:bg-[var(--surface)] hover:text-[var(--text)] group-hover:opacity-100 focus:opacity-100"
        >
          ⋮
        </button>
      </td>
    </tr>
  )
}

// ─── Mobile card ───────────────────────────────────────────────────────────

function MobileCard({
  position,
  quote,
  isExpanded,
  onEdit,
  onToggleExpand,
  editingLotId,
  setEditingLotId,
  onEditLot,
  onDeleteLot,
  onAddMore,
}: {
  position:        PortfolioPosition
  quote:           QuoteData | undefined
  isExpanded:      boolean
  onEdit:          (p: PortfolioPosition) => void
  onToggleExpand:  (id: string) => void
  editingLotId:    string | null
  setEditingLotId: (id: string | null) => void
  onEditLot?:      (positionId: string, updatedLot: PortfolioLot) => Promise<boolean>
  onDeleteLot?:    (positionId: string, lotId: string) => Promise<boolean>
  onAddMore?:      (position: PortfolioPosition) => void
}) {
  const hasLots     = (position.lots?.length ?? 0) > 0
  const changeColor = !quote ? undefined : quote.changePercent >= 0 ? 'var(--price-up)' : 'var(--price-down)'
  const lots        = [...(position.lots ?? [])].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="border-b border-[var(--border)]">
      {/* Main card row */}
      <div
        className={`flex items-center gap-2 px-3 py-3 transition-colors hover:bg-[var(--surface-2)] ${hasLots ? 'cursor-pointer' : ''}`}
        onClick={(e) => {
          if (!hasLots) return
          const t = e.target as HTMLElement
          if (t.closest('a') || t.closest('button')) return
          onToggleExpand(position.id)
        }}
      >
        {/* Chevron */}
        {hasLots ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(position.id) }}
            className="shrink-0 text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
            aria-label={isExpanded ? 'Collapse lots' : 'Expand lots'}
          >
            <Chevron expanded={isExpanded} />
          </button>
        ) : (
          <span className="w-2 shrink-0" />
        )}

        {/* Left: symbol + type */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={assetHref(position.asset_type, position.symbol)}
              className="font-mono text-[13px] font-bold text-[var(--accent)] hover:underline"
            >
              {position.symbol}
            </Link>
            <span className={`rounded px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase ${TYPE_COLORS[position.asset_type] ?? 'bg-zinc-800 text-zinc-400'}`}>
              {position.asset_type}
            </span>
            <span className={`font-mono text-[9px] font-semibold uppercase ${position.direction === 'long' ? 'text-emerald-400' : 'text-red-400'}`}>
              {position.direction === 'long' ? '▲ L' : '▼ S'}
            </span>
            <BuysBadge count={position.lots?.length ?? 0} />
          </div>
          {position.notes && (
            <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--text-muted)] opacity-60">{position.notes}</p>
          )}
        </div>

        {/* Right: price + change */}
        <div className="shrink-0 text-right">
          <p className="font-mono text-[12px] tabular-nums text-[var(--text)]">
            {quote ? `$${fmtPrice(quote.price)}` : <span className="text-[var(--text-muted)]">—</span>}
          </p>
          <p className="font-mono text-[10px] tabular-nums" style={{ color: changeColor }}>
            {quote ? `${quote.changePercent >= 0 ? '▲' : '▼'} ${Math.abs(quote.changePercent).toFixed(2)}%` : null}
          </p>
        </div>

        {/* Edit button */}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(position) }}
          aria-label={`Edit ${position.symbol}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[var(--border)] font-mono text-[11px] text-[var(--text-muted)] transition hover:border-[var(--accent)]/30 hover:text-[var(--text)]"
        >
          ⋮
        </button>
      </div>

      {/* Lot expansion (mobile) */}
      {isExpanded && lots.length > 0 && (
        <div>
          {lots.map((lot) => (
            editingLotId === lot.id ? (
              <LotEditRow
                key={lot.id}
                lot={lot}
                onSave={async (updated) => {
                  const ok = await onEditLot?.(position.id, updated)
                  if (ok) setEditingLotId(null)
                  return ok ?? false
                }}
                onCancel={() => setEditingLotId(null)}
              />
            ) : (
              <LotLine
                key={lot.id}
                lot={lot}
                onEdit={onEditLot ? () => setEditingLotId(lot.id) : undefined}
                onDelete={onDeleteLot ? () => onDeleteLot(position.id, lot.id) : undefined}
              />
            )
          ))}
          {onAddMore && <AddMoreRow position={position} onAddMore={onAddMore} />}
        </div>
      )}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export default function PositionsTable({
  positions,
  quotes,
  onUpdate,
  onDelete,
  onDeleteLot,
  onEditLot,
  onAddMore,
}: {
  positions:    PortfolioPosition[]
  quotes:       Record<string, QuoteData>
  onUpdate:     (id: string, updates: Partial<{ direction: 'long' | 'short'; quantity: number | null; avg_cost: number | null; notes: string | null }>) => Promise<boolean>
  onDelete:     (id: string) => Promise<boolean>
  onDeleteLot?: (positionId: string, lotId: string) => Promise<boolean>
  onEditLot?:   (positionId: string, updatedLot: PortfolioLot) => Promise<boolean>
  onAddMore?:   (position: PortfolioPosition) => void
}) {
  const [sortKey,      setSortKey]      = useState<SortKey>('symbol')
  const [sortDir,      setSortDir]      = useState<SortDir>('asc')
  const [editPos,      setEditPos]      = useState<PortfolioPosition | null>(null)
  const [expandedIds,  setExpandedIds]  = useState<Set<string>>(new Set())
  const [editingLotId, setEditingLotId] = useState<string | null>(null)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function pnlPct(p: PortfolioPosition): number {
    const q = quotes[p.symbol]
    if (!q || p.quantity == null || p.avg_cost == null || p.avg_cost === 0) return 0
    return p.direction === 'long'
      ? ((q.price - p.avg_cost) / p.avg_cost) * 100
      : ((p.avg_cost - q.price) / p.avg_cost) * 100
  }

  const sorted = [...positions].sort((a, b) => {
    let cmp = 0
    switch (sortKey) {
      case 'symbol':        cmp = a.symbol.localeCompare(b.symbol); break
      case 'type':          cmp = a.asset_type.localeCompare(b.asset_type); break
      case 'direction':     cmp = a.direction.localeCompare(b.direction); break
      case 'changePercent': cmp = (quotes[a.symbol]?.changePercent ?? 0) - (quotes[b.symbol]?.changePercent ?? 0); break
      case 'pnlPct':        cmp = pnlPct(a) - pnlPct(b); break
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <SortTh label="Symbol"    sortKey="symbol"        current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Type"      sortKey="type"          current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Direction" sortKey="direction"     current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-3 py-2.5 text-left font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Price</th>
              <SortTh label="Day %"     sortKey="changePercent" current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-3 py-2.5 text-right font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Qty</th>
              <th className="px-3 py-2.5 text-right font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Avg Cost</th>
              <th className="px-3 py-2.5 text-right font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Mkt Value</th>
              <th className="px-3 py-2.5 pr-2 text-right font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">P&amp;L $</th>
              <SortTh label="P&L %" sortKey="pnlPct" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right pr-6 min-w-[80px]" />
              <th className="w-10 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <Fragment key={p.id}>
                <DesktopRow
                  position={p}
                  quote={quotes[p.symbol]}
                  isExpanded={expandedIds.has(p.id)}
                  onEdit={setEditPos}
                  onToggleExpand={toggleExpand}
                />
                {expandedIds.has(p.id) && (p.lots?.length ?? 0) > 0 && (
                  <LotExpansionRows
                    position={p}
                    editingLotId={editingLotId}
                    setEditingLotId={setEditingLotId}
                    onEditLot={onEditLot}
                    onDeleteLot={onDeleteLot}
                    onAddMore={onAddMore}
                  />
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden">
        {sorted.map((p) => (
          <MobileCard
            key={p.id}
            position={p}
            quote={quotes[p.symbol]}
            isExpanded={expandedIds.has(p.id)}
            onEdit={setEditPos}
            onToggleExpand={toggleExpand}
            editingLotId={editingLotId}
            setEditingLotId={setEditingLotId}
            onEditLot={onEditLot}
            onDeleteLot={onDeleteLot}
            onAddMore={onAddMore}
          />
        ))}
      </div>

      {/* Edit modal */}
      {editPos && (
        <EditPositionModal
          isOpen={!!editPos}
          onClose={() => setEditPos(null)}
          position={editPos}
          onUpdate={async (id, updates) => {
            const ok = await onUpdate(id, updates)
            if (ok) setEditPos(null)
            return ok
          }}
          onDelete={async (id) => {
            const ok = await onDelete(id)
            if (ok) setEditPos(null)
            return ok
          }}
        />
      )}
    </>
  )
}
