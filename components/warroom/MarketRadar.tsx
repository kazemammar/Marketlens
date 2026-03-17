'use client'

import { useEffect, useState } from 'react'
import type { MarketRadarPayload, SignalVerdict } from '@/lib/api/homepage'
import type { AssetCardData } from '@/lib/utils/types'
import { useFetch } from '@/lib/hooks/useFetch'

const VERDICT_STYLE: Record<SignalVerdict, { bg: string; text: string; border: string; glow: string; label: string }> = {
  BUY:   { bg: 'var(--accent-dim)',   text: 'var(--price-up)',   border: 'var(--accent-glow)',  glow: 'var(--accent-glow)',  label: 'BUY'   },
  CASH:  { bg: 'var(--danger-dim)',   text: 'var(--price-down)', border: 'var(--danger-dim)',   glow: 'var(--danger-dim)',   label: 'CASH'  },
  MIXED: { bg: 'var(--warning-dim)',  text: 'var(--warning)',    border: 'var(--warning-dim)',  glow: 'var(--warning-dim)',  label: 'MIXED' },
}

const SIG_COLOR: Record<SignalVerdict, string> = {
  BUY:   'var(--price-up)',
  CASH:  'var(--price-down)',
  MIXED: 'var(--warning)',
}

// Approximate relative market caps (weights) for DEFAULT_STOCKS.
// Used to size treemap cells proportionally. Refreshed periodically but
// exact accuracy is not critical — visual proportionality is the goal.
const MCAP_WEIGHT: Record<string, number> = {
  AAPL: 350, MSFT: 320, NVDA: 295, GOOGL: 220, AMZN: 215,
  META: 145,  TSLA: 105, 'BRK.B': 92,  JPM: 65,   V:    60,
  UNH:  52,   XOM:  50,  JNJ:  40,   MA:   44,  PG:   38,
}

