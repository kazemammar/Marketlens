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
      // TVC:* symbols work on the free TradingView widget; exchange-specific
      // futures (NYMEX:CL1!) require a paid plan and show "symbol unavailable"
      const tvMap: Record<string, string> = {
        'CL=F': 'TVC:USOIL',          // WTI Crude Oil
        'BZ=F': 'TVC:UKOIL',          // Brent Crude
        'GC=F': 'TVC:GOLD',           // Gold
        'SI=F': 'TVC:SILVER',         // Silver
        'NG=F': 'PEPPERSTONE:NATGAS', // Natural Gas
        'HG=F': 'TVC:COPPER',         // Copper
        'ZW=F': 'CBOT:ZW1!',          // Wheat
        'ZC=F': 'CBOT:ZC1!',          // Corn
        'ZS=F': 'CBOT:ZS1!',          // Soybeans
        'PL=F': 'TVC:PLATINUM',       // Platinum
      }
      const up = symbol.toUpperCase()
      if (tvMap[up]) return tvMap[up]
      // Legacy ETF-proxy commodities
      const amex = ['GLD','SLV','USO','UNG','CPER','PPLT','WEAT','CORN','BNO','URA']
      return amex.includes(up) ? `AMEX:${up}` : up
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

  return (
    <div>
      <div ref={containerRef} className="tradingview-widget-container w-full" />
      <div className="flex items-center justify-end border-t border-[var(--border)] px-2 py-1">
        <span className="font-mono text-[8px] text-[var(--text-muted)] opacity-40">
          Chart powered by TradingView · prices may differ from header
        </span>
      </div>
    </div>
  )
}
