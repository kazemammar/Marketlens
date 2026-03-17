import Link from 'next/link'
import { AssetCardData } from '@/lib/utils/types'
import { formatPrice, formatPercent } from '@/lib/utils/formatters'

export type { AssetCardData }

// ─── Sparkline ────────────────────────────────────────────────────────────

// Renders either real historical closes (sparkline array) or a synthetic
// OHLC curve when no history is available.
function Sparkline({
  open, high, low, price, isPositive, gradientId, sparkline,
}: {
  open: number; high: number; low: number; price: number
  isPositive: boolean; gradientId: string; sparkline?: number[]
}) {
  const W = 72, H = 28, PAD = 2

  // Build the point array: prefer real history, fall back to OHLC synthetic
  const pts: number[] = (sparkline && sparkline.length >= 3)
    ? sparkline
    : isPositive
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

  const fillD     = `${d} L ${coords[coords.length - 1].x},${H} L ${coords[0].x},${H} Z`
  const stroke    = isPositive ? '#00ff88' : '#ff4444'
  const stopColor = isPositive ? '#00ff88' : '#ff4444'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="shrink-0" aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stopColor} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stopColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradientId})`} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────

export default function AssetCard({ asset }: { asset: AssetCardData }) {
  const { symbol, name, type, price, change, changePercent, currency, open, high, low, sparkline } = asset
  const isPositive = change >= 0
  const chgColor   = changePercent === 0 ? 'var(--price-flat)' : isPositive ? 'var(--price-up)' : 'var(--price-down)'
  const href       = `/asset/${type}/${encodeURIComponent(symbol)}`
  const gradientId = `sg-${symbol.replace(/[^a-z0-9]/gi, '')}-${type}`

  return (
    <Link
      href={href}
      className="asset-card group relative flex flex-col gap-2.5 rounded-lg bg-[var(--surface)] p-3.5 transition-all duration-200 animate-fade-up"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block truncate font-mono font-bold text-white" style={{ fontSize: '15px' }}>
            {symbol}
          </span>
          <p className="mt-0.5 truncate text-[11px]" style={{ color: '#888888' }}>{name}</p>
        </div>
        <Sparkline
          open={open} high={high} low={low} price={price}
          isPositive={isPositive} gradientId={gradientId} sparkline={sparkline}
        />
      </div>

      <div className="flex items-end justify-between">
        <p className="font-mono font-bold tabular-nums text-white" style={{ fontSize: '18px' }}>
          {formatPrice(price, currency)}
        </p>
        <div className="flex items-center gap-1 font-mono text-[12px] font-semibold tabular-nums" style={{ color: chgColor }}>
          <span className="text-[10px] leading-none">{isPositive ? '▲' : '▼'}</span>
          <span>{formatPercent(changePercent, false)}</span>
        </div>
      </div>
    </Link>
  )
}
