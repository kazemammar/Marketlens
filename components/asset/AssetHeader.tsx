import Image from 'next/image'
import { AssetType, AssetCardData } from '@/lib/utils/types'
import { formatPrice, formatChange, formatPercent, changeColor } from '@/lib/utils/formatters'
import WatchlistButton from './WatchlistButton'
import MarketStatusBadge from './MarketStatusBadge'

const TYPE_LABELS: Record<AssetType, string> = {
  stock: 'Stock', crypto: 'Crypto', forex: 'Forex', commodity: 'Commodity', etf: 'ETF',
}

interface AssetHeaderProps {
  asset:    AssetCardData
  logoUrl?: string
  exchange?: string
  industry?: string
}

export default function AssetHeader({ asset, logoUrl, exchange, industry }: AssetHeaderProps) {
  const { symbol, name, type, price, change, changePercent, currency } = asset
  const color      = changeColor(change)
  const isPositive = change >= 0

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      {/* Left: logo + identity */}
      <div className="flex items-center gap-4">
        {logoUrl && (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[var(--border)] bg-white p-1">
            <Image
              src={logoUrl}
              alt={`${name} logo`}
              fill
              className="object-contain"
              unoptimized
            />
          </div>
        )}

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text)]">{symbol}</h1>
            <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
              {TYPE_LABELS[type]}
            </span>
            {exchange && (
              <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                {exchange}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {name}
            {industry && <span className="ml-2 text-[var(--text-muted)]">· {industry}</span>}
          </p>
        </div>
      </div>

      {/* Right: price + watchlist */}
      <div className="flex flex-col items-start sm:items-end gap-2">
        <p className="text-4xl font-bold font-mono tabular-nums text-[var(--text)]">
          {formatPrice(price, currency)}
        </p>
        <div className={`flex items-center gap-2 text-sm font-mono font-medium tabular-nums ${color}`}>
          <span>
            {isPositive ? '▲' : '▼'}&nbsp;{formatChange(Math.abs(change))}
          </span>
          <span>({formatPercent(changePercent, false)})</span>
        </div>
        <MarketStatusBadge type={type} />
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">15min delayed</span>
        <WatchlistButton symbol={symbol} type={type} />
      </div>
    </div>
  )
}
