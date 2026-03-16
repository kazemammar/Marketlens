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

    // Full teardown before mounting — prevents duplicate widgets on re-render
    container.innerHTML = ''

    const script = document.createElement('script')
    script.src   = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type  = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize:            false,
      symbol:              tvSymbol,
      interval:            'D',
      timezone:            'exchange',
      theme:               theme,
      style:               '1',
      locale:              'en',
      width:               '100%',
      height:              550,
      enable_publishing:   false,
      allow_symbol_change: true,
      save_image:          true,
      withdateranges:      true,
      hide_side_toolbar:   false,
      calendar:            false,
      hide_volume:         false,
      support_host:        'https://www.tradingview.com',
    })
    container.appendChild(script)

    return () => { container.innerHTML = '' }
  }, [tvSymbol, theme])

  return <div ref={containerRef} className="tradingview-widget-container w-full" />
}
