'use client'

interface QuoteData {
  price:         number
  change:        number
  changePercent: number
  high:          number
  low:           number
  open:          number
}

interface MetricsData {
  week52High:    number | null
  week52Low:     number | null
  marketCap:     number | null
  peRatio:       number | null
  dividendYield: number | null
}

function fmtMarketCap(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}T`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}B`
  return `$${v.toFixed(0)}M`
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n))
}

export default function AssetDataSnapshot({
  quoteData,
  metricsData,
  dataLoading,
  assetType,
}: {
  quoteData:   QuoteData   | null
  metricsData: MetricsData | null
  dataLoading: boolean
  assetType:   string
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 space-y-2">
      {dataLoading ? (
        <div className="flex items-center gap-2">
          <div className="h-6 w-20 animate-pulse rounded bg-[var(--surface-3)]" />
          <div className="h-4 w-16 animate-pulse rounded bg-[var(--surface-3)]" />
        </div>
      ) : quoteData ? (
        <>
          {/* Price + change */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[18px] font-bold tabular-nums text-[var(--text)]">
                ${quoteData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className="font-mono text-[12px] font-semibold tabular-nums"
                style={{ color: quoteData.changePercent >= 0 ? 'var(--price-up)' : 'var(--price-down)' }}
              >
                {quoteData.changePercent >= 0 ? '▲' : '▼'} {Math.abs(quoteData.changePercent).toFixed(2)}%
              </span>
            </div>
            <span className="font-mono text-[9px] text-[var(--text-muted)]">
              {assetType.toUpperCase()}
            </span>
          </div>

          {/* Day range bar */}
          {quoteData.low > 0 && quoteData.high > quoteData.low && (
            <div>
              <span className="font-mono text-[9px] text-[var(--text-muted)]">Day Range</span>
              <div className="relative mt-1 h-1.5 w-full rounded-full bg-[var(--surface-3)]">
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-2.5 w-0.5 rounded-full bg-[var(--accent)]"
                  style={{ left: `${clamp(((quoteData.price - quoteData.low) / (quoteData.high - quoteData.low)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="font-mono text-[9px] tabular-nums text-[var(--text-muted)]">${quoteData.low.toFixed(2)}</span>
                <span className="font-mono text-[9px] tabular-nums text-[var(--text-muted)]">${quoteData.high.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* 52-week range bar */}
          {metricsData?.week52High && metricsData?.week52Low && metricsData.week52High > metricsData.week52Low && (
            <div>
              <span className="font-mono text-[9px] text-[var(--text-muted)]">52W Range</span>
              <div className="relative mt-1 h-1.5 w-full rounded-full bg-[var(--surface-3)]">
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-2.5 w-0.5 rounded-full"
                  style={{
                    left:       `${clamp(((quoteData.price - metricsData.week52Low) / (metricsData.week52High - metricsData.week52Low)) * 100)}%`,
                    background: 'var(--warning, #f59e0b)',
                  }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="font-mono text-[9px] tabular-nums text-[var(--text-muted)]">${metricsData.week52Low.toFixed(2)}</span>
                <span className="font-mono text-[9px] tabular-nums text-[var(--text-muted)]">${metricsData.week52High.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Key metrics row */}
          {metricsData && (metricsData.marketCap != null || metricsData.peRatio != null || (metricsData.dividendYield != null && metricsData.dividendYield > 0)) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1.5 border-t border-[var(--border)]">
              {metricsData.marketCap != null && (
                <div>
                  <span className="font-mono text-[8px] uppercase text-[var(--text-muted)]">Mkt Cap </span>
                  <span className="font-mono text-[10px] tabular-nums text-[var(--text)]">{fmtMarketCap(metricsData.marketCap)}</span>
                </div>
              )}
              {metricsData.peRatio != null && (
                <div>
                  <span className="font-mono text-[8px] uppercase text-[var(--text-muted)]">P/E </span>
                  <span className="font-mono text-[10px] tabular-nums text-[var(--text)]">{metricsData.peRatio.toFixed(1)}</span>
                </div>
              )}
              {metricsData.dividendYield != null && metricsData.dividendYield > 0 && (
                <div>
                  <span className="font-mono text-[8px] uppercase text-[var(--text-muted)]">Div </span>
                  <span className="font-mono text-[10px] tabular-nums text-[var(--text)]">{metricsData.dividendYield.toFixed(2)}%</span>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="font-mono text-[10px] text-[var(--text-muted)]">Price data unavailable</p>
      )}
    </div>
  )
}