// Build strip-treemap rows from stocks sorted by weight.
// Returns rows of {symbol, pct, flex} where flex is the item's proportional width inside its row.
function buildTreemapRows(stocks: AssetCardData[]): Array<Array<{ symbol: string; pct: number; flex: number }>> {
  const sorted = [...stocks]
    .sort((a, b) => (MCAP_WEIGHT[b.symbol] ?? 10) - (MCAP_WEIGHT[a.symbol] ?? 10))
    .slice(0, 15)

  if (sorted.length === 0) return []

  // Divide into 3 rows with target row heights: 35%, 35%, 30% (by combined weight)
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
  const abs   = Math.min(Math.abs(pct), 3)
  const ratio = abs / 3
  const isPos = pct >= 0
  const bgOpacity = 0.1 + ratio * 0.35
  const bg        = isPos
    ? `rgba(var(--price-up-rgb),${bgOpacity})`
    : `rgba(var(--price-down-rgb),${bgOpacity})`
  const chgColor = isPos ? 'var(--price-up)' : 'var(--price-down)'
  const sym = symbol.length <= 4 ? symbol : symbol.slice(0, 4)
  return (
    <div
      title={`${symbol}: ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`}
      className="flex flex-col items-center justify-center overflow-hidden"
      style={{ background: bg, height: `${height}px`, border: '1px solid var(--border)' }}
    >
      <span className="font-mono font-bold text-[var(--text)] leading-none" style={{ fontSize: height > 30 ? '9px' : '7px' }}>{sym}</span>
      <span className="font-mono tabular-nums leading-none mt-0.5" style={{ fontSize: height > 30 ? '8px' : '6px', color: chgColor }}>
        {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
      </span>
    </div>
  )
}

export default function MarketRadar({
  initialData = null,
  stocks = [],
}: {
  initialData?: MarketRadarPayload | null
  stocks?: AssetCardData[]
}) {
  const { data: refreshed, loading: fetchLoading } = useFetch<MarketRadarPayload>('/api/market-radar', { refreshInterval: 5 * 60_000 })
  const data    = refreshed ?? initialData
  const loading = data === null && fetchLoading
  const [timeStr, setTimeStr] = useState('')

  useEffect(() => {
    if (data?.updatedAt) {
      setTimeStr(new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
  }, [data?.updatedAt])

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-3 py-2">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" style={{ color: 'var(--accent)' }} aria-hidden>
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1"/>
          <circle cx="8" cy="8" r="1" fill="currentColor"/>
        </svg>
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Market Radar
        </span>
      </div>

      <div className="flex-1 px-3 py-2.5">
        {loading ? (
          <div className="space-y-2">
            <div className="skeleton h-14 w-full rounded-lg" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="skeleton h-2 w-2 rounded-full" />
                <div className="skeleton h-2.5 flex-1 rounded" />
                <div className="skeleton h-2.5 w-10 rounded" />
              </div>
            ))}
          </div>
        ) : data ? (
          <>
            {/* Verdict */}
            {(() => {
              const s = VERDICT_STYLE[data.verdict]
              return (
                <div
                  className={`mb-3 flex items-center justify-between rounded-lg px-3 py-2.5 ${data.verdict !== 'MIXED' ? 'animate-verdict-pulse' : ''}`}
                  style={{ background: s.bg, border: `1px solid ${s.border}`, ['--verdict-glow' as string]: s.glow }}
                >
                  <div>
                    <p className="font-mono text-[8px] uppercase tracking-[0.16em]" style={{ color: s.text, opacity: 0.65 }}>Overall Verdict</p>
                    <p className="font-mono text-[28px] font-bold leading-none tracking-tight" style={{ color: s.text, textShadow: `0 0 24px ${s.glow}` }}>
                      {s.label}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-[11px] font-semibold" style={{ color: s.text }}>{data.score}%</span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--surface-3)]">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${data.score}%`, background: `linear-gradient(90deg, ${s.border}, ${s.text})` }} />
                    </div>
                    <span className="font-mono text-[8px]" style={{ color: s.text, opacity: 0.55 }}>bull score</span>
                  </div>
                </div>
              )
            })()}

            {/* Signals */}
            <div className="space-y-1 stagger">
              {data.signals.map((sig, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5 animate-fade-up">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: SIG_COLOR[sig.verdict], boxShadow: `0 0 5px ${SIG_COLOR[sig.verdict]}60` }} />
                  <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[var(--text-muted)]">{sig.name}</span>
                  <span className="font-mono text-[10px] tabular-nums font-semibold" style={{ color: SIG_COLOR[sig.verdict] }}>{sig.value}</span>
                  <span className="font-mono text-[8px] font-bold uppercase" style={{ color: SIG_COLOR[sig.verdict] }}>{sig.verdict}</span>
                </div>
              ))}
            </div>

            <p className="mt-2 font-mono text-[8px] text-[var(--text-muted)] opacity-40">
              Updated {timeStr || '--:--'}
            </p>
          </>
        ) : (
          <p className="py-4 text-center font-mono text-[10px] text-[var(--text-muted)]">Unavailable</p>
        )}
      </div>

      {/* Treemap heatmap — sized by market cap */}
      {stocks.length > 0 && (() => {
        const rows = buildTreemapRows(stocks)
        const ROW_HEIGHTS = [42, 38, 32] // px per row — taller = higher market cap row
        return (
          <div className="border-t border-[var(--border)] px-3 py-2">
            <p className="mb-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] opacity-60">
              Heatmap · S&amp;P 500
            </p>
            <div className="flex flex-col gap-px overflow-hidden rounded-sm">
              {rows.map((row, ri) => (
                <div key={ri} className="flex gap-px">
                  {row.map(({ symbol, pct, flex }) => (
                    <div key={symbol} style={{ flex: `${flex} 0 0` }}>
                      <HeatCell symbol={symbol} pct={pct} height={ROW_HEIGHTS[ri] ?? 32} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
