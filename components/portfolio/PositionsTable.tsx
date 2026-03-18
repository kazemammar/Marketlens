'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PortfolioPosition } from '@/lib/hooks/usePortfolio'
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

// ─── Asset link ────────────────────────────────────────────────────────────

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
  const active = current === sortKey
  return (
    <th
      className={`select-none cursor-pointer px-3 py-2.5 text-left font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)] transition-colors hover:text-[var(--text)] ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="flex items-center gap-1">
        {label}
        <span className={`transition-opacity ${active ? 'opacity-100' : 'opacity-20'}`}>
          {active && dir === 'asc' ? '▲' : '▼'}
        </span>
      </span>
    </th>
  )
}

// ─── Desktop table row ─────────────────────────────────────────────────────

function DesktopRow({
  position,
  quote,
  onEdit,
}: {
  position: PortfolioPosition
  quote:    QuoteData | undefined
  onEdit:   (p: PortfolioPosition) => void
}) {
  const hasPrice = !!quote
  const hasData  = position.quantity != null && position.avg_cost != null && hasPrice

  const marketValue = hasData ? position.quantity! * quote!.price : null
  const costBasis   = hasData ? position.quantity! * position.avg_cost! : null
  const rawPnl      = hasData
    ? position.direction === 'long'
      ? marketValue! - costBasis!
      : costBasis! - marketValue!
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
      className="group border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-2)]"
    >
      {/* Symbol */}
      <td className="px-3 py-2.5">
        <Link
          href={assetHref(position.asset_type, position.symbol)}
          className="font-mono text-[12px] font-bold text-[var(--accent)] transition hover:underline"
        >
          {position.symbol}
        </Link>
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
              onClick={() => onEdit(position)}
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
              onClick={() => onEdit(position)}
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
      <td className="px-3 py-2.5 text-right font-mono text-[11px] tabular-nums" style={{ color: pnlColor }}>
        {rawPnl != null ? fmtPnl(rawPnl) : <span className="text-[var(--text-muted)] opacity-50">—</span>}
      </td>

      {/* P&L % */}
      <td className="px-3 py-2.5 text-right font-mono text-[11px] tabular-nums" style={{ color: pnlColor }}>
        {pnlPct != null
          ? `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`
          : <span className="text-[var(--text-muted)] opacity-50">—</span>
        }
      </td>

      {/* Edit button */}
      <td className="px-3 py-2.5">
        <button
          onClick={() => onEdit(position)}
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
  onEdit,
}: {
  position: PortfolioPosition
  quote:    QuoteData | undefined
  onEdit:   (p: PortfolioPosition) => void
}) {
  const changeColor = !quote ? undefined : quote.changePercent >= 0 ? 'var(--price-up)' : 'var(--price-down)'

  return (
    <div className="flex items-center gap-3 border-b border-[var(--border)] px-3 py-3 transition-colors hover:bg-[var(--surface-2)]">
      {/* Left: symbol + type */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
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
        </div>
        {position.notes && (
          <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--text-muted)] opacity-60">{position.notes}</p>
        )}
      </div>

      {/* Right: price + change */}
      <div className="text-right">
        <p className="font-mono text-[12px] tabular-nums text-[var(--text)]">
          {quote ? `$${fmtPrice(quote.price)}` : <span className="text-[var(--text-muted)]">—</span>}
        </p>
        <p className="font-mono text-[10px] tabular-nums" style={{ color: changeColor }}>
          {quote
            ? `${quote.changePercent >= 0 ? '▲' : '▼'} ${Math.abs(quote.changePercent).toFixed(2)}%`
            : null
          }
        </p>
      </div>

      {/* Edit button */}
      <button
        onClick={() => onEdit(position)}
        aria-label={`Edit ${position.symbol}`}
        className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded border border-[var(--border)] font-mono text-[11px] text-[var(--text-muted)] transition hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
      >
        ⋮
      </button>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────

export default function PositionsTable({
  positions,
  quotes,
  onUpdate,
  onDelete,
}: {
  positions: PortfolioPosition[]
  quotes:    Record<string, QuoteData>
  onUpdate:  (id: string, updates: Partial<{ direction: 'long' | 'short'; quantity: number | null; avg_cost: number | null; notes: string | null }>) => Promise<boolean>
  onDelete:  (id: string) => Promise<boolean>
}) {
  const [sortKey, setSortKey] = useState<SortKey>('symbol')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [editPos, setEditPos] = useState<PortfolioPosition | null>(null)

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
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
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              <SortTh label="Symbol"     sortKey="symbol"        current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Type"       sortKey="type"          current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortTh label="Direction"  sortKey="direction"     current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-3 py-2.5 text-left font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Price</th>
              <SortTh label="Day %"      sortKey="changePercent" current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-3 py-2.5 text-right font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Qty</th>
              <th className="px-3 py-2.5 text-right font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Avg Cost</th>
              <th className="px-3 py-2.5 text-right font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">Mkt Value</th>
              <th className="px-3 py-2.5 text-right font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--text-muted)]">P&amp;L $</th>
              <SortTh label="P&L %" sortKey="pnlPct" current={sortKey} dir={sortDir} onSort={handleSort} className="text-right" />
              <th className="w-10 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <DesktopRow
                key={p.id}
                position={p}
                quote={quotes[p.symbol]}
                onEdit={setEditPos}
              />
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
            onEdit={setEditPos}
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
