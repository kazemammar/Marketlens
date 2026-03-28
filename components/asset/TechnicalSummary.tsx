'use client'

import { formatPrice } from '@/lib/utils/formatters'
import { useFetch } from '@/lib/hooks/useFetch'

// ─── Twelve Data indicator types ─────────────────────────────────────────────

interface TwelveDataIndicators {
  rsi: number | null
  macd: { macd: number; signal: number; histogram: number } | null
  bbands: { upper: number; middle: number; lower: number } | null
  atr: number | null
  stochastic: { k: number; d: number } | null
  ema20: number | null
  ema50: number | null
  sma200: number | null
}

function hasAnyIndicator(d: TwelveDataIndicators): boolean {
  return d.rsi !== null || d.macd !== null || d.bbands !== null || d.atr !== null || d.stochastic !== null
}

function rsiColor(rsi: number): string {
  if (rsi < 30) return 'var(--price-up)'     // oversold = bullish
  if (rsi > 70) return 'var(--price-down)'    // overbought = bearish
  return 'var(--warning)'                      // neutral
}

function rsiLabel(rsi: number): string {
  if (rsi < 30) return 'OVERSOLD'
  if (rsi > 70) return 'OVERBOUGHT'
  return 'NEUTRAL'
}

function TwelveDataSection({ symbol }: { symbol: string }) {
  const { data, loading } = useFetch<TwelveDataIndicators>(
    `/api/stock/indicators/${symbol}`,
    { refreshInterval: 10 * 60_000 },
  )

  if (loading) {
    return (
      <div className="border-t border-[var(--border)] px-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <div className="skeleton h-2.5 w-32 rounded" />
          <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        </div>
        <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between bg-[var(--surface)] px-3 py-2">
              <div className="skeleton h-2 w-16 rounded" />
              <div className="skeleton h-2.5 w-12 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data || !hasAnyIndicator(data)) return null

  return (
    <div className="border-t border-[var(--border)]">
      {/* Subheader */}
      <div className="flex items-center gap-2 px-4 py-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Real-Time Indicators
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
      </div>

      {/* RSI bar */}
      {data.rsi !== null && (
        <div className="px-4 pb-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[9px] text-[var(--text-muted)]">RSI (14)</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] font-semibold tabular-nums" style={{ color: rsiColor(data.rsi) }}>
                {data.rsi.toFixed(1)}
              </span>
              <span className="font-mono text-[8px] font-bold" style={{ color: rsiColor(data.rsi) }}>
                {rsiLabel(data.rsi)}
              </span>
            </div>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
            {/* Zones: 0-30 green, 30-70 amber, 70-100 red */}
            <div className="absolute top-0 left-0 h-full w-[30%] opacity-10" style={{ background: 'var(--price-up)' }} />
            <div className="absolute top-0 left-[30%] h-full w-[40%] opacity-10" style={{ background: '#f59e0b' }} />
            <div className="absolute top-0 left-[70%] h-full w-[30%] opacity-10" style={{ background: 'var(--price-down)' }} />
            {/* RSI marker */}
            <div
              className="absolute top-1/2 h-2.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: `${Math.min(Math.max(data.rsi, 0), 100)}%`, background: rsiColor(data.rsi) }}
            />
          </div>
          <div className="mt-0.5 flex justify-between font-mono text-[9px] text-[var(--text-muted)] opacity-50">
            <span>0</span>
            <span>30</span>
            <span>70</span>
            <span>100</span>
          </div>
        </div>
      )}

      {/* Indicator grid */}
      <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-3">
        {/* MACD */}
        {data.macd && (
          <>
            <div className="flex items-center justify-between gap-2 bg-[var(--surface)] px-3 py-2 hover:bg-[var(--surface-2)]">
              <span className="font-mono text-[9px] text-[var(--text-muted)]">MACD Line</span>
              <span className="font-mono text-[10px] font-semibold tabular-nums" style={{ color: data.macd.macd >= 0 ? 'var(--price-up)' : 'var(--price-down)' }}>
                {data.macd.macd.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 bg-[var(--surface)] px-3 py-2 hover:bg-[var(--surface-2)]">
              <span className="font-mono text-[9px] text-[var(--text-muted)]">Signal</span>
              <span className="font-mono text-[10px] font-semibold tabular-nums" style={{ color: data.macd.signal >= 0 ? 'var(--price-up)' : 'var(--price-down)' }}>
                {data.macd.signal.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 bg-[var(--surface)] px-3 py-2 hover:bg-[var(--surface-2)]">
              <span className="font-mono text-[9px] text-[var(--text-muted)]">Histogram</span>
              <span className="font-mono text-[10px] font-semibold tabular-nums" style={{ color: data.macd.histogram >= 0 ? 'var(--price-up)' : 'var(--price-down)' }}>
                {data.macd.histogram >= 0 ? '+' : ''}{data.macd.histogram.toFixed(2)}
              </span>
            </div>
          </>
        )}

        {/* Bollinger Bands */}
        {data.bbands && (
          <>
            <div className="flex items-center justify-between gap-2 bg-[var(--surface)] px-3 py-2 hover:bg-[var(--surface-2)]">
              <span className="font-mono text-[9px] text-[var(--text-muted)]">BB Upper</span>
              <span className="font-mono text-[10px] font-semibold tabular-nums text-[var(--text)]">
                {formatPrice(data.bbands.upper)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 bg-[var(--surface)] px-3 py-2 hover:bg-[var(--surface-2)]">
              <span className="font-mono text-[9px] text-[var(--text-muted)]">BB Middle</span>
              <span className="font-mono text-[10px] font-semibold tabular-nums text-[var(--text)]">
                {formatPrice(data.bbands.middle)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 bg-[var(--surface)] px-3 py-2 hover:bg-[var(--surface-2)]">
              <span className="font-mono text-[9px] text-[var(--text-muted)]">BB Lower</span>
              <span className="font-mono text-[10px] font-semibold tabular-nums text-[var(--text)]">
                {formatPrice(data.bbands.lower)}
              </span>
            </div>
          </>
        )}

        {/* ATR */}
        {data.atr !== null && (
          <div className="flex items-center justify-between gap-2 bg-[var(--surface)] px-3 py-2 hover:bg-[var(--surface-2)]">
            <span className="font-mono text-[9px] text-[var(--text-muted)]">ATR (14)</span>
            <span className="font-mono text-[10px] font-semibold tabular-nums text-[var(--text)]">
              {data.atr.toFixed(2)}
            </span>
          </div>
        )}

        {/* Stochastic */}
        {data.stochastic && (
          <>
            <div className="flex items-center justify-between gap-2 bg-[var(--surface)] px-3 py-2 hover:bg-[var(--surface-2)]">
              <span className="font-mono text-[9px] text-[var(--text-muted)]">Stoch %K</span>
              <span
                className="font-mono text-[10px] font-semibold tabular-nums"
                style={{ color: data.stochastic.k < 20 ? 'var(--price-up)' : data.stochastic.k > 80 ? 'var(--price-down)' : 'var(--text)' }}
              >
                {data.stochastic.k.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 bg-[var(--surface)] px-3 py-2 hover:bg-[var(--surface-2)]">
              <span className="font-mono text-[9px] text-[var(--text-muted)]">Stoch %D</span>
              <span
                className="font-mono text-[10px] font-semibold tabular-nums"
                style={{ color: data.stochastic.d < 20 ? 'var(--price-up)' : data.stochastic.d > 80 ? 'var(--price-down)' : 'var(--text)' }}
              >
                {data.stochastic.d.toFixed(1)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main component types ────────────────────────────────────────────────────

interface TechSignal {
  name:   string
  value:  string
  signal: 'bullish' | 'bearish' | 'neutral'
}

interface PriceContext {
  price:        number
  week52High:   number | null
  week52Low:    number | null
  targetHigh:   number | null
  targetLow:    number | null
  targetMedian: number | null
}

interface AggregateCounts {
  buy:     number
  neutral: number
  sell:    number
}

interface TechData {
  signals:         TechSignal[]
  priceContext:    PriceContext | null
  overallSignal:   'bullish' | 'bearish' | 'neutral'
  bullCount:       number
  bearCount:       number
  neutralCount:    number
  aggregateCounts: AggregateCounts | null
}

const SIGNAL_COLOR = {
  bullish: 'var(--price-up)',
  bearish: 'var(--price-down)',
  neutral: '#f59e0b',
} as const

const OVERALL_LABEL = {
  bullish: 'BULLISH',
  bearish: 'BEARISH',
  neutral: 'NEUTRAL',
} as const

export default function TechnicalSummary({ symbol }: { symbol: string }) {
  const { data, loading } = useFetch<TechData>(`/api/stock/technicals/${symbol}`, { refreshInterval: 2 * 60_000 })

  const sig      = data?.overallSignal ?? 'neutral'
  const sigColor = SIGNAL_COLOR[sig]
  const total    = (data?.bullCount ?? 0) + (data?.bearCount ?? 0) + (data?.neutralCount ?? 0)
  const bullPct  = total > 0 ? ((data?.bullCount ?? 0) / total) * 100 : 0
  const bearPct  = total > 0 ? ((data?.bearCount ?? 0) / total) * 100 : 0

  const pc   = data?.priceContext
  const hasRange = pc?.week52High && pc?.week52Low
  const rangePct = hasRange && pc
    ? Math.min(Math.max(((pc.price - pc.week52Low!) / (pc.week52High! - pc.week52Low!)) * 100, 0), 100)
    : null
  const targetPct = hasRange && pc?.targetMedian
    ? Math.min(Math.max(((pc.targetMedian - pc.week52Low!) / (pc.week52High! - pc.week52Low!)) * 100, 0), 100)
    : null

  return (
    <div className="overflow-hidden rounded border border-[var(--border)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 mb-2.5">
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3 shrink-0" style={{ color: 'var(--accent)' }} aria-hidden>
          <polyline points="1,12 4,8 7,10 10,5 13,3 15,3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          Technical &amp; Fundamental Analysis
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-[var(--border)] to-transparent" />
        {data?.aggregateCounts && (
          <div className="flex items-center gap-1.5 font-mono text-[9px]">
            <span style={{ color: 'var(--price-up)' }}>{data.aggregateCounts.buy} BUY</span>
            <span className="text-[var(--text-muted)] opacity-40">|</span>
            <span className="text-[var(--text-muted)]">{data.aggregateCounts.neutral} NEUTRAL</span>
            <span className="text-[var(--text-muted)] opacity-40">|</span>
            <span style={{ color: 'var(--price-down)' }}>{data.aggregateCounts.sell} SELL</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-[var(--surface)] px-4 py-4">
          <div className="mb-3 flex items-center gap-4">
            <div className="skeleton h-9 w-28 rounded" />
            <div className="space-y-1.5">
              <div className="skeleton h-2.5 w-36 rounded" />
              <div className="skeleton h-2 w-24 rounded" />
            </div>
          </div>
          <div className="skeleton mb-4 h-2 w-full rounded-full" />
          <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between bg-[var(--surface)] px-3 py-2">
                <div className="skeleton h-2 w-20 rounded" />
                <div className="skeleton h-2.5 w-12 rounded" />
              </div>
            ))}
          </div>
        </div>
      ) : !data || data.signals.length === 0 ? (
        <p className="bg-[var(--surface)] px-4 py-6 font-mono text-[10px] text-[var(--text-muted)]">
          Fundamental data unavailable for this symbol
        </p>
      ) : (
        <div className="bg-[var(--surface)]">
          {/* Overall signal + count bar */}
          <div className="px-4 pt-3 pb-2">
            <div className="mb-2 flex items-center gap-4">
              <span
                className="font-mono text-[28px] font-bold leading-none tabular-nums"
                style={{ color: sigColor, textShadow: `0 0 20px ${sigColor}40` }}
              >
                {OVERALL_LABEL[sig]}
              </span>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2 font-mono text-[9px]">
                  <span style={{ color: 'var(--price-up)' }}>{data.bullCount} Bullish</span>
                  <span className="text-[var(--text-muted)] opacity-40">·</span>
                  <span style={{ color: 'var(--price-down)' }}>{data.bearCount} Bearish</span>
                  <span className="text-[var(--text-muted)] opacity-40">·</span>
                  <span className="text-[var(--text-muted)]">{data.neutralCount} Neutral</span>
                </div>
                <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-40">
                  based on {total} signals
                </span>
              </div>
            </div>

            {/* Bull/bear bar */}
            <div className="flex h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${bullPct}%`, background: 'var(--price-up)' }}
              />
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${100 - bullPct - bearPct}%`, background: 'var(--warning)' }}
              />
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${bearPct}%`, background: 'var(--price-down)' }}
              />
            </div>
          </div>

          {/* Signal cards grid */}
          <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-3 lg:grid-cols-4">
            {data.signals.map((sig, i) => (
              <div key={i} className="flex items-center justify-between gap-2 bg-[var(--surface)] px-3 py-2 hover:bg-[var(--surface-2)]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: SIGNAL_COLOR[sig.signal] }}
                  />
                  <span className="truncate font-mono text-[9px] text-[var(--text-muted)]">{sig.name}</span>
                </div>
                <span
                  className="shrink-0 font-mono text-[10px] font-semibold tabular-nums"
                  style={{ color: SIGNAL_COLOR[sig.signal] }}
                >
                  {sig.value}
                </span>
              </div>
            ))}
          </div>

          {/* 52W range bar with price + target markers */}
          {hasRange && pc && (
            <div className="border-t border-[var(--border)] px-4 py-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  52-Week Range
                </span>
                {pc.targetMedian && (
                  <span className="font-mono text-[8px] text-[var(--text-muted)]">
                    Target: <span className="text-[var(--text)]">{formatPrice(pc.targetMedian)}</span>
                  </span>
                )}
              </div>

              <div className="relative h-2 overflow-visible rounded-full bg-[var(--surface-3)]">
                {/* Fill up to current price */}
                {rangePct !== null && (
                  <div
                    className="absolute top-0 left-0 h-full rounded-full opacity-20"
                    style={{ width: `${rangePct}%`, background: SIGNAL_COLOR[sig] }}
                  />
                )}
                {/* Current price marker */}
                {rangePct !== null && (
                  <div
                    className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ left: `${rangePct}%`, background: SIGNAL_COLOR[sig] }}
                    title={`Current: ${formatPrice(pc.price)}`}
                  />
                )}
                {/* Analyst target marker */}
                {targetPct !== null && (
                  <div
                    className="absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70"
                    style={{ left: `${targetPct}%`, background: 'var(--warning)' }}
                    title={`Target: ${formatPrice(pc.targetMedian!)}`}
                  />
                )}
              </div>

              <div className="mt-1 flex justify-between font-mono text-[8px] text-[var(--text-muted)]">
                <span>{formatPrice(pc.week52Low!)}</span>
                <span>52W LOW → HIGH</span>
                <span>{formatPrice(pc.week52High!)}</span>
              </div>
            </div>
          )}

          {/* Twelve Data Real-Time Indicators */}
          <TwelveDataSection symbol={symbol} />
        </div>
      )}
    </div>
  )
}
