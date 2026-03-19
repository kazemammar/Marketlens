'use client'

import Image from 'next/image'
import { AssetType, AssetCardData } from '@/lib/utils/types'
import { formatPrice, formatChange, formatPercent, changeColor } from '@/lib/utils/formatters'
import WatchlistButton from './WatchlistButton'
import PortfolioButton from './PortfolioButton'
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
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border border-[var(--border)] bg-white p-1">
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
            <h1 className="font-mono text-[22px] font-bold text-[var(--text)]">{symbol}</h1>
            <span className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-[0.1em]">
              {TYPE_LABELS[type]}
            </span>
            {exchange && (
              <span className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[8px] font-bold text-[var(--text-muted)]">
                {exchange}
              </span>
            )}
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-[var(--text-muted)]">
            {name}
            {industry && <span className="ml-2 text-[var(--text-muted)]">· {industry}</span>}
          </p>
        </div>
      </div>

      {/* Right: price + watchlist */}
      <div className="flex flex-col items-start sm:items-end gap-2">
        <p className="font-mono text-[32px] font-bold tabular-nums text-[var(--text)]">
          {formatPrice(price, currency)}
        </p>
        <div className={`flex items-center gap-2 font-mono text-[11px] font-semibold tabular-nums ${color}`}>
          <span>
            {isPositive ? '▲' : '▼'}&nbsp;{formatChange(Math.abs(change))}
          </span>
          <span>({formatPercent(changePercent, false)})</span>
        </div>
        <MarketStatusBadge type={type} />
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-50">
          {type === 'crypto'
            ? 'Binance · near real-time'
            : type === 'forex'
            ? 'ECB reference rate · daily'
            : type === 'commodity'
            ? 'Yahoo Finance · 15min delayed'
            : 'Finnhub · 15min delayed'}
        </span>
        <div className="flex items-center gap-2">
          <PortfolioButton symbol={symbol} type={type} />
          <WatchlistButton symbol={symbol} type={type} />
        </div>
      </div>
    </div>
  )
}
