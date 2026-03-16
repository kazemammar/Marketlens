'use client'

import { useEffect, useRef } from 'react'
import { AssetType } from '@/lib/utils/types'

function toTvSymbol(type: AssetType, symbol: string): string {
  switch (type) {
    case 'crypto': {
      const map: Record<string, string> = {
        BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT', SOL: 'BINANCE:SOLUSDT',
        BNB: 'BINANCE:BNBUSDT', XRP: 'BINANCE:XRPUSDT', ADA: 'BINANCE:ADAUSDT',
        AVAX: 'BINANCE:AVAXUSDT', DOGE: 'BINANCE:DOGEUSDT', DOT: 'BINANCE:DOTUSDT',
        LINK: 'BINANCE:LINKUSDT', LTC: 'BINANCE:LTCUSDT', BCH: 'BINANCE:BCHUSDT',
        UNI: 'BINANCE:UNIUSDT', ATOM: 'BINANCE:ATOMUSDT', MATIC: 'BINANCE:MATICUSDT',
        TRX: 'BINANCE:TRXUSDT',
      }
      return map[symbol.toUpperCase()] ?? `BINANCE:${symbol.toUpperCase()}USDT`
    }
    case 'forex':     return `FX:${symbol.replace('/', '')}`
    case 'commodity': {
      const amex = ['GLD','SLV','USO','UNG','CPER','PPLT','WEAT','CORN','BNO','URA']
      return amex.includes(symbol.toUpperCase()) ? `AMEX:${symbol.toUpperCase()}` : symbol.toUpperCase()
    }
    default: return symbol.toUpperCase()
  }
}

interface TradingViewChartProps {
  symbol: string
  type:   AssetType
  theme?: 'dark' | 'light'
}

export default function TradingViewChart({ symbol, type, theme = 'dark' }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const tvSymbol     = toTvSymbol(type, symbol)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.innerHTML = ''

    const script = document.createElement('script')
    script.src   = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type  = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize:            true,
      symbol:              tvSymbol,
      interval:            'D',
      timezone:            'Etc/UTC',
      theme:               theme,
      style:               '1',
      locale:              'en',
      toolbar_bg:          theme === 'dark' ? '#111827' : '#ffffff',
      enable_publishing:   false,
      withdateranges:      true,
      range:               '3M',
      hide_side_toolbar:   false,
      allow_symbol_change: false,
      calendar:            false,
      studies:             ['Volume@tv-basicstudies', 'RSI@tv-basicstudies', 'MACD@tv-basicstudies'],
      support_host:        'https://www.tradingview.com',
    })
    container.appendChild(script)

    return () => { if (container) container.innerHTML = '' }
  }, [tvSymbol, theme])

  return (
    // No border/rounded corners — bleeds edge to edge
    <div className="w-full bg-[var(--surface)]">
      <div
        ref={containerRef}
        className="tradingview-widget-container h-[450px] w-full sm:h-[600px]"
      >
        <div className="tradingview-widget-container__widget h-full w-full" />
      </div>
    </div>
  )
}
