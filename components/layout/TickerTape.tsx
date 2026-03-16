'use client'

import { useEffect, useState } from 'react'
import { QuoteRaw } from '@/lib/api/finnhub'
import { formatPrice, formatChange, formatPercent } from '@/lib/utils/formatters'

// Symbols to show in the ticker, and their display labels.
// Only Finnhub free-tier symbols: US stocks/ETFs + Binance crypto.
// (OANDA forex and commodity futures require a premium plan.)
const TICKER_SYMBOLS = [
  { symbol: 'SPY',             label: 'S&P 500',    currency: 'USD' },
  { symbol: 'DIA',             label: 'Dow Jones',  currency: 'USD' },
  { symbol: 'QQQ',             label: 'Nasdaq 100', currency: 'USD' },
  { symbol: 'IWM',             label: 'Russell 2K', currency: 'USD' },
  { symbol: 'BINANCE:BTCUSDT', label: 'Bitcoin',    currency: 'USD' },
  { symbol: 'BINANCE:ETHUSDT', label: 'Ethereum',   currency: 'USD' },
  { symbol: 'BINANCE:SOLUSDT', label: 'Solana',     currency: 'USD' },
  { symbol: 'GLD',             label: 'Gold ETF',   currency: 'USD' },
  { symbol: 'USO',             label: 'Oil ETF',    currency: 'USD' },
]

const SYMBOL_LIST = TICKER_SYMBOLS.map((t) => t.symbol).join(',')

interface TickerQuotes {
  [symbol: string]: QuoteRaw
}

function TickerItem({
  label,
  symbol,
  currency,
  quote,
}: {
  label:    string
  symbol:   string
  currency: string
  quote:    QuoteRaw | undefined
}) {
  if (!quote) {
    return (
      <div className="flex items-center gap-3 px-6 py-2">
        <span className="text-xs font-medium text-[var(--text-muted)]">{label}</span>
        <span className="h-3 w-16 animate-pulse rounded bg-[var(--surface-2)]" />
      </div>
    )
  }

  const isPositive = quote.change >= 0
  const color      = isPositive ? 'text-green-500' : 'text-red-500'

  return (
    <div className="flex items-center gap-3 px-6">
      <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm font-mono font-medium text-[var(--text)]">
        {formatPrice(quote.price, currency)}
      </span>
      <span className={`text-xs font-mono font-medium ${color}`}>
        {formatChange(quote.change)}&nbsp;({formatPercent(quote.changePercent, false)})
      </span>
    </div>
  )
}

function Divider() {
  return <span className="text-[var(--border)] select-none">|</span>
}

export default function TickerTape() {
  const [quotes, setQuotes] = useState<TickerQuotes>({})

  useEffect(() => {
    async function fetchQuotes() {
      try {
        const res  = await fetch(`/api/quotes?symbols=${SYMBOL_LIST}`)
        const data = await res.json() as TickerQuotes
        setQuotes(data)
      } catch {
        // silently fail — tape shows loading state
      }
    }

    fetchQuotes()
    const id = setInterval(fetchQuotes, 60_000) // refresh every 60 s
    return () => clearInterval(id)
  }, [])

  const items = TICKER_SYMBOLS.flatMap((t, i) => [
    <TickerItem key={t.symbol} {...t} quote={quotes[t.symbol]} />,
    i < TICKER_SYMBOLS.length - 1 ? <Divider key={`div-${i}`} /> : null,
  ]).filter(Boolean)

  return (
    <div
      className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--surface)] py-2"
      aria-label="Live market ticker"
    >
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[var(--surface)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[var(--surface)] to-transparent" />

      {/* Scrolling track — duplicated for seamless loop */}
      <div className="ticker-track" aria-hidden>
        <div className="flex items-center">{items}</div>
        <div className="flex items-center" aria-hidden>{items}</div>
      </div>
    </div>
  )
}
