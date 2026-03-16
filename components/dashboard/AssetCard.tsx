import Link from 'next/link'
import { AssetCardData, AssetType } from '@/lib/utils/types'
import { formatPrice, formatChange, formatPercent, changeColor } from '@/lib/utils/formatters'

// Re-export so any file that still imports AssetCardData from here keeps working
export type { AssetCardData }

// ─── Sparkline ────────────────────────────────────────────────────────────

function Sparkline({
  open, high, low, price, isPositive,
}: {
  open: number; high: number; low: number; price: number; isPositive: boolean
}) {
  const W = 80, H = 32, PAD = 3

  // 5 OHLC-derived points that sketch the day's movement
  const pts: number[] = isPositive
    ? [open, (open + low) / 2,  low,  (low  + price) / 2, price]
    : [open, (open + high) / 2, high, (high + price) / 2, price]

  const min   = Math.min(...pts)
  const max   = Math.max(...pts)
  const range = max - min || 1

  const coords = pts.map((v, i) => ({
    x: PAD + (i / (pts.length - 1)) * (W - 2 * PAD),
    y: PAD + (1 - (v - min) / range) * (H - 2 * PAD),
  }))

  let d = `M ${coords[0].x},${coords[0].y}`
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1]
    const cur  = coords[i]
    const cpx  = (prev.x + cur.x) / 2
    d += ` C ${cpx},${prev.y} ${cpx},${cur.y} ${cur.x},${cur.y}`
  }

  const fillD = `${d} L ${coords[coords.length - 1].x},${H} L ${coords[0].x},${H} Z`
  const stroke = isPositive ? '#22c55e' : '#ef4444'
  const fill   = isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="shrink-0" aria-hidden>
      <path d={fillD} fill={fill} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<AssetType, string> = {
  stock: 'Stock', crypto: 'Crypto', forex: 'Forex', commodity: 'Commodity', etf: 'ETF',
}

export default function AssetCard({ asset }: { asset: AssetCardData }) {
  const { symbol, name, type, price, change, changePercent, currency, open, high, low } = asset
  const isPositive = change >= 0
  const color      = changeColor(change)
  const href       = `/asset/${type}/${encodeURIComponent(symbol)}`

  return (
    <Link
      href={href}
      className="
        group flex flex-col gap-3 rounded-xl border border-[var(--border)]
        bg-[var(--surface)] p-4 transition animate-fade-up
        hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5
      "
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-[var(--text)]">{symbol}</span>
            <span className="shrink-0 rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wide">
              {TYPE_LABELS[type]}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{name}</p>
        </div>
        <Sparkline open={open} high={high} low={low} price={price} isPositive={isPositive} />
      </div>

      <div className="flex items-end justify-between">
        <p className="text-lg font-semibold font-mono text-[var(--text)] tabular-nums">
          {formatPrice(price, currency)}
        </p>
        <div className={`flex flex-col items-end text-xs font-mono font-medium tabular-nums ${color}`}>
          <span>{formatChange(change, 2)}</span>
          <span>{formatPercent(changePercent, false)}</span>
        </div>
      </div>
    </Link>
  )
}
