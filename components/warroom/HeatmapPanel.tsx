'use client'

import type { AssetCardData } from '@/lib/utils/types'

const MCAP_WEIGHT: Record<string, number> = {
  AAPL: 350, MSFT: 320, NVDA: 295, GOOGL: 220, AMZN: 215,
  META: 145,  TSLA: 105, 'BRK.B': 92,  JPM: 65,   V:    60,
  UNH:  52,   XOM:  50,  JNJ:  40,   MA:   44,  PG:   38,
}

function buildTreemapRows(stocks: AssetCardData[]): Array<Array<{ symbol: string; pct: number; flex: number }>> {
  const sorted = [...stocks]
    .sort((a, b) => (MCAP_WEIGHT[b.symbol] ?? 10) - (MCAP_WEIGHT[a.symbol] ?? 10))
    .slice(0, 15)

  if (sorted.length === 0) return []

  const totalWeight = sorted.reduce((s, x) => s + (MCAP_WEIGHT[x.symbol] ?? 10), 0)
  const rows: Array<typeof sorted> = [[], [], []]
  const rowTargets = [0.35, 0.35, 0.30].map(r => r * totalWeight)
  let ri = 0
  let rowAcc = 0
  for (const stock of sorted) {
    const w = MCAP_WEIGHT[stock.symbol] ?? 10
    rows[ri].push(stock)
    rowAcc += w
    if (ri < 2 && rowAcc >= rowTargets[ri]) { ri++; rowAcc = 0 }
  }

  return rows.filter(r => r.length > 0).map(row => {
    const rowTotal = row.reduce((s, x) => s + (MCAP_WEIGHT[x.symbol] ?? 10), 0)
    return row.map(stock => ({
      symbol: stock.symbol,
      pct:    stock.changePercent,
      flex:   ((MCAP_WEIGHT[stock.symbol] ?? 10) / rowTotal) * 100,
    }))
  })
}

function HeatCell({ symbol, pct, height }: { symbol: string; pct: number; height: number }) {
  const abs   = Math.abs(pct)
  const isPos = pct >= 0

  let bg: string
  if (isPos) {
    if (abs >= 2)      bg = 'rgba(var(--price-up-rgb), 0.90)'
    else if (abs >= 1) bg = 'rgba(var(--price-up-rgb), 0.55)'
    else               bg = 'rgba(var(--price-up-rgb), 0.22)'
  } else if (pct === 0) {
    bg = 'var(--surface-2)'
  } else {
    if (abs >= 2)      bg = 'rgba(var(--price-down-rgb), 0.90)'
    else if (abs >= 1) bg = 'rgba(var(--price-down-rgb), 0.55)'
    else               bg = 'rgba(var(--price-down-rgb), 0.22)'
  }

  const chgColor = isPos ? 'var(--price-up)' : pct < 0 ? 'var(--price-down)' : 'var(--text-muted)'
  const sym = symbol.length <= 4 ? symbol : symbol.slice(0, 4)
  return (
    <a
      href={`/asset/stock/${symbol}`}
      title={`${symbol}: ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`}
      className="flex flex-col items-center justify-center overflow-hidden transition-opacity hover:opacity-80"
      style={{ background: bg, height: `${height}px`, border: '1px solid var(--border)' }}
    >
      <span
        className="font-mono font-bold leading-none"
        style={{ fontSize: height > 50 ? '10px' : '8px', color: abs >= 2 ? '#ffffff' : 'var(--text)' }}
      >
        {sym}
      </span>
      <span
        className="font-mono tabular-nums leading-none mt-0.5"
        style={{ fontSize: height > 50 ? '9px' : '7px', color: abs >= 2 ? '#ffffffcc' : chgColor }}
      >
        {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
      </span>
    </a>
  )
}

export default function HeatmapPanel({ stocks = [] }: { stocks?: AssetCardData[] }) {
  const rows = buildTreemapRows(stocks)
  const ROW_HEIGHTS = [64, 56, 48]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <rect x="1" y="1" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="9" y="1" width="6" height="3.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="9" y="6.5" width="6" height="8.5" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
          <rect x="1" y="9" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
        </svg>
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          S&amp;P 500 Heatmap
        </span>
      </div>

      {/* Treemap */}
      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="font-mono text-[10px] text-[var(--text-muted)] opacity-50">No data</p>
        </div>
      ) : (
        <div className="flex-1 px-3 py-3 flex flex-col gap-px overflow-hidden">
          {rows.map((row, ri) => (
            <div key={ri} className="flex gap-px">
              {row.map(({ symbol, pct, flex }) => (
                <div key={symbol} style={{ flex: `${flex} 0 0` }}>
                  <HeatCell symbol={symbol} pct={pct} height={ROW_HEIGHTS[ri] ?? 48} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
