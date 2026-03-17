'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { QuoteRaw } from '@/lib/api/finnhub'
import { formatPrice, formatPercent } from '@/lib/utils/formatters'

const TICKER_SYMBOLS = [
  { symbol: 'SPY',             label: 'S&P 500',    currency: 'USD' },
  { symbol: 'DIA',             label: 'DOW',        currency: 'USD' },
  { symbol: 'QQQ',             label: 'NDX 100',    currency: 'USD' },
  { symbol: 'IWM',             label: 'RUT 2K',     currency: 'USD' },
  { symbol: 'BINANCE:BTCUSDT', label: 'BTC',        currency: 'USD' },
  { symbol: 'BINANCE:ETHUSDT', label: 'ETH',        currency: 'USD' },
  { symbol: 'BINANCE:SOLUSDT', label: 'SOL',        currency: 'USD' },
  { symbol: 'GC=F',            label: 'GOLD',       currency: 'USD' },
  { symbol: 'CL=F',            label: 'OIL',        currency: 'USD' },
]

const SYMBOL_LINK: Record<string, string> = {
  'SPY':             '/asset/etf/SPY',
  'DIA':             '/asset/etf/DIA',
  'QQQ':             '/asset/etf/QQQ',
  'IWM':             '/asset/etf/IWM',
  'BINANCE:BTCUSDT': '/asset/crypto/BTC',
  'BINANCE:ETHUSDT': '/asset/crypto/ETH',
  'BINANCE:SOLUSDT': '/asset/crypto/SOL',
  'GC=F':            '/asset/commodity/GC%3DF',
  'CL=F':            '/asset/commodity/CL%3DF',
}

const SYMBOL_LIST = TICKER_SYMBOLS.map((t) => t.symbol).join(',')

interface TickerQuotes { [symbol: string]: QuoteRaw }

function TickerItem({
  label, symbol, currency, quote, flash,
}: {
  label: string; symbol: string; currency: string
  quote: QuoteRaw | undefined; flash: 'up' | 'down' | null
}) {
  if (!quote) {
    return (
      <div className="flex items-center gap-2 px-5">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <div className="skeleton h-2 w-14 rounded" />
      </div>
    )
  }

  const isPositive = quote.change >= 0
  const chgColor   = isPositive ? 'var(--price-up)' : 'var(--price-down)'
  const flashCls   = flash === 'up' ? 'price-flash-up' : flash === 'down' ? 'price-flash-down' : ''

  const href = SYMBOL_LINK[symbol]
  const inner = (
    <div className="flex items-center gap-2 px-5 py-0.5 rounded transition-colors hover:bg-[var(--surface-2)]">
      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className={`inline-block font-mono text-[11px] font-bold tabular-nums text-[var(--text)] ${flashCls}`}>
        {formatPrice(quote.price, currency)}
      </span>
      <span className="font-mono text-[10px] font-semibold tabular-nums" style={{ color: chgColor }}>
        {formatPercent(quote.changePercent, false)}
      </span>
    </div>
  )

  if (href) {
    return <Link href={href} className="cursor-pointer">{inner}</Link>
  }
  return inner
}

function Dot() {
  return <span className="h-1 w-1 shrink-0 rounded-full" style={{ background: '#333333' }} aria-hidden />
}

export default function TickerTape({ initialData }: { initialData?: Record<string, QuoteRaw> }) {
  const [quotes,  setQuotes]  = useState<TickerQuotes>(initialData ?? {})
  const [flashes, setFlashes] = useState<Record<string, 'up' | 'down'>>({})
  const prevQuotes = useRef<Record<string, number>>({})

  useEffect(() => {
    if (initialData) {
      for (const [sym, q] of Object.entries(initialData)) prevQuotes.current[sym] = q.price
    }

    async function fetchQuotes() {
      try {
        const res  = await fetch(`/api/quotes?symbols=${SYMBOL_LIST}`)
        const data = await res.json() as TickerQuotes

        const newFlash: Record<string, 'up' | 'down'> = {}
        for (const [sym, q] of Object.entries(data)) {
          const prev = prevQuotes.current[sym]
          if (prev !== undefined && prev !== q.price) {
            newFlash[sym] = q.price > prev ? 'up' : 'down'
          }
          prevQuotes.current[sym] = q.price
        }
        if (Object.keys(newFlash).length > 0) {
          setFlashes(newFlash)
          setTimeout(() => setFlashes({}), 700)
        }

        setQuotes(data)
      } catch { /* silent */ }
    }

    const delay = initialData && Object.keys(initialData).length >= 6 ? 5_000 : 0
    const timer = setTimeout(fetchQuotes, delay)
    const id    = setInterval(fetchQuotes, 60_000)
    return () => { clearTimeout(timer); clearInterval(id) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const items = TICKER_SYMBOLS.flatMap((t, i) => [
    <TickerItem key={t.symbol} {...t} quote={quotes[t.symbol]} flash={flashes[t.symbol] ?? null} />,
    i < TICKER_SYMBOLS.length - 1 ? <Dot key={`dot-${i}`} /> : null,
  ]).filter(Boolean)

  return (
    <div
      className="relative overflow-hidden border-y border-[var(--border)]"
      style={{ background: 'var(--bg)', height: '32px' }}
      aria-label="Live market ticker"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[var(--bg)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[var(--bg)] to-transparent" />
      <div className="ticker-track h-full" aria-hidden>
        <div className="flex h-full items-center">{items}</div>
        <div className="flex h-full items-center" aria-hidden>{items}</div>
      </div>
    </div>
  )
}
