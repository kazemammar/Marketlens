'use client'

import { useFetch } from '@/lib/hooks/useFetch'
import { formatPrice, formatPercent } from '@/lib/utils/formatters'
import type { CommodityStripResponse } from '@/app/api/commodities-strip/route'
import type { AssetCardData } from '@/lib/utils/types'

// Pairs to show — symbol must match exactly what /api/market?tab=forex returns
const DISPLAY_PAIRS = [
  { symbol: 'EUR/USD', invert: true },   // EUR/USD down → dollar up
  { symbol: 'GBP/USD', invert: true },   // GBP/USD down → dollar up
  { symbol: 'USD/JPY', invert: false },  // USD/JPY up → dollar up
  { symbol: 'USD/CHF', invert: false },  // USD/CHF up → dollar up
  { symbol: 'AUD/USD', invert: true },   // AUD/USD down → dollar up
  { symbol: 'USD/CAD', invert: false },  // USD/CAD up → dollar up
]

export default function DollarIndex() {
  const { data: stripData } = useFetch<CommodityStripResponse>(
    '/api/commodities-strip',
    { refreshInterval: 5 * 60_000 },
  )
  const { data: fxPairs } = useFetch<AssetCardData[]>(
    '/api/market?tab=forex',
    { refreshInterval: 5 * 60_000 },
  )

  const dxy = stripData?.items?.find(i => i.symbol === 'DX-Y.NYB')
  const isUp = dxy ? dxy.change >= 0 : null

  return (
    <div className="rounded border border-[var(--border)] bg-[var(--surface)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" style={{ color: 'var(--accent)' }} aria-hidden>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
          <text x="8" y="11" textAnchor="middle" fill="currentColor" fontSize="8" fontWeight="bold">$</text>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          US Dollar Index
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-[var(--border)] to-transparent" />
        {isUp !== null && (
          <span
            className="font-mono text-[9px] font-bold"
            style={{ color: isUp ? 'var(--price-up)' : 'var(--price-down)' }}
          >
            {isUp ? 'STRENGTHENING' : 'WEAKENING'}
          </span>
        )}
      </div>

      <div className="px-3 py-2 space-y-2">
        {/* DXY price row */}
        {dxy ? (
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-lg font-bold tabular-nums text-[var(--text)]">
              {formatPrice(dxy.price, 'USD')}
            </span>
            <span
              className="font-mono text-sm font-semibold tabular-nums"
              style={{ color: dxy.change >= 0 ? 'var(--price-up)' : 'var(--price-down)' }}
            >
              {dxy.change >= 0 ? '+' : ''}{dxy.change.toFixed(2)}
            </span>
            <span
              className="font-mono text-sm font-semibold tabular-nums"
              style={{ color: dxy.changePercent >= 0 ? 'var(--price-up)' : 'var(--price-down)' }}
            >
              {formatPercent(dxy.changePercent, false)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="skeleton h-5 w-24 rounded" />
            <div className="skeleton h-4 w-16 rounded" />
          </div>
        )}

        {/* Interpretation */}
        <p className="font-mono text-[10px] text-[var(--text-muted)]">
          {isUp === null
            ? 'Loading dollar index…'
            : isUp
              ? 'Dollar strengthening — risk-off signal'
              : 'Dollar weakening — risk appetite rising'}
        </p>

        {/* Currency pair grid — same data as FX Monitor, colored by USD performance */}
        {fxPairs ? (
          <div className="grid grid-cols-3 gap-x-3 gap-y-1 sm:grid-cols-6">
            {DISPLAY_PAIRS.map(({ symbol, invert }) => {
              const pair = fxPairs.find(p => p.symbol === symbol)
              if (!pair) return null
              // Display the actual pair change (identical to FX Monitor)
              const chg = pair.changePercent
              // Color based on whether the dollar is strengthening vs this pair:
              //   EUR/USD down → dollar up → green   (invert=true:  dollar strong when chg < 0)
              //   USD/JPY up   → dollar up → green   (invert=false: dollar strong when chg > 0)
              const dollarStrong = invert ? chg <= 0 : chg >= 0
              return (
                <div key={symbol} className="flex flex-col items-center rounded px-1.5 py-1 bg-[var(--surface-2)]">
                  <span className="font-mono text-[9px] font-bold text-[var(--text-muted)]">{symbol}</span>
                  <span
                    className="font-mono text-[11px] font-bold tabular-nums"
                    style={{ color: dollarStrong ? 'var(--price-up)' : 'var(--price-down)' }}
                  >
                    {chg >= 0 ? '+' : ''}{chg.toFixed(2)}%
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-x-3 gap-y-1 sm:grid-cols-6">
            {DISPLAY_PAIRS.map(({ symbol }) => (
              <div key={symbol} className="flex flex-col items-center rounded px-1.5 py-1.5 bg-[var(--surface-2)]">
                <div className="skeleton h-2 w-10 rounded" />
                <div className="skeleton mt-1 h-3 w-8 rounded" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
